import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, IsNull } from 'typeorm';
import { Shelf } from './entities/shelf.entity';
import { ShelfStock } from './entities/shelf-stock.entity';
import { ShelfConsumableStock } from './entities/shelf-consumable-stock.entity';
import { ShelfStockMovement, MovementType, MovementDirection } from './entities/shelf-stock-movement.entity';
import { CreateShelfDto } from './dto/create-shelf.dto';
import { UpdateShelfDto } from './dto/update-shelf.dto';
import { ShelfType, SHELF_TYPE_RULES } from './enums/shelf-type.enum';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import * as XLSX from 'xlsx';

@Injectable()
export class ShelvesService {
    private readonly logger = new Logger(ShelvesService.name);

    constructor(
        @InjectRepository(Shelf)
        private readonly shelfRepository: TreeRepository<Shelf>,
        @InjectRepository(ShelfStock)
        private readonly shelfStockRepository: Repository<ShelfStock>,
        @InjectRepository(ShelfConsumableStock)
        private readonly shelfConsumableStockRepository: Repository<ShelfConsumableStock>,
        @InjectRepository(ProductStore)
        private readonly productStoreRepository: Repository<ProductStore>,
        @InjectRepository(ShelfStockMovement)
        private readonly movementRepository: Repository<ShelfStockMovement>,
    ) { }

    async create(dto: CreateShelfDto): Promise<Shelf> {
        // Apply type rules if type is provided
        let isSellable = dto.isSellable;
        let isShelvable = dto.isShelvable;

        if (dto.type) {
            const rules = SHELF_TYPE_RULES[dto.type];
            if (isSellable === undefined) isSellable = rules.isSellable;
            // isShelvable defaults to true unless explicitly set
        }

        // Build path and get parent entity for tree structure
        let path = `/${dto.name.toLowerCase().replace(/\s+/g, '-')}`;
        let parent: Shelf | null = null;
        // Barcode is always auto-generated from hierarchy (e.g. "A1 > B2 > C3")
        let barcode = dto.name;

        if (dto.parentId) {
            parent = await this.shelfRepository.findOne({ where: { id: dto.parentId } });
            if (parent) {
                path = `${parent.path}${path}`;
                // Build barcode from parent barcode + current name
                barcode = `${parent.barcode} > ${dto.name}`;
            }
        }

        // Create shelf entity with explicit parent assignment for MaterializedPath tree
        const shelfData: Partial<Shelf> = {
            name: dto.name,
            barcode,
            type: dto.type,
            warehouseId: dto.warehouseId,
            path,
            globalSlot: dto.globalSlot ?? null,
            rafId: dto.rafId ?? null,
            isSellable: isSellable ?? true,
            isPickable: dto.isPickable ?? true,
            isShelvable: isShelvable ?? true,
            // Explicitly set parent to null for root shelves - required by TypeORM MaterializedPath
            parent: parent,
            parentId: parent ? dto.parentId : null,
        };

        if (dto.globalSlot) {
            const existing = await this.shelfRepository.findOne({ where: { globalSlot: dto.globalSlot } });
            if (existing) {
                throw new BadRequestException(`Global slot ${dto.globalSlot} is already in use by shelf: ${existing.name}`);
            }
        }

        if (dto.rafId) {
            const existing = await this.shelfRepository.findOne({ where: { rafId: dto.rafId } });
            if (existing) {
                throw new BadRequestException(`Raf ID ${dto.rafId} is already in use by shelf: ${existing.name}`);
            }
        }

        const shelf = this.shelfRepository.create(shelfData as Shelf);

        return this.shelfRepository.save(shelf);
    }

    async findAll(warehouseId?: string, type?: string): Promise<Shelf[]> {
        const where: any = {};
        if (warehouseId) {
            where.warehouseId = warehouseId;
        }
        if (type) {
            where.type = type;
        }

        return this.shelfRepository.find({
            where,
            relations: ['warehouse', 'parent', 'stocks'],
            order: { sortOrder: 'ASC', name: 'ASC' },
        });
    }

    async findTree(warehouseId: string): Promise<Shelf[]> {
        // Get root shelves for warehouse
        const roots = await this.shelfRepository.find({
            where: { warehouseId, parentId: IsNull() },
            order: { sortOrder: 'ASC', name: 'ASC' },
        });

        // Build tree for each root
        const trees = await Promise.all(
            roots.map(root => this.shelfRepository.findDescendantsTree(root))
        );

        // Natural sort comparator (A1, A2, A10 instead of A1, A10, A2)
        const naturalSort = (a: Shelf, b: Shelf): number => {
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        };

        // Sort children recursively
        const sortTree = (shelves: Shelf[]): Shelf[] => {
            shelves.sort(naturalSort);
            for (const shelf of shelves) {
                if (shelf.children?.length) {
                    shelf.children = sortTree(shelf.children);
                }
            }
            return shelves;
        };

        // Sort all trees
        const sortedTrees = sortTree(trees);

        // Get all shelf IDs in the tree
        const getAllIds = (shelves: Shelf[]): string[] => {
            let ids: string[] = [];
            for (const shelf of shelves) {
                ids.push(shelf.id);
                if (shelf.children?.length) {
                    ids = ids.concat(getAllIds(shelf.children));
                }
            }
            return ids;
        };

        const allIds = getAllIds(sortedTrees);

        if (allIds.length > 0) {
            // Get stock sums for all shelves
            const stockSums = await this.shelfStockRepository
                .createQueryBuilder('stock')
                .select('stock.shelfId', 'shelfId')
                .addSelect('SUM(stock.quantity)', 'totalQuantity')
                .where('stock.shelfId IN (:...ids)', { ids: allIds })
                .groupBy('stock.shelfId')
                .getRawMany();

            const stockMap = new Map<string, number>();
            stockSums.forEach(s => stockMap.set(s.shelfId, parseFloat(s.totalQuantity) || 0));

            // Attach stock info to tree
            const attachStocks = (shelves: Shelf[]) => {
                for (const shelf of shelves) {
                    (shelf as any).stocks = [{ quantity: stockMap.get(shelf.id) || 0 }];
                    if (shelf.children?.length) {
                        attachStocks(shelf.children);
                    }
                }
            };

            attachStocks(sortedTrees);
        }

        return sortedTrees;
    }

