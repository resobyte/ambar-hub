import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum ConsumableType {
    BOX = 'BOX',
    BAG = 'BAG',
    TAPE = 'TAPE',
    LABEL = 'LABEL',
    OTHER = 'OTHER',
}

export enum ConsumableUnit {
    COUNT = 'COUNT',
    METER = 'METER',
    KILOGRAM = 'KILOGRAM',
}

@Entity('consumables')
export class Consumable extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
    sku: string | null;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
    barcode: string | null;

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

    @Column({ name: 'parent_id', type: 'varchar', length: 36, nullable: true })
    parentId: string | null;

    @ManyToOne(() => Consumable, (consumable) => consumable.variants, { nullable: true })
    @JoinColumn({ name: 'parent_id' })
    parent: Consumable | null;

    @OneToMany(() => Consumable, (consumable) => consumable.parent)
    variants: Consumable[];

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 1, name: 'conversion_quantity' })
    conversionQuantity: number;
}
