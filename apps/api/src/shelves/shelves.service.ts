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
        return this.shelfRepository.findOne({
            where: { barcode },
            relations: ['warehouse'],
        });
    }

    async update(id: string, dto: UpdateShelfDto): Promise<Shelf> {
        const shelf = await this.findOne(id);

        // Apply type rules if type changes
        if (dto.type && dto.type !== shelf.type) {
            const rules = SHELF_TYPE_RULES[dto.type];
            if (dto.isSellable === undefined) dto.isSellable = rules.isSellable;
        }

        Object.assign(shelf, dto);
        return this.shelfRepository.save(shelf);
    }

    async remove(id: string): Promise<void> {
        const shelf = await this.findOne(id);
        await this.shelfRepository.remove(shelf);
    }

    // Shelf Stock operations
    async getStock(shelfId: string): Promise<ShelfStock[]> {
        return this.shelfStockRepository.find({
            where: { shelfId },
            relations: ['product'],
        });
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

        const fromQuantityBefore = fromStock?.quantity || 0;
        if (fromQuantityBefore < quantity) {
            throw new BadRequestException(`Yetersiz stok. Mevcut: ${fromQuantityBefore}, İstenen: ${quantity}`);
        }

        const toStock = await this.shelfStockRepository.findOne({
            where: { shelfId: toShelfId, productId },
        });
        const toQuantityBefore = toStock?.quantity || 0;

        const from = await this.removeStock(fromShelfId, productId, quantity);
        const to = await this.addStock(toShelfId, productId, quantity);

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

    async getPackingShelf(warehouseId: string): Promise<Shelf | null> {
        return this.shelfRepository.findOne({
            where: { warehouseId, type: ShelfType.PACKING },
        });
    }

    async getPickingShelf(warehouseId: string): Promise<Shelf | null> {
        return this.shelfRepository.findOne({
            where: { warehouseId, type: ShelfType.PICKING },
        });
    }
}