    async findOne(id: string): Promise<Shelf> {
        const shelf = await this.shelfRepository.findOne({
            where: { id },
            relations: ['warehouse', 'parent', 'children', 'stocks', 'stocks.product'],
        });
        if (!shelf) {
            throw new NotFoundException(`Shelf #${id} not found`);
        }
        return shelf;
    }

    async findByBarcode(barcode: string): Promise<Shelf | null> {
        const trimmedBarcode = barcode?.trim();
        if (!trimmedBarcode) return null;
        
        this.logger.log(`Looking for shelf with barcode/name/rafId: "${trimmedBarcode}"`);
        
        // First, try rafId match (if it's a number)
        const rafIdNum = Number(trimmedBarcode);
        if (!isNaN(rafIdNum) && isFinite(rafIdNum) && rafIdNum > 0) {
            const shelfByRafId = await this.shelfRepository.findOne({
                where: { rafId: rafIdNum },
                relations: ['warehouse'],
            });
            
            if (shelfByRafId) {
                this.logger.log(`Found shelf by rafId: ${shelfByRafId.id} - ${shelfByRafId.name} (rafId: ${shelfByRafId.rafId})`);
                return shelfByRafId;
            }
        }
        
        // Try exact match by name
        let shelf = await this.shelfRepository.findOne({
            where: { name: trimmedBarcode },
            relations: ['warehouse'],
        });
        
        if (shelf) {
            this.logger.log(`Found shelf by name: ${shelf.id} - ${shelf.name}`);
            return shelf;
        }
        
        this.logger.log(`Exact match not found, trying case-insensitive barcode search`);
        
        // If not found, try case-insensitive barcode match
        const result = await this.shelfRepository
            .createQueryBuilder('shelf')
            .leftJoinAndSelect('shelf.warehouse', 'warehouse')
            .where('LOWER(shelf.barcode) = LOWER(:barcode)', { barcode: trimmedBarcode })
            .getOne();
        
        if (result) {
            this.logger.log(`Found shelf via case-insensitive barcode: ${result.id} - ${result.barcode}`);
        } else {
            this.logger.warn(`Shelf not found with barcode/name/rafId: "${trimmedBarcode}"`);
        }
        
        return result;
    }

    async update(id: string, dto: UpdateShelfDto): Promise<Shelf> {
        const shelf = await this.findOne(id);

        // Apply type rules if type changes
        if (dto.type && dto.type !== shelf.type) {
            const rules = SHELF_TYPE_RULES[dto.type];
            if (dto.isSellable === undefined) dto.isSellable = rules.isSellable;
        }

        // Handle parent change - TypeORM tree requires parent relation, not just parentId
        if (dto.parentId !== undefined && dto.parentId !== shelf.parentId) {
            if (dto.parentId) {
                const newParent = await this.shelfRepository.findOne({ where: { id: dto.parentId } });
                if (!newParent) {
                    throw new BadRequestException('Parent shelf not found');
                }
                shelf.parent = newParent;
                shelf.parentId = dto.parentId;
            } else {
                shelf.parent = null as any;
                shelf.parentId = null;
            }
            delete (dto as any).parentId;
        }

        Object.assign(shelf, dto);
        const saved = await this.shelfRepository.save(shelf);

        // Rebuild mpath for this shelf and its descendants
        const correctMpath = await this.buildMpathForShelf(saved);
        if ((saved as any).mpath !== correctMpath) {
            await this.shelfRepository.query(
                `UPDATE shelves SET mpath = ? WHERE id = ?`,
                [correctMpath, saved.id]
            );
            this.logger.log(`Fixed mpath for ${saved.name}: ${correctMpath}`);
        }

        return saved;
    }

    private async buildMpathForShelf(shelf: Shelf): Promise<string> {
        if (!shelf.parentId) {
            return `${shelf.id}.`;
        }
        const parent = await this.shelfRepository.findOne({ where: { id: shelf.parentId } });
        if (!parent) {
            return `${shelf.id}.`;
        }
        const parentMpath = await this.buildMpathForShelf(parent);
        return parentMpath + `${shelf.id}.`;
    }

    async remove(id: string): Promise<void> {
        const shelf = await this.findOne(id);
        await this.shelfRepository.remove(shelf);
    }

