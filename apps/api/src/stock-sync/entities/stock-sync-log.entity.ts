import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Store } from '../../stores/entities/store.entity';
import { ApiLogProvider } from '../../orders/entities/order-api-log.entity';
import { SyncStatus } from '../enums/stock-sync.enum';

interface ProductDetail {
    barcode: string;
    productName: string;
    oldQuantity: number;
    newQuantity: number;
    isSetProduct: boolean;
}

@Entity('stock_sync_logs')
@Index('IDX_stock_sync_logs_batch', ['batchId'])
@Index('IDX_stock_sync_logs_store', ['storeId'])
@Index('IDX_stock_sync_logs_status', ['syncStatus'])
@Index('IDX_stock_sync_logs_created', ['createdAt'])
export class StockSyncLog extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'batch_id', type: 'uuid' })
    batchId: string;

    @Column({ name: 'store_id', type: 'uuid' })
    storeId: string;

    @ManyToOne(() => Store, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'store_id' })
    store: Store;

    @Column({
        type: 'enum',
        enum: ApiLogProvider,
    })
    provider: ApiLogProvider;

    @Column({
        name: 'sync_status',
        type: 'enum',
        enum: SyncStatus,
        default: SyncStatus.PENDING,
    })
    syncStatus: SyncStatus;

    @Column({ name: 'total_items', type: 'int', default: 0 })
    totalItems: number;

    @Column({ name: 'success_items', type: 'int', default: 0 })
    successItems: number;

    @Column({ name: 'failed_items', type: 'int', default: 0 })
    failedItems: number;

    @Column({ name: 'endpoint', type: 'varchar', length: 500, nullable: true })
    endpoint: string | null;

    @Column({ name: 'method', type: 'varchar', length: 10, nullable: true })
    method: string | null;

    @Column({ name: 'request_payload', type: 'longtext', nullable: true })
    requestPayload: string | null;

    @Column({ name: 'response_payload', type: 'longtext', nullable: true })
    responsePayload: string | null;

    @Column({ name: 'status_code', type: 'int', nullable: true })
    statusCode: number | null;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string | null;

    @Column({ name: 'duration_ms', type: 'int', nullable: true })
    durationMs: number | null;

    @Column({ name: 'batch_request_id', type: 'varchar', length: 255, nullable: true })
    batchRequestId: string | null;

    @Column({ name: 'product_details', type: 'json', nullable: true })
    productDetails: ProductDetail[] | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
