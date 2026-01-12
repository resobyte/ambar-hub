import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn, Tree, TreeParent, TreeChildren } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Warehouse } from '../../warehouses/entities/warehouse.entity';
import { ShelfType } from '../enums/shelf-type.enum';

@Entity('shelves')
@Tree('materialized-path')
export class Shelf extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    name: string;

    @Column({ unique: true, length: 100 })
    barcode: string;

    @Column({
        type: 'enum',
        enum: ShelfType,
        default: ShelfType.NORMAL,
    })
    type: ShelfType;

    @Column({ name: 'warehouse_id' })
    warehouseId: string;

    @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'warehouse_id' })
    warehouse: Warehouse;

    @Column({ name: 'parent_id', nullable: true })
    parentId: string | null;

    @TreeParent()
    @JoinColumn({ name: 'parent_id' })
    parent: Shelf | null;

    @TreeChildren()
    children: Shelf[];

    // Hierarchical path: /warehouse/zone/aisle/shelf
    @Column({ length: 1000, nullable: true })
    path: string;

    // Global slot number for the shelf (should be unique, set manually)
    @Column({ name: 'global_slot', type: 'int', nullable: true })
    globalSlot: number | null;

    // Whether products on this shelf can be sold
    @Column({ name: 'is_sellable', default: true })
    isSellable: boolean;

    // Whether this shelf can be reserved
    @Column({ name: 'is_reservable', default: true })
    isReservable: boolean;

    // Sort order within parent
    @Column({ name: 'sort_order', type: 'int', default: 0 })
    sortOrder: number;

    // Shelf stocks relation (products stored on this shelf)
    @OneToMany('ShelfStock', 'shelf')
    stocks: any[];
}
