import { IsString, IsUUID, IsNumber, IsBoolean, IsNotEmpty, Min, IsOptional } from 'class-validator';

export class CreateIntegrationStoreDto {
  @IsUUID()
  @IsNotEmpty()
  integrationId: string;

  @IsUUID()
  @IsNotEmpty()
  storeId: string;

  @IsUUID()
  @IsOptional()
  shippingProviderId?: string;

  // Store-specific credentials
  @IsString()
  @IsNotEmpty()
  sellerId: string;

  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsString()
  @IsNotEmpty()
  apiSecret: string;

  // Store-specific settings
  @IsNumber()
  @Min(1)
  crawlIntervalMinutes: number;

  @IsBoolean()
  sendStock: boolean;

  @IsBoolean()
  sendPrice: boolean;

  @IsBoolean()
  sendOrderStatus: boolean;

  @IsBoolean()
  isActive: boolean;

  // Company Configuration
  @IsString()
  @IsOptional()
  brandCode?: string;

  @IsString()
  @IsOptional()
  companyCode?: string;

  @IsString()
  @IsOptional()
  branchCode?: string;

  @IsString()
  @IsOptional()
  coCode?: string;

  // =============================================
  // Fatura Ayarları (Invoice Settings)
  // =============================================

  // Fatura Aktif mi?
  @IsBoolean()
  @IsOptional()
  invoiceEnabled?: boolean;

  // Genel Fatura Ayarları
  @IsString()
  @IsOptional()
  invoiceTransactionCode?: string;

  @IsBoolean()
  @IsOptional()
  hasMicroExport?: boolean;

  // E-Arşiv Ayarları
  @IsBoolean()
  @IsOptional()
  eArchiveBulkCustomer?: boolean;

  @IsString()
  @IsOptional()
  eArchiveCardCode?: string;

  @IsString()
  @IsOptional()
  eArchiveAccountCode?: string;

  @IsString()
  @IsOptional()
  eArchiveSerialNo?: string;

  @IsString()
  @IsOptional()
  eArchiveSequenceNo?: string;

  @IsString()
  @IsOptional()
  eArchiveHavaleCardCode?: string;

  @IsString()
  @IsOptional()
  eArchiveHavaleAccountCode?: string;

  // E-Fatura Ayarları
  @IsBoolean()
  @IsOptional()
  eInvoiceBulkCustomer?: boolean;

  @IsString()
  @IsOptional()
  eInvoiceCardCode?: string;

  @IsString()
  @IsOptional()
  eInvoiceAccountCode?: string;

  @IsString()
  @IsOptional()
  eInvoiceSerialNo?: string;

  @IsString()
  @IsOptional()
  eInvoiceHavaleAccountCode?: string;

  @IsString()
  @IsOptional()
  eInvoiceSequenceNo?: string;

  // Toplu Faturalama Ayarları
  @IsString()
  @IsOptional()
  bulkEArchiveSerialNo?: string;

  @IsString()
  @IsOptional()
  bulkEArchiveSequenceNo?: string;

  @IsString()
  @IsOptional()
  bulkEInvoiceSerialNo?: string;

  @IsString()
  @IsOptional()
  bulkEInvoiceSequenceNo?: string;

  // İade Gider Pusulası Ayarları
  @IsString()
  @IsOptional()
  refundExpenseVoucherEArchiveSerialNo?: string;

  @IsString()
  @IsOptional()
  refundExpenseVoucherEArchiveSequenceNo?: string;

  @IsString()
  @IsOptional()
  refundExpenseVoucherEInvoiceSerialNo?: string;

  @IsString()
  @IsOptional()
  refundExpenseVoucherEInvoiceSequenceNo?: string;

  // Mikro İhracat Ayarları
  @IsString()
  @IsOptional()
  microExportTransactionCode?: string;

  @IsString()
  @IsOptional()
  microExportAccountCode?: string;

  @IsString()
  @IsOptional()
  microExportAzAccountCode?: string;

  @IsString()
  @IsOptional()
  microExportEArchiveSerialNo?: string;

  @IsString()
  @IsOptional()
  microExportEArchiveSequenceNo?: string;

  @IsString()
  @IsOptional()
  microExportBulkSerialNo?: string;

  @IsString()
  @IsOptional()
  microExportBulkSequenceNo?: string;

  @IsString()
  @IsOptional()
  microExportRefundSerialNo?: string;

  @IsString()
  @IsOptional()
  microExportRefundSequenceNo?: string;
}
