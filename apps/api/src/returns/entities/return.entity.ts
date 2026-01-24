import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { Store } from '../../stores/entities/store.entity';
import { Order } from '../../orders/entities/order.entity';
import { ReturnItem } from './return-item.entity';
import { ReturnStatus, ReturnShelfType } from '../enums/return-status.enum';

@Entity('returns')
export class Return {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Trendyol claim ID
    @Column({ name: 'claim_id', unique: true })
    claimId: string;

    @Column({ name: 'order_number' })
    orderNumber: string;

    @Column({ name: 'order_date', type: 'timestamp', nullable: true })
    orderDate: Date | null;

    @Column({ name: 'claim_date', type: 'timestamp' })
    claimDate: Date;

    // Müşteri bilgileri
    @Column({ name: 'customer_first_name', nullable: true })
    customerFirstName: string;

    @Column({ name: 'customer_last_name', nullable: true })
    customerLastName: string;

    // Kargo bilgileri
    @Column({ name: 'cargo_tracking_number', nullable: true })
    cargoTrackingNumber: string;

    @Column({ name: 'cargo_tracking_link', nullable: true, type: 'text' })
    cargoTrackingLink: string;

    @Column({ name: 'cargo_sender_number', nullable: true })
    cargoSenderNumber: string;

    @Column({ name: 'cargo_provider_name', nullable: true })
    cargoProviderName: string;

    // Trendyol paket ID'leri
    @Column({ name: 'order_shipment_package_id', nullable: true })
    orderShipmentPackageId: string;

    @Column({ name: 'order_outbound_package_id', nullable: true })
    orderOutboundPackageId: string;

    // Status
    @Column({
        name: 'status',
        type: 'enum',
        enum: ReturnStatus,
        default: ReturnStatus.CREATED
    })
    status: ReturnStatus;

    // Trendyol'dan gelen orijinal status
    @Column({ name: 'integration_status', nullable: true })
    integrationStatus: string;

    // İade işlemi tamamlandığında
    @Column({
        name: 'shelf_type',
        type: 'enum',
        enum: ReturnShelfType,
        nullable: true
    })
    shelfType: ReturnShelfType;

    @Column({ name: 'processed_shelf_id', nullable: true })
    processedShelfId: string;

    @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
    processedAt: Date;

    @Column({ name: 'processed_by_user_id', nullable: true })
    processedByUserId: string;

    @Column({ name: 'process_notes', type: 'text', nullable: true })
    processNotes: string;

    // Rejected package info (JSON)
    @Column({ name: 'rejected_package_info', type: 'json', nullable: true })
    rejectedPackageInfo: any;

    // Replacement outbound package info (JSON)
    @Column({ name: 'replacement_outbound_package_info', type: 'json', nullable: true })
    replacementOutboundPackageInfo: any;

    @Column({ name: 'last_modified_date', type: 'timestamp', nullable: true })
    lastModifiedDate: Date | null;

    // Relations
    @Column({ name: 'store_id' })
    storeId: string;

    @ManyToOne(() => Store)
    @JoinColumn({ name: 'store_id' })
    store: Store;

    @Column({ name: 'order_id', nullable: true })
    orderId: string | null;

    @ManyToOne(() => Order, { nullable: true })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @OneToMany(() => ReturnItem, item => item.return, { cascade: true })
    items: ReturnItem[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
