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

        // Build path
        let path = `/${dto.name.toLowerCase().replace(/\s+/g, '-')}`;
        if (dto.parentId) {
            const parent = await this.shelfRepository.findOne({ where: { id: dto.parentId } });
            if (parent) {
                path = `${parent.path}${path}`;
            }
        }

        const shelf = this.shelfRepository.create({
            ...dto,
            path,
            isSellable: isSellable ?? true,
            isReservable: isReservable ?? true,
        });

        return this.shelfRepository.save(shelf);
    }

    async findAll(warehouseId?: string): Promise<Shelf[]> {
        const where: any = {};
        if (warehouseId) {
            where.warehouseId = warehouseId;
        }

        return this.shelfRepository.find({
            where,
            relations: ['warehouse', 'parent'],
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
