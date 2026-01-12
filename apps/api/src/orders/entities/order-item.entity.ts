import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem extends BaseEntity {
    @Column({ name: 'order_id' })
    orderId: string;

    @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    // ─────────────────────────────────────────────────────────────
    // Identifiers
    // ─────────────────────────────────────────────────────────────
    @Column({ name: 'line_id', nullable: true })
    lineId: string;

    @Column({ name: 'product_name' })
    productName: string;

    @Column({ nullable: true })
    sku: string;

    @Column({ name: 'merchant_sku', nullable: true })
    merchantSku: string;

    @Column({ name: 'stock_code', nullable: true })
    stockCode: string;

    @Column({ nullable: true })
    barcode: string;

    @Column({ name: 'product_code', nullable: true })
    productCode: string;

    @Column({ name: 'content_id', nullable: true })
    contentId: string;

    // ─────────────────────────────────────────────────────────────
    // Product Details
    // ─────────────────────────────────────────────────────────────
    @Column({ name: 'product_color', nullable: true })
    productColor: string;

    @Column({ name: 'product_size', nullable: true })
    productSize: string;

    @Column({ name: 'product_origin', nullable: true })
    productOrigin: string;

    @Column({ name: 'product_category_id', nullable: true })
    productCategoryId: number;

    // ─────────────────────────────────────────────────────────────
    // Quantity & Pricing
    // ─────────────────────────────────────────────────────────────
    @Column('int')
    quantity: number;

    @Column('decimal', { name: 'unit_price', precision: 10, scale: 2 })
    unitPrice: number;

    @Column('decimal', { name: 'gross_amount', precision: 10, scale: 2, nullable: true })
    grossAmount: number;

    @Column('decimal', { name: 'discount', precision: 10, scale: 2, nullable: true, default: 0 })
    discount: number;

    @Column('decimal', { name: 'seller_discount', precision: 10, scale: 2, nullable: true, default: 0 })
    sellerDiscount: number;

    @Column('decimal', { name: 'ty_discount', precision: 10, scale: 2, nullable: true, default: 0 })
    tyDiscount: number;

    @Column({ name: 'currency_code', nullable: true, length: 10 })
    currencyCode: string;

    // ─────────────────────────────────────────────────────────────
    // Tax & Commission
    // ─────────────────────────────────────────────────────────────
    @Column('decimal', { name: 'vat_base_amount', precision: 10, scale: 2, nullable: true })
    vatBaseAmount: number;

    @Column('decimal', { name: 'vat_rate', precision: 5, scale: 2, nullable: true })
    vatRate: number;

    @Column('decimal', { name: 'commission', precision: 5, scale: 2, nullable: true })
    commission: number;

    // ─────────────────────────────────────────────────────────────
    // Status & Campaign
    // ─────────────────────────────────────────────────────────────
    @Column({ name: 'order_line_item_status', nullable: true })
    orderLineItemStatus: string;

    @Column({ name: 'sales_campaign_id', nullable: true })
    salesCampaignId: number;

    // ─────────────────────────────────────────────────────────────
    // Cancellation
    // ─────────────────────────────────────────────────────────────
    @Column({ name: 'cancelled_by', nullable: true })
    cancelledBy: string;

    @Column({ name: 'cancel_reason', nullable: true })
    cancelReason: string;

    @Column({ name: 'cancel_reason_code', nullable: true })
    cancelReasonCode: string;

    // ─────────────────────────────────────────────────────────────
    // Discount Details (stored as JSON)
    // ─────────────────────────────────────────────────────────────
    @Column('simple-json', { name: 'discount_details', nullable: true })
    discountDetails: object[];

    // ─────────────────────────────────────────────────────────────
    // Fast Delivery Options (stored as JSON)
    // ─────────────────────────────────────────────────────────────
    @Column('simple-json', { name: 'fast_delivery_options', nullable: true })
    fastDeliveryOptions: object[];

    // ─────────────────────────────────────────────────────────────
    // SET Product Tracking
    // ─────────────────────────────────────────────────────────────
    // If this item was expanded from a SET product, this is the SET product ID
    @Column({ name: 'set_product_id', nullable: true })
    setProductId: string;

    // True if this item is a component from a SET (expanded)
    @Column({ name: 'is_set_component', default: false })
    isSetComponent: boolean;

    // Original SET barcode (for reference)
    @Column({ name: 'set_barcode', nullable: true })
    setBarcode: string;
}
