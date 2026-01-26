import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Order } from './order.entity';

export enum ApiLogProvider {
    ARAS_KARGO = 'ARAS_KARGO',
    TRENDYOL = 'TRENDYOL',
    HEPSIBURADA = 'HEPSIBURADA',
    IKAS = 'IKAS',
    UYUMSOFT = 'UYUMSOFT',
}

export enum ApiLogType {
    SET_ORDER = 'SET_ORDER',
    GET_BARCODE = 'GET_BARCODE',
    UPDATE_STATUS = 'UPDATE_STATUS',
    GET_ORDER = 'GET_ORDER',
    CREATE_INVOICE = 'CREATE_INVOICE',
    OTHER = 'OTHER',
}

@Entity('order_api_logs')
export class OrderApiLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'order_id', type: 'char', length: 36 })
    orderId: string;

    @ManyToOne(() => Order, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({
        type: 'enum',
        enum: ApiLogProvider,
    })
    provider: ApiLogProvider;

    @Column({
        name: 'log_type',
        type: 'enum',
        enum: ApiLogType,
    })
    logType: ApiLogType;

    @Column({ type: 'varchar', length: 500, nullable: true })
    endpoint: string | null;

    @Column({ type: 'varchar', length: 10, nullable: true })
    method: string | null;

    @Column({ name: 'request_payload', type: 'longtext', nullable: true })
    requestPayload: string | null;

    @Column({ name: 'response_payload', type: 'longtext', nullable: true })
    responsePayload: string | null;

    @Column({ name: 'status_code', type: 'int', nullable: true })
    statusCode: number | null;

    @Column({ name: 'is_success', type: 'boolean', default: false })
    isSuccess: boolean;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string | null;

    @Column({ name: 'duration_ms', type: 'int', nullable: true })
    durationMs: number | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
