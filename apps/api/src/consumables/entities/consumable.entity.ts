import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum ConsumableType {
    BOX = 'BOX',
    BAG = 'BAG',
}

export enum ConsumableUnit {
    COUNT = 'COUNT',
    METER = 'METER',
}

@Entity('consumables')
export class Consumable extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ unique: true })
    sku: string;

    @Column({
        type: 'enum',
        enum: ConsumableType,
        default: ConsumableType.BOX,
    })
    type: ConsumableType;

    @Column({
        type: 'enum',
        enum: ConsumableUnit,
        default: ConsumableUnit.COUNT,
    })
    unit: ConsumableUnit;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'stock_quantity' })
    stockQuantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'average_cost' })
    averageCost: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'min_stock_level' })
    minStockLevel: number;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;
}
