import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, IsNull } from 'typeorm';
import { Shelf } from './entities/shelf.entity';
import { ShelfStock } from './entities/shelf-stock.entity';
import { CreateShelfDto } from './dto/create-shelf.dto';
import { UpdateShelfDto } from './dto/update-shelf.dto';
import { ShelfType, SHELF_TYPE_RULES } from './enums/shelf-type.enum';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import * as XLSX from 'xlsx';

@Injectable()
export class ShelvesService {
    constructor(
        @InjectRepository(Shelf)
        private readonly shelfRepository: TreeRepository<Shelf>,
        @InjectRepository(ShelfStock)
        private readonly shelfStockRepository: Repository<ShelfStock>,
        @InjectRepository(ProductStore)
        private readonly productStoreRepository: Repository<ProductStore>,
    ) { }

    async create(dto: CreateShelfDto): Promise<Shelf> {
        // Apply type rules if type is provided
        let isSellable = dto.isSellable;
        let isReservable = dto.isReservable;

        if (dto.type) {
            const rules = SHELF_TYPE_RULES[dto.type];
            if (isSellable === undefined) isSellable = rules.isSellable;
            if (isReservable === undefined) isReservable = rules.isReservable;
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
            isSellable: isSellable ?? true,
            isReservable: isReservable ?? true,
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
            if (dto.isReservable === undefined) dto.isReservable = rules.isReservable;
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
        let reservable = 0;
        let total = 0;

        for (const stock of stocks) {
            total += stock.quantity;
            if (stock.shelf.isSellable) {
                sellable += stock.quantity;
            }
            if (stock.shelf.isReservable) {
                reservable += stock.quantity;
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
                    productStore.reservableQuantity = reservable;
                    await this.productStoreRepository.save(productStore);
                } else {
                    // If productStore doesn't exist, create it (or handle as per business logic)
                    // For now, let's assume it should exist or be created with default values
                    productStore = this.productStoreRepository.create({
                        productId,
                        storeId: store.id,
                        stockQuantity: total,
                        sellableQuantity: Math.max(0, sellable), // No committed yet if new
                        reservableQuantity: reservable,
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
                const globalSlot = parseInt(row['RAF ID'] || row['GLOBAL SLOT'] || row['globalSlot'] || '0', 10);
                const typeStr = row['RAF TİPİ'] || row['type'] || row['Type'] || 'NORMAL';
                const parentName = row['KÖK'] || row['parent'] || row['Parent'];
                const collectableStr = row['TOPLANABİLİR'] || row['collectable'] || 'HAYIR';

                if (!name) {
                    errors.push(`Satır ${index + 2}: Raf adı eksik.`);
                    continue;
                }

                // Determine isSellable based on TOPLANABİLİR
                const isSellable = collectableStr?.toUpperCase() === 'EVET';
                const shelfType = mapShelfType(typeStr);
                const rules = SHELF_TYPE_RULES[shelfType];

                // Check if shelf exists by globalSlot
                let existingShelf = globalSlot > 0
                    ? await this.shelfRepository.findOne({ where: { globalSlot, warehouseId } })
                    : null;

                // Also check by name if not found by globalSlot
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
                        globalSlot: globalSlot > 0 ? globalSlot : undefined,
                        isSellable,
                        isReservable: rules.isReservable,
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
                        globalSlot: globalSlot > 0 ? globalSlot : undefined,
                        isSellable,
                        isReservable: rules.isReservable,
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
            'TOPLANABİLİR',
        ];

        const exampleRows = [
            ['MERKEZ', 1000, 'NORMAL', '', 1000, 'HAYIR'],
            ['A', 1001, 'NORMAL', 'MERKEZ', 1001, 'HAYIR'],
            ['A1', 1002, 'NORMAL', 'A', 1002, 'HAYIR'],
            ['A1-1', 1003, 'NORMAL', 'A1', 1003, 'EVET'],
        ];

        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Raflar');

        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
}
