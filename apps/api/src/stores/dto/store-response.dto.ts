import { Store, StoreType } from '../entities/store.entity';

export class StoreResponseDto {
  id: string;
  name: string;
  brandName: string;
  type: StoreType;
  warehouseId: string;
  warehouseName?: string;
  isActive: boolean;
  
  apiUrl?: string;
  sellerId?: string;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  
  shippingProviderId?: string;
  shippingProviderName?: string;
  
  crawlIntervalMinutes: number;
  sendStock: boolean;
  sendPrice: boolean;
  sendOrderStatus: boolean;
  
  brandCode?: string;
  companyCode?: string;
  branchCode?: string;
  coCode?: string;
  
  invoiceEnabled: boolean;
  invoiceTransactionCode?: string;
  hasMicroExport: boolean;

  // E-Arşiv
  eArchiveBulkCustomer: boolean;
  eArchiveCardCode?: string;
  eArchiveAccountCode?: string;
  eArchiveSerialNo?: string;
  eArchiveSequenceNo?: string;
  eArchiveHavaleCardCode?: string;
  eArchiveHavaleAccountCode?: string;

  // E-Fatura
  eInvoiceBulkCustomer: boolean;
  eInvoiceCardCode?: string;
  eInvoiceAccountCode?: string;
  eInvoiceSerialNo?: string;
  eInvoiceSequenceNo?: string;
  eInvoiceHavaleCardCode?: string;
  eInvoiceHavaleAccountCode?: string;

  // Toplu Faturalama
  bulkEArchiveSerialNo?: string;
  bulkEArchiveSequenceNo?: string;
  bulkEInvoiceSerialNo?: string;
  bulkEInvoiceSequenceNo?: string;

  // İade Gider Pusulası
  refundExpenseVoucherEArchiveSerialNo?: string;
  refundExpenseVoucherEArchiveSequenceNo?: string;
  refundExpenseVoucherEInvoiceSerialNo?: string;
  refundExpenseVoucherEInvoiceSequenceNo?: string;

  // Mikro İhracat
  microExportTransactionCode?: string;
  microExportAccountCode?: string;
  microExportAzAccountCode?: string;
  microExportEArchiveSerialNo?: string;
  microExportEArchiveSequenceNo?: string;
  microExportBulkSerialNo?: string;
  microExportBulkSequenceNo?: string;
  microExportRefundSerialNo?: string;
  microExportRefundSequenceNo?: string;
  
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: Store): StoreResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      brandName: entity.brandName,
      type: entity.type,
      warehouseId: entity.warehouseId,
      warehouseName: entity.warehouse?.name,
      isActive: entity.isActive,
      
      apiUrl: entity.apiUrl,
      sellerId: entity.sellerId,
      hasApiKey: !!entity.apiKey,
      hasApiSecret: !!entity.apiSecret,
      
      shippingProviderId: entity.shippingProviderId,
      shippingProviderName: entity.shippingProvider?.name,
      
      crawlIntervalMinutes: entity.crawlIntervalMinutes,
      sendStock: entity.sendStock,
      sendPrice: entity.sendPrice,
      sendOrderStatus: entity.sendOrderStatus,
      
      brandCode: entity.brandCode,
      companyCode: entity.companyCode,
      branchCode: entity.branchCode,
      coCode: entity.coCode,
      
      invoiceEnabled: entity.invoiceEnabled,
      invoiceTransactionCode: entity.invoiceTransactionCode,
      hasMicroExport: entity.hasMicroExport,

      // E-Arşiv
      eArchiveBulkCustomer: entity.eArchiveBulkCustomer,
      eArchiveCardCode: entity.eArchiveCardCode,
      eArchiveAccountCode: entity.eArchiveAccountCode,
      eArchiveSerialNo: entity.eArchiveSerialNo,
      eArchiveSequenceNo: entity.eArchiveSequenceNo,
      eArchiveHavaleCardCode: entity.eArchiveHavaleCardCode,
      eArchiveHavaleAccountCode: entity.eArchiveHavaleAccountCode,

      // E-Fatura
      eInvoiceBulkCustomer: entity.eInvoiceBulkCustomer,
      eInvoiceCardCode: entity.eInvoiceCardCode,
      eInvoiceAccountCode: entity.eInvoiceAccountCode,
      eInvoiceSerialNo: entity.eInvoiceSerialNo,
      eInvoiceSequenceNo: entity.eInvoiceSequenceNo,
      eInvoiceHavaleCardCode: entity.eInvoiceHavaleCardCode,
      eInvoiceHavaleAccountCode: entity.eInvoiceHavaleAccountCode,

      // Toplu Faturalama
      bulkEArchiveSerialNo: entity.bulkEArchiveSerialNo,
      bulkEArchiveSequenceNo: entity.bulkEArchiveSequenceNo,
      bulkEInvoiceSerialNo: entity.bulkEInvoiceSerialNo,
      bulkEInvoiceSequenceNo: entity.bulkEInvoiceSequenceNo,

      // İade Gider Pusulası
      refundExpenseVoucherEArchiveSerialNo: entity.refundExpenseVoucherEArchiveSerialNo,
      refundExpenseVoucherEArchiveSequenceNo: entity.refundExpenseVoucherEArchiveSequenceNo,
      refundExpenseVoucherEInvoiceSerialNo: entity.refundExpenseVoucherEInvoiceSerialNo,
      refundExpenseVoucherEInvoiceSequenceNo: entity.refundExpenseVoucherEInvoiceSequenceNo,

      // Mikro İhracat
      microExportTransactionCode: entity.microExportTransactionCode,
      microExportAccountCode: entity.microExportAccountCode,
      microExportAzAccountCode: entity.microExportAzAccountCode,
      microExportEArchiveSerialNo: entity.microExportEArchiveSerialNo,
      microExportEArchiveSequenceNo: entity.microExportEArchiveSequenceNo,
      microExportBulkSerialNo: entity.microExportBulkSerialNo,
      microExportBulkSequenceNo: entity.microExportBulkSequenceNo,
      microExportRefundSerialNo: entity.microExportRefundSerialNo,
      microExportRefundSequenceNo: entity.microExportRefundSequenceNo,
      
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
