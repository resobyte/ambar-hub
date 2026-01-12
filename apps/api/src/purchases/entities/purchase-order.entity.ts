import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { PurchaseOrderStatus } from '../enums/purchase-order-status.enum';

@Entity('purchase_orders')
export class PurchaseOrder extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'order_number', unique: true, length: 50 })
    orderNumber: string;

    @Column({ name: 'supplier_id', nullable: true })
    supplierId: string | null;

    @ManyToOne(() => Supplier, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'supplier_id' })
    supplier: Supplier;

    @Column({
        type: 'enum',
        enum: PurchaseOrderStatus,
        default: PurchaseOrderStatus.DRAFT,
    })
    status: PurchaseOrderStatus;

    @Column('decimal', { name: 'total_amount', precision: 12, scale: 2, default: 0 })
    totalAmount: number;

    @Column({ name: 'order_date', type: 'date' })
    orderDate: Date;

    @Column({ name: 'expected_date', type: 'date', nullable: true })
    expectedDate: Date;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @OneToMany('PurchaseOrderItem', 'purchaseOrder', { cascade: true })
    items: any[];

    @OneToMany('GoodsReceipt', 'purchaseOrder')
    goodsReceipts: any[];
}
