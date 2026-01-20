import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consumable } from './entities/consumable.entity';
import { CreateConsumableDto, UpdateConsumableDto } from './dto/create-consumable.dto';

@Injectable()
export class ConsumablesService {
    constructor(
        @InjectRepository(Consumable)
        private readonly consumableRepository: Repository<Consumable>,
    ) { }

    async create(createConsumableDto: CreateConsumableDto): Promise<Consumable> {
        const existing = await this.consumableRepository.findOne({ where: { sku: createConsumableDto.sku } });
        if (existing) {
            throw new BadRequestException('Consumable with this SKU already exists');
        }

        const consumable = this.consumableRepository.create(createConsumableDto);
        return this.consumableRepository.save(consumable);
    }

    async findAll(): Promise<Consumable[]> {
        return this.consumableRepository.find({ order: { name: 'ASC' } });
    }

    async findOne(id: string): Promise<Consumable> {
        const consumable = await this.consumableRepository.findOne({ where: { id } });
        if (!consumable) {
            throw new NotFoundException(`Consumable with ID ${id} not found`);
        }
        return consumable;
    }

    async update(id: string, updateConsumableDto: UpdateConsumableDto): Promise<Consumable> {
        const consumable = await this.findOne(id);

        if (updateConsumableDto.sku && updateConsumableDto.sku !== consumable.sku) {
            const existing = await this.consumableRepository.findOne({ where: { sku: updateConsumableDto.sku } });
            if (existing) {
                throw new BadRequestException('Consumable with this SKU already exists');
            }
        }

        Object.assign(consumable, updateConsumableDto);
        return this.consumableRepository.save(consumable);
    }

    async remove(id: string): Promise<void> {
        const result = await this.consumableRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Consumable with ID ${id} not found`);
        }
    }

    // Cost Calculation Logic
    // Called when receiving goods
    async addStockWithCost(id: string, quantity: number, unitCost: number): Promise<Consumable> {
        const consumable = await this.findOne(id);

        const currentStock = Number(consumable.stockQuantity);
        const currentAvgCost = Number(consumable.averageCost);
        const addedQty = Number(quantity);
        const addedCost = Number(unitCost);

        const totalValue = (currentStock * currentAvgCost) + (addedQty * addedCost);
        const totalQty = currentStock + addedQty;

        // Avoid division by zero, though strictly speaking totalQty shouldn't be 0 if we added +ve stuff
        // But if we support negative adjustments, handle carefully. Here we assume receiving is positive.
        const newAvgCost = totalQty > 0 ? totalValue / totalQty : currentAvgCost;

        consumable.stockQuantity = totalQty;
        consumable.averageCost = newAvgCost;

        return this.consumableRepository.save(consumable);
    }
}
