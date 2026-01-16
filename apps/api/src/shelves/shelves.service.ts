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
            order: { sortOrder: 'ASC' },
        });

        // Build tree for each root
        const trees = await Promise.all(
            roots.map(root => this.shelfRepository.findDescendantsTree(root))
        );

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

        const allIds = getAllIds(trees);

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

            attachStocks(trees);
        }

        return trees;
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
}
