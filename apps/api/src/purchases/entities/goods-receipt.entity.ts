import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { User } from '../../users/entities/user.entity';
import { GoodsReceiptStatus } from '../enums/goods-receipt-status.enum';
import { GoodsReceiptItem } from './goods-receipt-item.entity';

@Entity('goods_receipts')
export class GoodsReceipt extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'receipt_number', unique: true, length: 50 })
    receiptNumber: string;

    @Column({ name: 'purchase_order_id' })
    purchaseOrderId: string;

    @ManyToOne(() => PurchaseOrder, (po) => po.goodsReceipts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'purchase_order_id' })
    purchaseOrder: PurchaseOrder;

    @Column({ name: 'received_by_user_id', nullable: true })
    receivedByUserId: string;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'received_by_user_id' })
    receivedByUser: User;

    @Column({
        type: 'enum',
        enum: GoodsReceiptStatus,
        default: GoodsReceiptStatus.PENDING,
    })
    status: GoodsReceiptStatus;

    @Column({ name: 'receipt_date', type: 'datetime' })
    receiptDate: Date;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @OneToMany(() => GoodsReceiptItem, (item) => item.goodsReceipt, { cascade: true })
    items: GoodsReceiptItem[];
}
