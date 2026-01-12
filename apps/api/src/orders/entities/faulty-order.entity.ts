import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Integration } from '../../integrations/entities/integration.entity';
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

    @Column({ name: 'integration_id' })
    integrationId: string;

    @ManyToOne(() => Integration, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'integration_id' })
    integration: Integration;

    @Column({ name: 'store_id', nullable: true })
    storeId: string;

    @ManyToOne(() => Store, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'store_id' })
    store: Store;

    // Unique key - same as orders table
    @Column({ name: 'package_id', unique: true })
    packageId: string;

    @Column({ name: 'order_number', nullable: true })
    orderNumber: string;

    // Original order data from integration (full JSON)
    @Column('simple-json', { name: 'raw_data' })
    rawData: object;

    // Missing product barcodes
    @Column('simple-json', { name: 'missing_barcodes' })
    missingBarcodes: string[];

    // Error reason
    @Column({
        type: 'enum',
        enum: FaultyOrderReason,
        default: FaultyOrderReason.MISSING_PRODUCTS,
        name: 'error_reason',
    })
    errorReason: FaultyOrderReason;

    // How many times we tried to process
    @Column({ name: 'retry_count', default: 0 })
    retryCount: number;

    // Customer info (for display purposes)
    @Column({ name: 'customer_name', nullable: true })
    customerName: string;

    @Column('decimal', { name: 'total_price', precision: 10, scale: 2, nullable: true })
    totalPrice: number;

    @Column({ name: 'currency_code', nullable: true, length: 10 })
    currencyCode: string;
}
