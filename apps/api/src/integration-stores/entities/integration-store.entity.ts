import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Integration } from '../../integrations/entities/integration.entity';
import { Store } from '../../stores/entities/store.entity';
import { ShippingProvider } from '../../shipping-providers/entities/shipping-provider.entity';

@Entity('integration_stores')
@Unique(['integrationId', 'storeId'])
export class IntegrationStore extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'integration_id', type: 'uuid' })
  integrationId: string;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId: string;

  @Column({ name: 'shipping_provider_id', type: 'uuid', nullable: true })
  shippingProviderId: string;

  // Store-specific credentials
  @Column({ name: 'seller_id', type: 'varchar', length: 255 })
  sellerId: string;

  @Column({ name: 'api_key', type: 'varchar', length: 500 })
  apiKey: string;

  @Column({ name: 'api_secret', type: 'varchar', length: 500 })
  apiSecret: string;

  // Store-specific settings
  @Column({ name: 'crawl_interval_minutes', type: 'int', default: 60 })
  crawlIntervalMinutes: number;

  @Column({ name: 'send_stock', default: true })
  sendStock: boolean;

  @Column({ name: 'send_price', default: true })
  sendPrice: boolean;

  @Column({ name: 'send_order_status', default: true })
  sendOrderStatus: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Company Configuration
  @Column({ name: 'brand_code', type: 'varchar', length: 50, nullable: true })
  brandCode: string;

  @Column({ name: 'company_code', type: 'varchar', length: 50, nullable: true })
  companyCode: string;

  @Column({ name: 'branch_code', type: 'varchar', length: 50, nullable: true })
  branchCode: string;

  @Column({ name: 'co_code', type: 'varchar', length: 50, nullable: true })
  coCode: string;

  // =============================================
  // Fatura Ayarları (Invoice Settings)
  // =============================================

  // Genel Fatura Ayarları
  @Column({ name: 'invoice_transaction_code', type: 'varchar', length: 50, nullable: true })
  invoiceTransactionCode: string;

  @Column({ name: 'has_micro_export', type: 'boolean', default: false })
  hasMicroExport: boolean;

  // E-Arşiv Ayarları
  @Column({ name: 'e_archive_bulk_customer', type: 'boolean', default: false })
  eArchiveBulkCustomer: boolean;

  @Column({ name: 'e_archive_card_code', type: 'varchar', length: 100, nullable: true })
  eArchiveCardCode: string;

  @Column({ name: 'e_archive_account_code', type: 'varchar', length: 100, nullable: true })
  eArchiveAccountCode: string;

  @Column({ name: 'e_archive_serial_no', type: 'varchar', length: 50, nullable: true })
  eArchiveSerialNo: string;

  @Column({ name: 'e_archive_sequence_no', type: 'varchar', length: 50, nullable: true })
  eArchiveSequenceNo: string;

  @Column({ name: 'e_archive_havale_card_code', type: 'varchar', length: 100, nullable: true })
  eArchiveHavaleCardCode: string;

  @Column({ name: 'e_archive_havale_account_code', type: 'varchar', length: 100, nullable: true })
  eArchiveHavaleAccountCode: string;

  // E-Fatura Ayarları
  @Column({ name: 'e_invoice_bulk_customer', type: 'boolean', default: false })
  eInvoiceBulkCustomer: boolean;

  @Column({ name: 'e_invoice_card_code', type: 'varchar', length: 100, nullable: true })
  eInvoiceCardCode: string;

  @Column({ name: 'e_invoice_account_code', type: 'varchar', length: 100, nullable: true })
  eInvoiceAccountCode: string;

  @Column({ name: 'e_invoice_serial_no', type: 'varchar', length: 50, nullable: true })
  eInvoiceSerialNo: string;

  @Column({ name: 'e_invoice_sequence_no', type: 'varchar', length: 50, nullable: true })
  eInvoiceSequenceNo: string;

  @Column({ name: 'e_invoice_havale_account_code', type: 'varchar', length: 100, nullable: true })
  eInvoiceHavaleAccountCode: string;

  // Toplu Faturalama Ayarları
  @Column({ name: 'bulk_e_archive_serial_no', type: 'varchar', length: 50, nullable: true })
  bulkEArchiveSerialNo: string;

  @Column({ name: 'bulk_e_archive_sequence_no', type: 'varchar', length: 50, nullable: true })
  bulkEArchiveSequenceNo: string;

  @Column({ name: 'bulk_e_invoice_serial_no', type: 'varchar', length: 50, nullable: true })
  bulkEInvoiceSerialNo: string;

  @Column({ name: 'bulk_e_invoice_sequence_no', type: 'varchar', length: 50, nullable: true })
  bulkEInvoiceSequenceNo: string;

  // İade Gider Pusulası Ayarları
  @Column({ name: 'refund_ev_e_archive_serial_no', type: 'varchar', length: 50, nullable: true })
  refundExpenseVoucherEArchiveSerialNo: string;

  @Column({ name: 'refund_ev_e_archive_sequence_no', type: 'varchar', length: 50, nullable: true })
  refundExpenseVoucherEArchiveSequenceNo: string;

  @Column({ name: 'refund_ev_e_invoice_serial_no', type: 'varchar', length: 50, nullable: true })
  refundExpenseVoucherEInvoiceSerialNo: string;

  @Column({ name: 'refund_ev_e_invoice_sequence_no', type: 'varchar', length: 50, nullable: true })
  refundExpenseVoucherEInvoiceSequenceNo: string;


  // Mikro İhracat Ayarları
  @Column({ name: 'micro_export_transaction_code', type: 'varchar', length: 50, nullable: true })
  microExportTransactionCode: string;

  @Column({ name: 'micro_export_account_code', type: 'varchar', length: 100, nullable: true })
  microExportAccountCode: string;

  @Column({ name: 'micro_export_az_account_code', type: 'varchar', length: 100, nullable: true })
  microExportAzAccountCode: string;

  @Column({ name: 'micro_export_e_archive_serial_no', type: 'varchar', length: 50, nullable: true })
  microExportEArchiveSerialNo: string;

  @Column({ name: 'micro_export_e_archive_sequence_no', type: 'varchar', length: 50, nullable: true })
  microExportEArchiveSequenceNo: string;

  @Column({ name: 'micro_export_bulk_serial_no', type: 'varchar', length: 50, nullable: true })
  microExportBulkSerialNo: string;

  @Column({ name: 'micro_export_bulk_sequence_no', type: 'varchar', length: 50, nullable: true })
  microExportBulkSequenceNo: string;

  @Column({ name: 'micro_export_refund_serial_no', type: 'varchar', length: 50, nullable: true })
  microExportRefundSerialNo: string;

  @Column({ name: 'micro_export_refund_sequence_no', type: 'varchar', length: 50, nullable: true })
  microExportRefundSequenceNo: string;

  @ManyToOne(() => Integration, (integration) => integration.integrationStores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'integration_id' })
  integration: Integration;

  @ManyToOne(() => Store, (store) => store.integrationStores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => ShippingProvider, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'shipping_provider_id' })
  shippingProvider: ShippingProvider;
}
