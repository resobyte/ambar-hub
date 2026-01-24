import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Store } from '../../stores/entities/store.entity';

export enum FaultyOrderReason {
    MISSING_PRODUCTS = 'MISSING_PRODUCTS',
    INVALID_DATA = 'INVALID_DATA',
    UNKNOWN = 'UNKNOWN',
}

@Entity('faulty_orders')
export class FaultyOrder extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'store_id' })
    storeId: string;

    @ManyToOne(() => Store, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'store_id' })
    store: Store;

    @Column({ name: 'package_id', unique: true })
    packageId: string;

    @Column({ name: 'order_number', nullable: true })
    orderNumber: string;

    @Column('simple-json', { name: 'raw_data' })
    rawData: object;

    @Column('simple-json', { name: 'missing_barcodes' })
    missingBarcodes: string[];

    @Column({
        type: 'enum',
        enum: FaultyOrderReason,
        default: FaultyOrderReason.MISSING_PRODUCTS,
        name: 'error_reason',
    })
    errorReason: FaultyOrderReason;

    @Column({ name: 'retry_count', default: 0 })
    retryCount: number;

    @Column({ name: 'customer_name', nullable: true })
    customerName: string;

    @Column('decimal', { name: 'total_price', precision: 10, scale: 2, nullable: true })
    totalPrice: number;

    @Column({ name: 'currency_code', nullable: true, length: 10 })
    currencyCode: string;
}
