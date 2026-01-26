import { 
  IsString, 
  IsUUID, 
  MaxLength, 
  IsOptional, 
  IsBoolean, 
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { StoreType } from '../entities/store.entity';

export class UpdateStoreDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  brandName?: string;

  @IsEnum(StoreType)
  @IsOptional()
  type?: StoreType;

  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  apiUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  sellerId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  apiKey?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  apiSecret?: string;

  @IsUUID()
  @IsOptional()
  shippingProviderId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  cargoCustomerCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  cargoUsername?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  cargoPassword?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  crawlIntervalMinutes?: number;

  @IsBoolean()
  @IsOptional()
  sendStock?: boolean;

  @IsBoolean()
  @IsOptional()
  sendPrice?: boolean;

  @IsBoolean()
  @IsOptional()
  sendOrderStatus?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  brandCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  companyCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  branchCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  coCode?: string;

  @IsBoolean()
  @IsOptional()
  invoiceEnabled?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  invoiceTransactionCode?: string;

  @IsBoolean()
  @IsOptional()
  hasMicroExport?: boolean;

  @IsBoolean()
  @IsOptional()
  eArchiveBulkCustomer?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  eArchiveCardCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  eArchiveAccountCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  eArchiveSerialNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  eArchiveSequenceNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  eArchiveHavaleCardCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  eArchiveHavaleAccountCode?: string;

  @IsBoolean()
  @IsOptional()
  eInvoiceBulkCustomer?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  eInvoiceCardCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  eInvoiceAccountCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  eInvoiceSerialNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  eInvoiceSequenceNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  eInvoiceHavaleCardCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  eInvoiceHavaleAccountCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  bulkEArchiveSerialNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  bulkEArchiveSequenceNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  bulkEInvoiceSerialNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  bulkEInvoiceSequenceNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  refundExpenseVoucherEArchiveSerialNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  refundExpenseVoucherEArchiveSequenceNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  refundExpenseVoucherEInvoiceSerialNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  refundExpenseVoucherEInvoiceSequenceNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  microExportTransactionCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  microExportAccountCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  microExportAzAccountCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  microExportEArchiveSerialNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  microExportEArchiveSequenceNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  microExportBulkSerialNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  microExportBulkSequenceNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  microExportRefundSerialNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  microExportRefundSequenceNo?: string;

  // Fatura Gönderen Bilgileri
  @IsString()
  @IsOptional()
  @MaxLength(255)
  senderCompanyName?: string;

  @IsString()
  @IsOptional()
  senderAddress?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  senderTaxOffice?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  senderTaxNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  senderPhone?: string;
}