    async rebuildTreePaths(warehouseId: string): Promise<{ fixed: number; errors: string[] }> {
        const errors: string[] = [];
        let fixed = 0;

        const allShelves = await this.shelfRepository.find({
            where: { warehouseId },
            order: { name: 'ASC' },
        });

        const shelfMap = new Map<string, Shelf>();
        allShelves.forEach(s => shelfMap.set(s.id, s));

        const buildMpath = (shelf: Shelf): string => {
            if (!shelf.parentId) {
                return `${shelf.id}.`;
            }
            const parent = shelfMap.get(shelf.parentId);
            if (!parent) {
                errors.push(`Shelf ${shelf.name} (${shelf.id}) has invalid parentId: ${shelf.parentId}`);
                return `${shelf.id}.`;
            }
            return buildMpath(parent) + `${shelf.id}.`;
        };

        for (const shelf of allShelves) {
            const correctMpath = buildMpath(shelf);
            const currentMpath = (shelf as any).mpath;

            if (currentMpath !== correctMpath) {
                this.logger.log(`Fixing mpath for ${shelf.name}: ${currentMpath} -> ${correctMpath}`);
                await this.shelfRepository.query(
                    `UPDATE shelves SET mpath = ? WHERE id = ?`,
                    [correctMpath, shelf.id]
                );
                fixed++;
            }
        }

        this.logger.log(`Tree rebuild complete. Fixed: ${fixed}, Errors: ${errors.length}`);
        return { fixed, errors };
    }

    // Shelf Stock operations
    async getStock(shelfId: string): Promise<ShelfStock[]> {
        return this.shelfStockRepository.find({
            where: { shelfId },
            relations: ['product'],
        });
    }

    async getStockWithOrders(shelfId: string): Promise<Array<{
        stock: ShelfStock;
        orders: Array<{
            orderId: string;
            orderNumber: string;
            quantity: number;
            routeId?: string;
            movedAt: Date;
        }>;
    }>> {
        const stocks = await this.shelfStockRepository.find({
            where: { shelfId },
            relations: ['product'],
        });

        const result = [];

        for (const stock of stocks) {
            const movements = await this.movementRepository.find({
                where: {
                    shelfId,
                    productId: stock.productId,
                    direction: MovementDirection.IN,
                },
                relations: ['order'],
                order: { createdAt: 'DESC' },
                take: 20,
            });

            const orders = movements
                .filter(m => m.order)
                .map(m => ({
                    orderId: m.orderId!,
                    orderNumber: m.order?.orderNumber || '',
                    quantity: m.quantity,
                    routeId: m.routeId || undefined,
                    movedAt: m.createdAt,
                }));

            result.push({
                stock,
                orders,
            });
        }

        return result;
    }

    async addStock(shelfId: string, productId: string, quantity: number): Promise<ShelfStock> {
        let stock = await this.shelfStockRepository.findOne({
            where: { shelfId, productId },
        });

        if (stock) {
            stock.quantity += quantity;
        } else {
            stock = this.shelfStockRepository.create({
                shelfId,
                productId,
                quantity,
            });
        }

        const savedStock = await this.shelfStockRepository.save(stock);
        await this.syncProductStock(productId, shelfId);
        return savedStock;
    }

    async addStockWithHistory(
        shelfId: string,
        productId: string,
        quantity: number,
        options?: {
            type?: MovementType;
            orderId?: string;
            routeId?: string;
            referenceNumber?: string;
            notes?: string;
            userId?: string;
        }
    ): Promise<{ stock: ShelfStock; movement: ShelfStockMovement }> {
        const existingStock = await this.shelfStockRepository.findOne({
            where: { shelfId, productId },
        });
        const quantityBefore = existingStock?.quantity || 0;

        const stock = await this.addStock(shelfId, productId, quantity);

        const movement = await this.recordMovement({
            shelfId,
            productId,
            type: options?.type || MovementType.RECEIVING,
            direction: MovementDirection.IN,
            quantity,
            quantityBefore,
            quantityAfter: quantityBefore + quantity,
            orderId: options?.orderId,
            routeId: options?.routeId,
            targetShelfId: shelfId,
            referenceNumber: options?.referenceNumber,
            notes: options?.notes,
            userId: options?.userId,
        });

        this.logger.log(`Stock added with history: ${quantity} x ${productId} to shelf ${shelfId}`);

        return { stock, movement };
    }

    async removeStock(shelfId: string, productId: string, quantity: number): Promise<ShelfStock | null> {
        const stock = await this.shelfStockRepository.findOne({
            where: { shelfId, productId },
        });

        if (!stock) return null;

        stock.quantity = Math.max(0, stock.quantity - quantity);

        if (stock.quantity === 0 && stock.reservedQuantity === 0) {
            await this.shelfStockRepository.remove(stock);
            await this.syncProductStock(productId, shelfId);
            return null;
        }

        const savedStock = await this.shelfStockRepository.save(stock);
        await this.syncProductStock(productId, shelfId);
        return savedStock;
    }

    // Consumable Stock Operations
    async addConsumableStock(shelfId: string, consumableId: string, quantity: number): Promise<ShelfConsumableStock> {
        let stock = await this.shelfConsumableStockRepository.findOne({
            where: { shelfId, consumableId },
        });

        if (!stock) {
            stock = this.shelfConsumableStockRepository.create({
                shelfId,
                consumableId,
                quantity: 0,
                reservedQuantity: 0,
            });
        }

        stock.quantity = Number(stock.quantity) + Number(quantity);
        return this.shelfConsumableStockRepository.save(stock);
    }

