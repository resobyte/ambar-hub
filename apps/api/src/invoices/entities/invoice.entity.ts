import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Order } from '../../orders/entities/order.entity';
import { Store } from '../../stores/entities/store.entity';
import { InvoiceStatus } from '../enums/invoice-status.enum';

@Entity('invoices')
export class Invoice extends BaseEntity {
    // ─────────────────────────────────────────────────────────────
    // Relations
    // ─────────────────────────────────────────────────────────────
    @Column({ name: 'order_id' })
    orderId: string;

    @ManyToOne(() => Order)
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({ name: 'store_id', nullable: true })
    storeId: string;

    @ManyToOne(() => Store)
    @JoinColumn({ name: 'store_id' })
    store: Store;

    // ─────────────────────────────────────────────────────────────
    // Invoice Identifiers
    // ─────────────────────────────────────────────────────────────
    @Column({ name: 'invoice_number' })
    invoiceNumber: string;  // voucherNo (2026000012719)

    @Column({ name: 'invoice_serial', nullable: true })
    invoiceSerial: string;  // voucherSerial (BEA)

    @Column({ name: 'edoc_no', nullable: true })
    edocNo: string;  // e-belge no (BEA2026000012719)

    @Column({ name: 'ettn', nullable: true })
    ettn: string;  // e-fatura ETTN

    // ─────────────────────────────────────────────────────────────
    // Status
    // ─────────────────────────────────────────────────────────────
    @Column({
        type: 'enum',
        enum: InvoiceStatus,
        default: InvoiceStatus.PENDING
    })
    status: InvoiceStatus;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    // ─────────────────────────────────────────────────────────────
    // Uyumsoft Configuration
    // ─────────────────────────────────────────────────────────────
    @Column({ name: 'card_code', nullable: true })
    cardCode: string;  // TRENDYOL, HEPSIBURADA etc.

    @Column({ name: 'branch_code', nullable: true })
    branchCode: string;  // BW2025, FK2020

    @Column({ name: 'doc_tra_code', nullable: true })
    docTraCode: string;  // FTS-101, GIDPSL

    @Column({ name: 'cost_center_code', nullable: true })
    costCenterCode: string;  // BİOWORLD, FARMAKOZMETIKA

    @Column({ name: 'whouse_code', nullable: true })
    whouseCode: string;  // MERKEZ, İADE DEPO

    // ─────────────────────────────────────────────────────────────
    // Customer Info (snapshot)
    // ─────────────────────────────────────────────────────────────
    @Column({ name: 'customer_first_name', nullable: true })
    customerFirstName: string;

    @Column({ name: 'customer_last_name', nullable: true })
    customerLastName: string;

    @Column({ name: 'customer_email', nullable: true })
    customerEmail: string;

    @Column({ name: 'customer_address', type: 'text', nullable: true })
    customerAddress: string;

    // ─────────────────────────────────────────────────────────────
    // Amounts
    // ─────────────────────────────────────────────────────────────
    @Column('decimal', { name: 'total_amount', precision: 10, scale: 2 })
    totalAmount: number;

    @Column({ name: 'currency_code', default: 'TRY' })
    currencyCode: string;

    // ─────────────────────────────────────────────────────────────
    // Dates
    // ─────────────────────────────────────────────────────────────
    @Column({ name: 'invoice_date', type: 'timestamp' })
    invoiceDate: Date;

    @Column({ name: 'shipping_date', type: 'timestamp', nullable: true })
    shippingDate: Date;

    // ─────────────────────────────────────────────────────────────
    // Uyumsoft API Response (stored as JSON)
    // ─────────────────────────────────────────────────────────────
    @Column('simple-json', { name: 'request_payload', nullable: true })
    requestPayload: object;

    @Column('simple-json', { name: 'response_payload', nullable: true })
    responsePayload: object;

    @Column({ name: 'uyumsoft_invoice_id', nullable: true })
    uyumsoftInvoiceId: string;
}
