import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Order } from '../../orders/entities/order.entity';
import { Store } from '../../stores/entities/store.entity';

export enum WaybillType {
    DISPATCH = 'DISPATCH',
    RETURN = 'RETURN',
}

export enum WaybillStatus {
    CREATED = 'CREATED',
    PRINTED = 'PRINTED',
    CANCELLED = 'CANCELLED',
}

@Entity('waybills')
export class Waybill extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'waybill_number', unique: true })
    waybillNumber: string;

    @Column({ name: 'order_id', nullable: true })
    orderId: string;

    @ManyToOne(() => Order, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({ name: 'store_id', nullable: true })
    storeId: string;

    @ManyToOne(() => Store, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'store_id' })
    store: Store;

    @Column({
        type: 'enum',
        enum: WaybillType,
        default: WaybillType.DISPATCH,
    })
    type: WaybillType;

    @Column({
        type: 'enum',
        enum: WaybillStatus,
        default: WaybillStatus.CREATED,
    })
    status: WaybillStatus;

    @Column({ name: 'html_content', type: 'text', nullable: true })
    htmlContent: string;

    @Column({ name: 'pdf_path', nullable: true })
    pdfPath: string;

    @Column({ name: 'customer_name', nullable: true })
    customerName: string;

    @Column({ name: 'customer_address', type: 'text', nullable: true })
    customerAddress: string;

    @Column({ name: 'customer_phone', nullable: true })
    customerPhone: string;

    @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
    totalAmount: number;

    @Column({ name: 'currency_code', default: 'TRY' })
    currencyCode: string;

    @Column({ name: 'notes', type: 'text', nullable: true })
    notes: string;

    @Column({ name: 'printed_at', type: 'timestamp', nullable: true })
    printedAt: Date;

    @Column({ name: 'printed_by', type: 'varchar', length: 36, nullable: true })
    printedBy: string | null;
}
