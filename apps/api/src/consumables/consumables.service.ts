import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Consumable } from './entities/consumable.entity';
import { CreateConsumableDto, UpdateConsumableDto } from './dto/create-consumable.dto';

@Injectable()
export class ConsumablesService {
    constructor(
        @InjectRepository(Consumable)
        private readonly consumableRepository: Repository<Consumable>,
    ) { }

    async create(createConsumableDto: CreateConsumableDto): Promise<Consumable> {
        if (createConsumableDto.sku) {
            const existing = await this.consumableRepository.findOne({ where: { sku: createConsumableDto.sku } });
            if (existing) {
                throw new BadRequestException('Bu SKU ile bir malzeme zaten mevcut');
            }
        }

        if (createConsumableDto.barcode) {
            const existing = await this.consumableRepository.findOne({ where: { barcode: createConsumableDto.barcode } });
            if (existing) {
                throw new BadRequestException('Bu barkod ile bir malzeme zaten mevcut');
            }
        }

        if (createConsumableDto.parentId) {
            const parent = await this.consumableRepository.findOne({ where: { id: createConsumableDto.parentId } });
            if (!parent) {
                throw new BadRequestException('Ana malzeme bulunamadı');
            }
            if (parent.parentId) {
                throw new BadRequestException('Varyant bir başka varyantın altına eklenemez');
            }
            createConsumableDto.type = parent.type;
            createConsumableDto.unit = parent.unit;
        }

        const consumable = this.consumableRepository.create(createConsumableDto);
        return this.consumableRepository.save(consumable);
    }

    async findAll(includeVariants = true): Promise<Consumable[]> {
        if (includeVariants) {
            return this.consumableRepository.find({
                relations: ['parent', 'variants'],
                order: { name: 'ASC' },
            });
        }
        return this.consumableRepository.find({
            where: { parentId: IsNull() },
            relations: ['variants'],
            order: { name: 'ASC' },
        });
    }

    async findOne(id: string): Promise<Consumable> {
        const consumable = await this.consumableRepository.findOne({
            where: { id },
            relations: ['parent', 'variants'],
        });
        if (!consumable) {
            throw new NotFoundException(`ID ${id} ile malzeme bulunamadı`);
        }
        return consumable;
    }

    async update(id: string, updateConsumableDto: UpdateConsumableDto): Promise<Consumable> {
        const consumable = await this.findOne(id);

        if (updateConsumableDto.sku && updateConsumableDto.sku !== consumable.sku) {
            const existing = await this.consumableRepository.findOne({ where: { sku: updateConsumableDto.sku } });
            if (existing) {
                throw new BadRequestException('Bu SKU ile bir malzeme zaten mevcut');
            }
        }

        if (updateConsumableDto.barcode && updateConsumableDto.barcode !== consumable.barcode) {
            const existing = await this.consumableRepository.findOne({ where: { barcode: updateConsumableDto.barcode } });
            if (existing) {
                throw new BadRequestException('Bu barkod ile bir malzeme zaten mevcut');
            }
        }

        if (updateConsumableDto.parentId && updateConsumableDto.parentId !== consumable.parentId) {
            if (updateConsumableDto.parentId === id) {
                throw new BadRequestException('Bir malzeme kendisinin varyantı olamaz');
            }
            const parent = await this.consumableRepository.findOne({ where: { id: updateConsumableDto.parentId } });
            if (!parent) {
                throw new BadRequestException('Ana malzeme bulunamadı');
            }
            if (parent.parentId) {
                throw new BadRequestException('Varyant bir başka varyantın altına eklenemez');
            }
        }

        Object.assign(consumable, updateConsumableDto);
        return this.consumableRepository.save(consumable);
    }

    async remove(id: string): Promise<void> {
        const consumable = await this.findOne(id);
        if (consumable.variants && consumable.variants.length > 0) {
            throw new BadRequestException('Varyantları olan bir malzeme silinemez. Önce varyantları silin.');
        }
        const result = await this.consumableRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`ID ${id} ile malzeme bulunamadı`);
        }
    }

    async addStockWithCost(id: string, quantity: number, unitCost: number): Promise<Consumable> {
        const consumable = await this.findOne(id);

        const currentStock = Number(consumable.stockQuantity);
        const currentAvgCost = Number(consumable.averageCost);
        const addedQty = Number(quantity);
        const addedCost = Number(unitCost);

        const totalValue = (currentStock * currentAvgCost) + (addedQty * addedCost);
        const totalQty = currentStock + addedQty;

        const newAvgCost = totalQty > 0 ? totalValue / totalQty : currentAvgCost;

        consumable.stockQuantity = totalQty;
        consumable.averageCost = newAvgCost;

        return this.consumableRepository.save(consumable);
    }

    async consumeFromParent(variantId: string, variantQuantity: number): Promise<Consumable> {
        const variant = await this.findOne(variantId);
        if (!variant.parentId) {
            throw new BadRequestException('Bu malzeme bir varyant değil');
        }

        const parent = await this.findOne(variant.parentId);
        const requiredParentQty = variantQuantity * Number(variant.conversionQuantity);

        if (Number(parent.stockQuantity) < requiredParentQty) {
            throw new BadRequestException(`Yetersiz stok. Gerekli: ${requiredParentQty}, Mevcut: ${parent.stockQuantity}`);
        }

        parent.stockQuantity = Number(parent.stockQuantity) - requiredParentQty;
        await this.consumableRepository.save(parent);

        variant.stockQuantity = Number(variant.stockQuantity) + variantQuantity;
        return this.consumableRepository.save(variant);
    }

    async getVariantPotentialStock(parentId: string): Promise<{ variantId: string; variantName: string; potentialStock: number; conversionQuantity: number }[]> {
        const parent = await this.findOne(parentId);
        if (!parent.variants || parent.variants.length === 0) {
            return [];
        }

        const parentStock = Number(parent.stockQuantity);

        return parent.variants.map(variant => ({
            variantId: variant.id,
            variantName: variant.name,
            potentialStock: Number(variant.conversionQuantity) > 0
                ? Math.floor(parentStock / Number(variant.conversionQuantity))
                : 0,
            conversionQuantity: Number(variant.conversionQuantity),
        }));
    }

    async updateVariantCostsFromParent(parentId: string): Promise<void> {
        const parent = await this.findOne(parentId);
        if (!parent.variants || parent.variants.length === 0) {
            return;
        }

        const parentAvgCost = Number(parent.averageCost);

        for (const variant of parent.variants) {
            const conversionQty = Number(variant.conversionQuantity);
            if (conversionQty > 0) {
                variant.averageCost = parentAvgCost * conversionQty;
                await this.consumableRepository.save(variant);
            }
        }
    }

    async addStockWithCostAndUpdateVariants(id: string, quantity: number, unitCost: number): Promise<Consumable> {
        const consumable = await this.addStockWithCost(id, quantity, unitCost);

        if (!consumable.parentId) {
            await this.updateVariantCostsFromParent(id);
        }

        return consumable;
    }
}