    async removeConsumableStock(shelfId: string, consumableId: string, quantity: number): Promise<ShelfConsumableStock | null> {
        const stock = await this.shelfConsumableStockRepository.findOne({
            where: { shelfId, consumableId },
        });

        if (!stock) {
            throw new BadRequestException('Böyle bir sarf malzeme stok kaydı bulunamadı');
        }

        if (stock.availableQuantity < quantity) {
            throw new BadRequestException('Yetersiz stok!');
        }

        stock.quantity = Number(stock.quantity) - Number(quantity);

        if (Number(stock.quantity) <= 0 && Number(stock.reservedQuantity) <= 0) {
            await this.shelfConsumableStockRepository.remove(stock);
            return null;
        }

        return this.shelfConsumableStockRepository.save(stock);
    }

    async getConsumableStock(shelfId: string): Promise<ShelfConsumableStock[]> {
        return this.shelfConsumableStockRepository.find({
            where: { shelfId },
            relations: ['consumable'],
        });
    }

    private async syncProductStock(productId: string, shelfId: string) {
        // 1. Get warehouse for context
        const shelf = await this.shelfRepository.findOne({ where: { id: shelfId } });
        if (!shelf || !shelf.warehouseId) return;
        const warehouseId = shelf.warehouseId;

        // 2. Aggregate stocks by type for this product in this warehouse
        const stocks = await this.shelfStockRepository.createQueryBuilder('ss')
            .innerJoinAndSelect('ss.shelf', 'shelf')
            .where('ss.productId = :productId', { productId })
            .andWhere('shelf.warehouseId = :warehouseId', { warehouseId })
            .getMany();

        // 3. Calculate totals based on rules
        let sellable = 0;
        let total = 0;

        for (const stock of stocks) {
            total += stock.quantity;
            if (stock.shelf.isSellable) {
                sellable += stock.quantity;
            }
        }

        // 4. Update ProductStores linked to this warehouse
        // Get warehouse for context to find associated stores
        const warehouse = await this.shelfRepository.manager.findOne(Warehouse, {
            where: { id: warehouseId },
            relations: ['stores'] // Assuming relation exists
        });

        console.log(`Syncing stock for Product ${productId} in Warehouse ${warehouseId}`);
        if (!warehouse) {
            console.error('Warehouse not found during stock sync');
            return;
        }
        console.log(`Found Warehouse: ${warehouse.name}, Stores count: ${warehouse.stores?.length}`);

        if (warehouse && warehouse.stores) {
            for (const store of warehouse.stores) {
                let productStore = await this.productStoreRepository.findOne({
                    where: { productId, storeId: store.id }
                });

                if (productStore) {
                    productStore.stockQuantity = total;
                    // Formula: Sellable = Physical Sellable - Committed
                    // Ensure we don't go below 0 for display, though conceptually it means backorder
                    productStore.sellableQuantity = Math.max(0, sellable - (productStore.committedQuantity || 0));
                    productStore.reservableQuantity = sellable; // Same as sellable now
                    await this.productStoreRepository.save(productStore);
                } else {
                    // If productStore doesn't exist, create it (or handle as per business logic)
                    // For now, let's assume it should exist or be created with default values
                    productStore = this.productStoreRepository.create({
                        productId,
                        storeId: store.id,
                        stockQuantity: total,
                        sellableQuantity: Math.max(0, sellable), // No committed yet if new
                        reservableQuantity: sellable, // Same as sellable now
                        committedQuantity: 0, // Default to 0
                    });
                    await this.productStoreRepository.save(productStore);
                }
            }
        }
    }

    async transferStock(
        fromShelfId: string,
        toShelfId: string,
        productId: string,
        quantity: number,
    ): Promise<{ from: ShelfStock | null; to: ShelfStock }> {
        // Validate target shelf is shelvable
        const toShelf = await this.shelfRepository.findOne({ where: { id: toShelfId } });
        if (!toShelf) {
            throw new BadRequestException('Hedef raf bulunamadı');
        }
        if (!toShelf.isShelvable) {
            throw new BadRequestException('Hedef raf transfer için uygun değil (raflanabilir değil)');
        }

        const from = await this.removeStock(fromShelfId, productId, quantity);
        const to = await this.addStock(toShelfId, productId, quantity);
        return { from, to };
    }

    // Get receiving shelves (for goods receipt suggestions)
    async getReceivingShelves(warehouseId: string): Promise<Shelf[]> {
        return this.shelfRepository.find({
            where: { warehouseId, type: ShelfType.RECEIVING },
            order: { name: 'ASC' },
        });
    }

    async searchProductInShelves(query: string): Promise<Array<{
        shelf: Shelf;
        warehouse: { id: string; name: string };
        quantity: number;
        product: { name: string; barcode: string };
    }>> {
        const stocks = await this.shelfStockRepository
            .createQueryBuilder('stock')
            .leftJoinAndSelect('stock.product', 'product')
            .leftJoinAndSelect('stock.shelf', 'shelf')
            .leftJoinAndSelect('shelf.warehouse', 'warehouse')
            .where('product.name LIKE :query', { query: `%${query}%` })
            .orWhere('product.barcode LIKE :query', { query: `%${query}%` })
            .orWhere('product.sku LIKE :query', { query: `%${query}%` })
            .andWhere('stock.quantity > 0')
            .orderBy('stock.quantity', 'DESC')
            .getMany();

        return stocks.map(stock => ({
            shelf: stock.shelf,
            warehouse: {
                id: stock.shelf?.warehouse?.id || stock.shelf?.warehouseId || '',
                name: stock.shelf?.warehouse?.name || 'Bilinmeyen Depo',
            },
            quantity: stock.quantity,
            product: {
                name: stock.product?.name || 'Bilinmeyen Ürün',
                barcode: stock.product?.barcode || '',
            },
        }));
    }

