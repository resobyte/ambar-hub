import { IntegrationStore } from '../entities/integration-store.entity';

export class IntegrationStoreResponseDto {
  id: string;
  integrationId: string;
  storeId: string;
  shippingProviderId: string | null;
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  crawlIntervalMinutes: number;
  sendStock: boolean;
  sendPrice: boolean;
  sendOrderStatus: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  storeName?: string;
  integrationName?: string;

  // Company Configuration
  brandCode?: string;
  companyCode?: string;
  branchCode?: string;
  coCode?: string;

  // Fatura Ayarları (Invoice Settings)
  invoiceTransactionCode?: string;
  hasMicroExport?: boolean;

  // E-Arşiv Ayarları
  eArchiveBulkCustomer?: boolean;
  eArchiveCardCode?: string;
  eArchiveHavaleCardCode?: string;
  eArchiveAccountCode?: string;
  eArchiveHavaleAccountCode?: string;
  eArchiveSerialNo?: string;
  eArchiveSequenceNo?: string;

  // E-Fatura Ayarları
  eInvoiceBulkCustomer?: boolean;
  eInvoiceCardCode?: string;
  eInvoiceAccountCode?: string;
  eInvoiceHavaleAccountCode?: string;
  eInvoiceSerialNo?: string;
  eInvoiceSequenceNo?: string;

  // Toplu Faturalama Ayarları
  bulkEArchiveSerialNo?: string;
  bulkEArchiveSequenceNo?: string;
  bulkEInvoiceSerialNo?: string;
  bulkEInvoiceSequenceNo?: string;

  // İade Gider Pusulası Ayarları
  refundExpenseVoucherEArchiveSerialNo?: string;
  refundExpenseVoucherEArchiveSequenceNo?: string;
  refundExpenseVoucherEInvoiceSerialNo?: string;
  refundExpenseVoucherEInvoiceSequenceNo?: string;

  // Mikro İhracat Ayarları
  microExportTransactionCode?: string;
  microExportAccountCode?: string;
  microExportAzAccountCode?: string;
  microExportEArchiveSerialNo?: string;
  microExportEArchiveSequenceNo?: string;
  microExportBulkSerialNo?: string;
  microExportBulkSequenceNo?: string;
  microExportRefundSerialNo?: string;
  microExportRefundSequenceNo?: string;

  static fromEntity(
    entity: IntegrationStore,
    storeName?: string,
    integrationName?: string,
  ): IntegrationStoreResponseDto {
    const dto = new IntegrationStoreResponseDto();
    dto.id = entity.id;
    dto.integrationId = entity.integrationId;
    dto.storeId = entity.storeId;
    dto.shippingProviderId = entity.shippingProviderId;
    dto.sellerId = entity.sellerId;
    dto.apiKey = entity.apiKey;
    dto.apiSecret = entity.apiSecret;
    dto.crawlIntervalMinutes = entity.crawlIntervalMinutes;
    dto.sendStock = entity.sendStock;
    dto.sendPrice = entity.sendPrice;
    dto.sendOrderStatus = entity.sendOrderStatus;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.storeName = storeName || entity.store?.name;
    dto.integrationName = integrationName || entity.integration?.name;

    // Company Configuration
    dto.brandCode = entity.brandCode;
    dto.companyCode = entity.companyCode;
    dto.branchCode = entity.branchCode;
    dto.coCode = entity.coCode;

    // Fatura Ayarları
    dto.invoiceTransactionCode = entity.invoiceTransactionCode;
    dto.hasMicroExport = entity.hasMicroExport;

    // E-Arşiv Ayarları
    dto.eArchiveBulkCustomer = entity.eArchiveBulkCustomer;
    dto.eArchiveCardCode = entity.eArchiveCardCode;
    dto.eArchiveHavaleCardCode = entity.eArchiveHavaleCardCode;
    dto.eArchiveAccountCode = entity.eArchiveAccountCode;
    dto.eArchiveHavaleAccountCode = entity.eArchiveHavaleAccountCode;
    dto.eArchiveSerialNo = entity.eArchiveSerialNo;
    dto.eArchiveSequenceNo = entity.eArchiveSequenceNo;

    // E-Fatura Ayarları
    dto.eInvoiceBulkCustomer = entity.eInvoiceBulkCustomer;
    dto.eInvoiceCardCode = entity.eInvoiceCardCode;
    dto.eInvoiceAccountCode = entity.eInvoiceAccountCode;
    dto.eInvoiceHavaleAccountCode = entity.eInvoiceHavaleAccountCode;
    dto.eInvoiceSerialNo = entity.eInvoiceSerialNo;
    dto.eInvoiceSequenceNo = entity.eInvoiceSequenceNo;

    // Toplu Faturalama Ayarları
    dto.bulkEArchiveSerialNo = entity.bulkEArchiveSerialNo;
    dto.bulkEArchiveSequenceNo = entity.bulkEArchiveSequenceNo;
    dto.bulkEInvoiceSerialNo = entity.bulkEInvoiceSerialNo;
    dto.bulkEInvoiceSequenceNo = entity.bulkEInvoiceSequenceNo;

    // İade Gider Pusulası Ayarları
    dto.refundExpenseVoucherEArchiveSerialNo = entity.refundExpenseVoucherEArchiveSerialNo;
    dto.refundExpenseVoucherEArchiveSequenceNo = entity.refundExpenseVoucherEArchiveSequenceNo;
    dto.refundExpenseVoucherEInvoiceSerialNo = entity.refundExpenseVoucherEInvoiceSerialNo;
    dto.refundExpenseVoucherEInvoiceSequenceNo = entity.refundExpenseVoucherEInvoiceSequenceNo;

    // Mikro İhracat Ayarları
    dto.microExportTransactionCode = entity.microExportTransactionCode;
    dto.microExportAccountCode = entity.microExportAccountCode;
    dto.microExportAzAccountCode = entity.microExportAzAccountCode;
    dto.microExportEArchiveSerialNo = entity.microExportEArchiveSerialNo;
    dto.microExportEArchiveSequenceNo = entity.microExportEArchiveSequenceNo;
    dto.microExportBulkSerialNo = entity.microExportBulkSerialNo;
    dto.microExportBulkSequenceNo = entity.microExportBulkSequenceNo;
    dto.microExportRefundSerialNo = entity.microExportRefundSerialNo;
    dto.microExportRefundSequenceNo = entity.microExportRefundSequenceNo;

    return dto;
  }
}
