import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, IsNull } from 'typeorm';
import { Shelf } from './entities/shelf.entity';
import { ShelfStock } from './entities/shelf-stock.entity';
import { CreateShelfDto } from './dto/create-shelf.dto';
import { UpdateShelfDto } from './dto/update-shelf.dto';
import { ShelfType, SHELF_TYPE_RULES } from './enums/shelf-type.enum';

@Injectable()
export class ShelvesService {
    constructor(
        @InjectRepository(Shelf)
        private readonly shelfRepository: TreeRepository<Shelf>,
        @InjectRepository(ShelfStock)
        private readonly shelfStockRepository: Repository<ShelfStock>,
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

        return this.shelfStockRepository.save(stock);
    }

    async removeStock(shelfId: string, productId: string, quantity: number): Promise<ShelfStock | null> {
        const stock = await this.shelfStockRepository.findOne({
            where: { shelfId, productId },
        });

        if (!stock) return null;

        stock.quantity = Math.max(0, stock.quantity - quantity);

        if (stock.quantity === 0 && stock.reservedQuantity === 0) {
            await this.shelfStockRepository.remove(stock);
            return null;
        }

        return this.shelfStockRepository.save(stock);
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