    async searchProductsByIds(productIds: string[]): Promise<Array<{
        shelf: Shelf;
        warehouse: { id: string; name: string };
        quantity: number;
        product: { name: string; barcode: string };
    }>> {
        if (!productIds || productIds.length === 0) return [];

        const stocks = await this.shelfStockRepository
            .createQueryBuilder('stock')
            .leftJoinAndSelect('stock.product', 'product')
            .leftJoinAndSelect('stock.shelf', 'shelf')
            .leftJoinAndSelect('shelf.warehouse', 'warehouse')
            .where('stock.productId IN (:...productIds)', { productIds })
            .andWhere('stock.quantity > 0')
            .orderBy('product.name', 'ASC')
            .addOrderBy('stock.quantity', 'DESC')
            .getMany();

        return stocks.map(stock => ({
            shelf: stock.shelf,
            warehouse: {
                id: stock.shelf?.warehouse?.id || stock.shelf?.warehouseId || '',
                name: stock.shelf?.warehouse?.name || 'Bilinmeyen Depo',
            },
            quantity: stock.quantity,
            product: {
                name: stock.product?.name || 'Bilinmeyen Ürün',
                barcode: stock.product?.barcode || '',
            },
        }));
    }

    // ─────────────────────────────────────────────────────────────
    // Excel Import / Export
    // ─────────────────────────────────────────────────────────────

    async importExcel(fileBuffer: Buffer, warehouseId: string): Promise<{
        success: number;
        updated: number;
        errors: string[];
    }> {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data: any[] = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;
        let updatedCount = 0;
        const errors: string[] = [];

        // Map to store created shelves by name for parent lookup
        const shelfNameMap = new Map<string, Shelf>();

        // First pass: Load existing shelves into map
        const existingShelves = await this.shelfRepository.find({ where: { warehouseId } });
        for (const shelf of existingShelves) {
            shelfNameMap.set(shelf.name, shelf);
        }

        // Helper to map RAF TİPİ to ShelfType
        const mapShelfType = (type: string): ShelfType => {
            const typeMap: Record<string, ShelfType> = {
                'NORMAL': ShelfType.NORMAL,
                'HASARLI': ShelfType.DAMAGED,
                'PAKETLEME': ShelfType.PACKING,
                'TOPLAMA': ShelfType.PICKING,
                'MAL KABUL': ShelfType.RECEIVING,
                'İADE': ShelfType.RETURN,
                'İADE HASARLI': ShelfType.RETURN_DAMAGED,
            };
            return typeMap[type?.toUpperCase()] || ShelfType.NORMAL;
        };

        // Process each row
        for (const [index, row] of data.entries()) {
            try {
                // Get column values (support both Turkish and English column names)
                const name = row['RAF ADI'] || row['name'] || row['Name'];
                const rafId = parseInt(row['RAF ID'] || row['rafId'] || '0', 10);
                const globalSlot = parseInt(row['GLOBAL SLOT'] || row['globalSlot'] || '0', 10);
                const typeStr = row['RAF TİPİ'] || row['type'] || row['Type'] || 'NORMAL';
                const parentName = row['KÖK'] || row['parent'] || row['Parent'];
                const collectableStr = row['TOPLANABİLİR'] || row['collectable'] || row['pickable'] || 'HAYIR';
                const shelvableStr = row['RAFLANABİLİR'] || row['shelvable'] || 'EVET';
                const sellableStr = row['SATILABİLİR'] || row['sellable'] || 'HAYIR';

                if (!name) {
                    errors.push(`Satır ${index + 2}: Raf adı eksik.`);
                    continue;
                }

                // Determine flags from Excel columns
                const isSellable = sellableStr?.toUpperCase() === 'EVET';
                const isPickable = collectableStr?.toUpperCase() === 'EVET';
                const isShelvable = shelvableStr?.toUpperCase() === 'EVET';
                const shelfType = mapShelfType(typeStr);
                const rules = SHELF_TYPE_RULES[shelfType];

                // Check if shelf exists by rafId first, then by name
                let existingShelf = rafId > 0
                    ? await this.shelfRepository.findOne({ where: { rafId, warehouseId } })
                    : null;

                // Also check by name if not found by rafId
                if (!existingShelf) {
                    existingShelf = shelfNameMap.get(name) || null;
                }

                // Find parent shelf if KÖK is specified
                let parentId: string | undefined;
                if (parentName) {
                    const parentShelf = shelfNameMap.get(parentName);
                    if (parentShelf) {
                        parentId = parentShelf.id;
                    }
                    // If parent not found yet, it will be linked in second pass
                }

                if (existingShelf) {
                    // Update existing shelf
                    await this.update(existingShelf.id, {
                        name,
                        type: shelfType,
                        rafId: rafId > 0 ? rafId : undefined,
                        globalSlot: globalSlot > 0 ? globalSlot : undefined,
                        isSellable,
                        isPickable,
                        isShelvable,
                        parentId,
                    });
                    shelfNameMap.set(name, existingShelf);
                    updatedCount++;
                } else {
                    // Create new shelf
                    const newShelf = await this.create({
                        name,
                        type: shelfType,
                        warehouseId,
                        rafId: rafId > 0 ? rafId : undefined,
                        globalSlot: globalSlot > 0 ? globalSlot : undefined,
                        isSellable,
                        isPickable,
                        isShelvable,
                        parentId,
                    });
                    shelfNameMap.set(name, newShelf);
                    successCount++;
                }
            } catch (err: any) {
                errors.push(`Satır ${index + 2}: ${err.message}`);
            }
        }

        // Second pass: Fix parent relationships for shelves whose parents were created after them
        for (const [index, row] of data.entries()) {
            try {
                const name = row['RAF ADI'] || row['name'] || row['Name'];
                const parentName = row['KÖK'] || row['parent'] || row['Parent'];

                if (!name || !parentName) continue;

                const shelf = shelfNameMap.get(name);
                const parentShelf = shelfNameMap.get(parentName);

                if (shelf && parentShelf && shelf.parentId !== parentShelf.id) {
                    await this.update(shelf.id, { parentId: parentShelf.id });
                }
            } catch (err: any) {
                // Ignore errors in second pass, they were already reported
            }
        }

        // Third pass: Rebuild all mpath values to ensure tree integrity
        this.logger.log('Rebuilding tree paths after import...');
        await this.rebuildTreePaths(warehouseId);

        return { success: successCount, updated: updatedCount, errors };
    }

