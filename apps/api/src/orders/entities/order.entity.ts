import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Integration } from '../../integrations/entities/integration.entity';
import { Store } from '../../stores/entities/store.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../enums/order-status.enum';

@Entity('orders')
export class Order extends BaseEntity {
    // ─────────────────────────────────────────────────────────────
    // Identifiers
    // ─────────────────────────────────────────────────────────────
    @Column({ name: 'order_number' })
    orderNumber: string;

    @Column({ name: 'package_id', unique: true })
    packageId: string;

    @Column({ name: 'integration_id' })
    integrationId: string;

    @ManyToOne(() => Integration)
    @JoinColumn({ name: 'integration_id' })
    integration: Integration;

    @Column({ name: 'customer_id' })
    customerId: string;

    @ManyToOne(() => Customer, (customer) => customer.orders)
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;

    @Column({ name: 'store_id', nullable: true })
    storeId: string;

    @ManyToOne(() => Store)
    @JoinColumn({ name: 'store_id' })
    store: Store;

    // ─────────────────────────────────────────────────────────────
    // Status
    // ─────────────────────────────────────────────────────────────
    @Column({
        type: 'enum',
        enum: OrderStatus,
        default: OrderStatus.CREATED
    })
    status: OrderStatus;

    @Column({ name: 'integration_status', nullable: true })
    integrationStatus: string;

    // ─────────────────────────────────────────────────────────────
    // Pricing & Discounts
    // ─────────────────────────────────────────────────────────────
    @Column('decimal', { name: 'total_price', precision: 10, scale: 2 })
    totalPrice: number;

    @Column('decimal', { name: 'gross_amount', precision: 10, scale: 2, nullable: true })
    grossAmount: number;

    @Column('decimal', { name: 'total_discount', precision: 10, scale: 2, nullable: true, default: 0 })
    totalDiscount: number;

    @Column('decimal', { name: 'seller_discount', precision: 10, scale: 2, nullable: true, default: 0 })
    sellerDiscount: number;

    @Column('decimal', { name: 'ty_discount', precision: 10, scale: 2, nullable: true, default: 0 })
    tyDiscount: number;

    @Column({ name: 'currency_code', nullable: true, length: 10 })
    currencyCode: string;

    // ─────────────────────────────────────────────────────────────
    // Dates
    // ─────────────────────────────────────────────────────────────
    @Column({ name: 'order_date', type: 'timestamp' })
    orderDate: Date;

    @Column({ name: 'estimated_delivery_start', type: 'timestamp', nullable: true })
    estimatedDeliveryStart: Date;

    @Column({ name: 'estimated_delivery_end', type: 'timestamp', nullable: true })
    estimatedDeliveryEnd: Date;

    @Column({ name: 'agreed_delivery_date', type: 'timestamp', nullable: true })
    agreedDeliveryDate: Date;

    @Column({ name: 'last_modified_date', type: 'timestamp', nullable: true })
    lastModifiedDate: Date;

    // ─────────────────────────────────────────────────────────────
    // Cargo & Shipping
    // ─────────────────────────────────────────────────────────────
    @Column({ name: 'cargo_tracking_number', nullable: true })
    cargoTrackingNumber: string;

    @Column({ name: 'cargo_tracking_link', nullable: true })
    cargoTrackingLink: string;

    @Column({ name: 'cargo_label_zpl', type: 'text', nullable: true })
    cargoLabelZpl: string;

    @Column({ name: 'cargo_sender_number', nullable: true })
    cargoSenderNumber: string;

    @Column({ name: 'cargo_provider_name', nullable: true })
    cargoProviderName: string;

    @Column({ name: 'delivery_type', nullable: true })
    deliveryType: string;

    @Column({ name: 'fast_delivery', default: false })
    fastDelivery: boolean;

    @Column({ name: 'who_pays', nullable: true })
    whoPays: number;

    // ─────────────────────────────────────────────────────────────
    // Addresses (stored as JSON)
    // ─────────────────────────────────────────────────────────────
    @Column('simple-json', { name: 'shipping_address', nullable: true })
    shippingAddress: object;

    @Column('simple-json', { name: 'invoice_address', nullable: true })
    invoiceAddress: object;

    // ─────────────────────────────────────────────────────────────
    // Invoice & Tax
    // ─────────────────────────────────────────────────────────────
    @Column({ name: 'invoice_link', nullable: true })
    invoiceLink: string;

    @Column({ name: 'tax_number', nullable: true })
    taxNumber: string;

    @Column({ name: 'commercial', default: false })
    commercial: boolean;

    // ─────────────────────────────────────────────────────────────
    // Micro Export (Mikro İhracat)
    // ─────────────────────────────────────────────────────────────
    @Column({ name: 'micro', default: false })
    micro: boolean;

    @Column({ name: 'etgb_no', nullable: true })
    etgbNo: string;

    @Column({ name: 'etgb_date', type: 'timestamp', nullable: true })
    etgbDate: Date;

    @Column({ name: 'hs_code', nullable: true })
    hsCode: string;

    @Column({ name: 'contains_dangerous_product', default: false })
    containsDangerousProduct: boolean;

    // ─────────────────────────────────────────────────────────────
    // Warehouse & Fulfillment
    // ─────────────────────────────────────────────────────────────
    @Column({ name: 'warehouse_id', nullable: true })
    warehouseId: string;

    @Column({ name: 'gift_box_requested', default: false })
    giftBoxRequested: boolean;

    @Column({ name: 'three_p_by_trendyol', default: false })
    threePByTrendyol: boolean;

    @Column({ name: 'delivered_by_service', default: false })
    deliveredByService: boolean;

    @Column('decimal', { name: 'cargo_deci', precision: 10, scale: 2, nullable: true })
    cargoDeci: number;

    @Column({ name: 'is_cod', default: false })
    isCod: boolean;

    @Column({ name: 'created_by', nullable: true })
    createdBy: string;

    @Column('simple-json', { name: 'origin_package_ids', nullable: true })
    originPackageIds: string[];

    // ─────────────────────────────────────────────────────────────
    // Package History (stored as JSON)
    // ─────────────────────────────────────────────────────────────
    @Column('simple-json', { name: 'package_histories', nullable: true })
    packageHistories: object[];

    // ─────────────────────────────────────────────────────────────
    // Items Relation
    // ─────────────────────────────────────────────────────────────
    @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
    items: OrderItem[];
}
