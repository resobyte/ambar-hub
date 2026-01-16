import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum PackingMaterialType {
    BOX = 'BOX',
    ENVELOPE = 'ENVELOPE',
    TAPE = 'TAPE',
    BUBBLE_WRAP = 'BUBBLE_WRAP',
    OTHER = 'OTHER'
}

@Entity('packing_materials')
export class PackingMaterial extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({
        type: 'enum',
        enum: PackingMaterialType,
        default: PackingMaterialType.BOX
    })
    type: PackingMaterialType;

    @Column({ type: 'int', default: 0, name: 'stock_quantity' })
    stockQuantity: number;

    @Column({ type: 'int', default: 0, name: 'low_stock_threshold' })
    lowStockThreshold: number;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;
}
