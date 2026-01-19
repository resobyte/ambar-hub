import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { PurchaseOrderStatus } from '../enums/purchase-order-status.enum';
import { PurchaseOrderType } from '../enums/purchase-order-type.enum';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { GoodsReceipt } from './goods-receipt.entity';

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

    @Column({
        type: 'enum',
        enum: PurchaseOrderType,
        default: PurchaseOrderType.MANUAL,
    })
    type: PurchaseOrderType;

    @Column({ name: 'invoice_number', nullable: true, length: 50 })
    invoiceNumber: string;

    @Column('decimal', { name: 'total_amount', precision: 12, scale: 2, default: 0 })
    totalAmount: number;

    @Column({ name: 'order_date', type: 'date' })
    orderDate: Date;

    @Column({ name: 'expected_date', type: 'date', nullable: true })
    expectedDate: Date;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, { cascade: true })
    items: PurchaseOrderItem[];

    @OneToMany(() => GoodsReceipt, (receipt) => receipt.purchaseOrder)
    goodsReceipts: GoodsReceipt[];
}