    async generateExcelTemplate(): Promise<Buffer> {
        const headers = [
            'RAF ADI',
            'RAF ID',
            'RAF TİPİ',
            'KÖK',
            'GLOBAL SLOT',
            'RAFLANABİLİR',
            'TOPLANABİLİR',
            'SATILABİLİR',
        ];

        const exampleRows = [
            ['MERKEZ', 1000, 'NORMAL', '', 1000, 'HAYIR', 'HAYIR', 'HAYIR'],
            ['A', 1001, 'NORMAL', 'MERKEZ', 1001, 'HAYIR', 'HAYIR', 'HAYIR'],
            ['A1', 1002, 'NORMAL', 'A', 1002, 'HAYIR', 'HAYIR', 'HAYIR'],
            ['A1-1', 1003, 'NORMAL', 'A1', 1003, 'EVET', 'EVET', 'EVET'],
        ];

        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Raflar');

        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    async getProductTotalStock(productId: string): Promise<number> {
        const result = await this.shelfStockRepository
            .createQueryBuilder('ss')
            .select('SUM(ss.quantity)', 'total')
            .where('ss.productId = :productId', { productId })
            .getRawOne();

        return Number(result?.total) || 0;
    }

    async getConsumableTotalStock(consumableId: string): Promise<number> {
        const result = await this.shelfConsumableStockRepository
            .createQueryBuilder('scs')
            .select('SUM(scs.quantity)', 'total')
            .where('scs.consumableId = :consumableId', { consumableId })
            .getRawOne();

        return Number(result?.total) || 0;
    }

    async recordMovement(params: {
        shelfId: string;
        productId: string;
        type: MovementType;
        direction: MovementDirection;
        quantity: number;
        quantityBefore: number;
        quantityAfter: number;
        orderId?: string;
        routeId?: string;
        sourceShelfId?: string;
        targetShelfId?: string;
        referenceNumber?: string;
        cargoTrackingNumber?: string;
        notes?: string;
        userId?: string;
    }): Promise<ShelfStockMovement> {
        const movement = this.movementRepository.create({
            shelfId: params.shelfId,
            productId: params.productId,
            type: params.type,
            direction: params.direction,
            quantity: params.quantity,
            quantityBefore: params.quantityBefore,
            quantityAfter: params.quantityAfter,
            orderId: params.orderId || null,
            routeId: params.routeId || null,
            sourceShelfId: params.sourceShelfId || null,
            targetShelfId: params.targetShelfId || null,
            referenceNumber: params.referenceNumber,
            cargoTrackingNumber: params.cargoTrackingNumber || null,
            notes: params.notes,
            userId: params.userId || null,
        });

        return this.movementRepository.save(movement);
    }

    async transferWithHistory(
        fromShelfId: string,
        toShelfId: string,
        productId: string,
        quantity: number,
        options?: {
            type?: MovementType;
            orderId?: string;
            routeId?: string;
            referenceNumber?: string;
            cargoTrackingNumber?: string;
            notes?: string;
            userId?: string;
        }
    ): Promise<{ from: ShelfStock | null; to: ShelfStock; movements: ShelfStockMovement[] }> {
        const toShelf = await this.shelfRepository.findOne({ where: { id: toShelfId } });
        if (!toShelf) {
            throw new BadRequestException('Hedef raf bulunamadı');
        }
        if (!toShelf.isShelvable) {
            throw new BadRequestException('Hedef raf transfer için uygun değil');
        }

        const fromStock = await this.shelfStockRepository.findOne({
            where: { shelfId: fromShelfId, productId },
        });

        if (!fromStock) {
            throw new BadRequestException('Kaynak rafta bu ürün bulunamadı');
        }

        const fromQuantityBefore = fromStock.quantity;
        if (fromQuantityBefore < quantity) {
            throw new BadRequestException(`Yetersiz stok. Mevcut: ${fromQuantityBefore}, İstenen: ${quantity}`);
        }

        let toStock = await this.shelfStockRepository.findOne({
            where: { shelfId: toShelfId, productId },
        });
        const toQuantityBefore = toStock?.quantity || 0;

        // Remove from source shelf (without sync - we'll sync after both operations)
        fromStock.quantity = Math.max(0, fromStock.quantity - quantity);
        if (fromStock.quantity === 0 && fromStock.reservedQuantity === 0) {
            await this.shelfStockRepository.remove(fromStock);
        } else {
            await this.shelfStockRepository.save(fromStock);
        }

        // Add to target shelf (without sync - we'll sync after both operations)
        if (toStock) {
            toStock.quantity += quantity;
        } else {
            toStock = this.shelfStockRepository.create({
                shelfId: toShelfId,
                productId,
                quantity,
            });
        }
        const savedToStock = await this.shelfStockRepository.save(toStock);

        // Sync product stock once after both operations (only once, not twice)
        await this.syncProductStock(productId, toShelfId);

        const from = fromStock.quantity === 0 ? null : fromStock;
        const to = savedToStock;

        const movements: ShelfStockMovement[] = [];

        const outMovement = await this.recordMovement({
            shelfId: fromShelfId,
            productId,
            type: options?.type || MovementType.TRANSFER,
            direction: MovementDirection.OUT,
            quantity,
            quantityBefore: fromQuantityBefore,
            quantityAfter: fromQuantityBefore - quantity,
            orderId: options?.orderId,
            routeId: options?.routeId,
            sourceShelfId: fromShelfId,
            targetShelfId: toShelfId,
            referenceNumber: options?.referenceNumber,
            cargoTrackingNumber: options?.cargoTrackingNumber,
            notes: options?.notes,
            userId: options?.userId,
        });
        movements.push(outMovement);

        const inMovement = await this.recordMovement({
            shelfId: toShelfId,
            productId,
            type: options?.type || MovementType.TRANSFER,
            direction: MovementDirection.IN,
            quantity,
            quantityBefore: toQuantityBefore,
            quantityAfter: toQuantityBefore + quantity,
            orderId: options?.orderId,
            routeId: options?.routeId,
            sourceShelfId: fromShelfId,
            targetShelfId: toShelfId,
            referenceNumber: options?.referenceNumber,
            cargoTrackingNumber: options?.cargoTrackingNumber,
            notes: options?.notes,
            userId: options?.userId,
        });
        movements.push(inMovement);

        this.logger.log(`Transfer: ${quantity} x ${productId} from shelf ${fromShelfId} to ${toShelfId}`);

        return { from, to, movements };
    }

    async removeStockWithHistory(
        shelfId: string,
        productId: string,
        quantity: number,
        options?: {
            type?: MovementType;
            orderId?: string;
            routeId?: string;
            referenceNumber?: string;
            cargoTrackingNumber?: string;
            notes?: string;
            userId?: string;
        }
    ): Promise<{ stock: ShelfStock | null; movement: ShelfStockMovement }> {
        const stock = await this.shelfStockRepository.findOne({
            where: { shelfId, productId },
        });

        const quantityBefore = stock?.quantity || 0;
        const result = await this.removeStock(shelfId, productId, quantity);
        const quantityAfter = result?.quantity || 0;

        const movement = await this.recordMovement({
            shelfId,
            productId,
            type: options?.type || MovementType.ADJUSTMENT,
            direction: MovementDirection.OUT,
            quantity,
            quantityBefore,
            quantityAfter,
            orderId: options?.orderId,
            routeId: options?.routeId,
            referenceNumber: options?.referenceNumber,
            cargoTrackingNumber: options?.cargoTrackingNumber,
            notes: options?.notes,
            userId: options?.userId,
        });

        return { stock: result, movement };
    }

    async getMovementHistory(filters: {
        shelfId?: string;
        productId?: string;
        orderId?: string;
        routeId?: string;
        type?: MovementType;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
    }): Promise<{ data: ShelfStockMovement[]; total: number }> {
        const query = this.movementRepository.createQueryBuilder('movement')
            .leftJoinAndSelect('movement.shelf', 'shelf')
            .leftJoinAndSelect('movement.product', 'product')
            .leftJoinAndSelect('movement.order', 'order')
            .leftJoinAndSelect('movement.user', 'user')
            .leftJoinAndSelect('movement.sourceShelf', 'sourceShelf')
            .leftJoinAndSelect('movement.targetShelf', 'targetShelf')
            .orderBy('movement.createdAt', 'DESC');

        if (filters.shelfId) {
            query.andWhere('movement.shelfId = :shelfId', { shelfId: filters.shelfId });
        }
        if (filters.productId) {
            query.andWhere('movement.productId = :productId', { productId: filters.productId });
        }
        if (filters.orderId) {
            query.andWhere('movement.orderId = :orderId', { orderId: filters.orderId });
        }
        if (filters.routeId) {
            query.andWhere('movement.routeId = :routeId', { routeId: filters.routeId });
        }
        if (filters.type) {
            query.andWhere('movement.type = :type', { type: filters.type });
        }
        if (filters.startDate) {
            query.andWhere('movement.createdAt >= :startDate', { startDate: filters.startDate });
        }
        if (filters.endDate) {
            query.andWhere('movement.createdAt <= :endDate', { endDate: filters.endDate });
        }

        const page = filters.page || 1;
        const limit = filters.limit || 50;

        const [data, total] = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return { data, total };
    }

    async getPackingShelf(warehouseId?: string): Promise<Shelf | null> {
        if (warehouseId) {
            const shelf = await this.shelfRepository.findOne({
                where: { warehouseId, type: ShelfType.PACKING },
            });
            if (shelf) return shelf;
        }
        return this.shelfRepository.findOne({
            where: { type: ShelfType.PACKING },
        });
    }

    async getPickingShelf(warehouseId?: string): Promise<Shelf | null> {
        if (warehouseId) {
            const shelf = await this.shelfRepository.findOne({
                where: { warehouseId, type: ShelfType.PICKING },
            });
            if (shelf) return shelf;
        }
        return this.shelfRepository.findOne({
            where: { type: ShelfType.PICKING },
        });
    }

    /**
     * Transfer order items from PICKING shelf to PACKING shelf for bulk operations
     * Used during bulk packaging/invoicing to track items on packing shelf
     */
    async transferOrderToPackingShelf(
        orderId: string,
        options?: {
            routeId?: string;
            cargoTrackingNumber?: string;
            userId?: string;
        }
    ): Promise<{ success: boolean; message: string; transfers: number }> {
        const order = await this.shelfRepository.manager.getRepository('Order').findOne({
            where: { id: orderId },
            relations: ['items'],
        });

        if (!order) {
            return { success: false, message: 'Sipariş bulunamadı', transfers: 0 };
        }

        const pickingShelf = await this.getPickingShelf();
        const packingShelf = await this.getPackingShelf();

        if (!pickingShelf || !packingShelf) {
            return { success: false, message: 'TOPLAMA veya PAKETLEME rafı bulunamadı', transfers: 0 };
        }

        let transfers = 0;
        const productRepository = this.shelfRepository.manager.getRepository('Product');

        for (const item of order['items'] || []) {
            if (!item.barcode) continue;

            const product = await productRepository.findOne({ where: { barcode: item.barcode } });
            if (!product) {
                this.logger.warn(`Product with barcode ${item.barcode} not found for order ${orderId}`);
                continue;
            }

            // Check if product exists in picking shelf
            const pickingStock = await this.shelfStockRepository.findOne({
                where: { shelfId: pickingShelf.id, productId: product.id },
            });

            if (!pickingStock || pickingStock.quantity < (item.quantity || 1)) {
                this.logger.warn(`Insufficient stock in picking shelf for ${item.barcode}. Available: ${pickingStock?.quantity || 0}, Required: ${item.quantity || 1}`);
                continue;
            }

            // Transfer from PICKING to PACKING
            try {
                await this.transferWithHistory(
                    pickingShelf.id,
                    packingShelf.id,
                    product.id,
                    item.quantity || 1,
                    {
                        type: MovementType.PACKING_IN,
                        orderId,
                        routeId: options?.routeId,
                        referenceNumber: order['orderNumber'],
                        cargoTrackingNumber: options?.cargoTrackingNumber || order['cargoTrackingNumber'],
                        notes: `Toplu paketleme - Sipariş: ${order['orderNumber']}`,
                        userId: options?.userId,
                    }
                );
                transfers++;
            } catch (error) {
                this.logger.error(`Failed to transfer ${item.barcode} for order ${orderId}: ${error.message}`);
            }
        }

        return {
            success: transfers > 0,
            message: `${transfers} ürün PAKETLEME rafına aktarıldı`,
            transfers,
        };
    }

    /**
     * Remove order items from PACKING shelf when shipped
     * Used when order status changes to SHIPPED
     */
    async removeOrderFromPackingShelf(
        orderId: string,
        options?: {
            routeId?: string;
            userId?: string;
        }
    ): Promise<{ success: boolean; message: string; removed: number }> {
        const order = await this.shelfRepository.manager.getRepository('Order').findOne({
            where: { id: orderId },
            relations: ['items'],
        });

        if (!order) {
            return { success: false, message: 'Sipariş bulunamadı', removed: 0 };
        }

        const packingShelf = await this.getPackingShelf();

        if (!packingShelf) {
            return { success: false, message: 'PAKETLEME rafı bulunamadı', removed: 0 };
        }

        let removed = 0;
        const productRepository = this.shelfRepository.manager.getRepository('Product');

        for (const item of order['items'] || []) {
            if (!item.barcode) continue;

            const product = await productRepository.findOne({ where: { barcode: item.barcode } });
            if (!product) {
                this.logger.warn(`Product with barcode ${item.barcode} not found for order ${orderId}`);
                continue;
            }

            try {
                await this.removeStockWithHistory(
                    packingShelf.id,
                    product.id,
                    item.quantity || 1,
                    {
                        type: MovementType.PACKING_OUT,
                        orderId,
                        routeId: options?.routeId,
                        referenceNumber: order['orderNumber'],
                        cargoTrackingNumber: order['cargoTrackingNumber'],
                        notes: `Kargoya verildi - Sipariş: ${order['orderNumber']}`,
                        userId: options?.userId,
                    }
                );
                removed++;
            } catch (error) {
                this.logger.error(`Failed to remove ${item.barcode} from packing shelf for order ${orderId}: ${error.message}`);
            }
        }

        return {
            success: removed > 0,
            message: `${removed} ürün PAKETLEME rafından çıkarıldı`,
            removed,
        };
    }
}
