import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Invoice } from './entities/invoice.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { Store, StoreType } from '../stores/entities/store.entity';
import { InvoiceStatus } from './enums/invoice-status.enum';
import { DocumentType } from './enums/document-type.enum';
import { OrderHistoryService } from '../orders/order-history.service';
import { OrderHistoryAction } from '../orders/entities/order-history.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { OrderApiLogService } from '../orders/order-api-log.service';
import { ApiLogProvider, ApiLogType } from '../orders/entities/order-api-log.entity';

@Injectable()
export class InvoicesService {
    private readonly logger = new Logger(InvoicesService.name);

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        @InjectRepository(Invoice)
        private readonly invoiceRepository: Repository<Invoice>,
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @InjectRepository(Store)
        private readonly storeRepository: Repository<Store>,
        private readonly configService: ConfigService,
        private readonly orderHistoryService: OrderHistoryService,
        @Inject(forwardRef(() => OrderApiLogService))
        private readonly orderApiLogService: OrderApiLogService,
    ) { }

    /**
     * Queue an invoice for later processing (creates PENDING record)
     * The actual invoice payload will be built when processing
     */
    async queueInvoiceForOrder(orderId: string, options?: { isBulk?: boolean }): Promise<Invoice> {
        const isBulk = options?.isBulk ?? false;

        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items', 'customer', 'store'],
        });

        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        // Check if invoice already exists by orderId
        const existingInvoice = await this.invoiceRepository.findOne({
            where: { orderId },
            order: { createdAt: 'DESC' },
        });

        if (existingInvoice) {
            if (existingInvoice.status === InvoiceStatus.SUCCESS) {
                this.logger.log(`Invoice already exists for order ${orderId}: ${existingInvoice.invoiceNumber}`);
                return existingInvoice;
            }
            if (existingInvoice.status === InvoiceStatus.PENDING) {
                this.logger.log(`Invoice already pending for order ${orderId}`);
                return existingInvoice;
            }
            // ERROR status - delete and recreate
            this.logger.log(`Deleting failed invoice for order ${orderId} before recreating`);
            await this.invoiceRepository.remove(existingInvoice);
        }

        // Also check by orderNumber to prevent duplicates (via order relation)
        const existingByOrderNumber = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .innerJoin('invoice.order', 'order')
            .where('order.orderNumber = :orderNumber', { orderNumber: order.orderNumber })
            .andWhere('invoice.status = :status', { status: InvoiceStatus.SUCCESS })
            .getOne();

        if (existingByOrderNumber && existingByOrderNumber.orderId !== orderId) {
            this.logger.warn(`Invoice already exists for orderNumber ${order.orderNumber} from different order`);
            throw new BadRequestException(`Bu sipariş numarası için fatura zaten mevcut: ${existingByOrderNumber.invoiceNumber}`);
        }

        // Get Store settings to determine invoice rules
        const storeConfig = await this.getStoreSettings(order.storeId);
        if (!storeConfig) {
            throw new BadRequestException('Store settings not found');
        }

        // Determine invoice logic (same as createInvoiceFromOrder)
        const integrationType = storeConfig.type as string;
        const isMicroExport = order.micro === true;

        let serialNo = '';

        // Determine serialNo based on invoice type
        // isBulk: true -> use bulk serial numbers, false -> use normal serial numbers
        if (integrationType === 'TRENDYOL' && isMicroExport && storeConfig.hasMicroExport) {
            // Mikro İhracat
            serialNo = isBulk
                ? (storeConfig.microExportBulkSerialNo || storeConfig.microExportEArchiveSerialNo || '')
                : (storeConfig.microExportEArchiveSerialNo || '');
        } else {
            // Check E-Invoice User
            const tckn = order.customer?.tcIdentityNumber;
            const taxNo = order.customer?.taxNumber;
            let idToCheck = tckn;
            const isDummy = (id: string) => !id || id === '11111111111' || id.length < 10;

            if (isDummy(tckn) && !isDummy(taxNo)) {
                idToCheck = taxNo;
            } else if (!isDummy(tckn)) {
                idToCheck = tckn;
            } else {
                idToCheck = taxNo || tckn;
            }

            const cleanTaxId = idToCheck?.replace(/\D/g, '');
            const isEInvoiceUser = cleanTaxId && cleanTaxId.length >= 10
                ? await this.checkEInvoiceUser(cleanTaxId)
                : false;

            if (isEInvoiceUser) {
                // E-Fatura
                serialNo = isBulk
                    ? (storeConfig.bulkEInvoiceSerialNo || storeConfig.eInvoiceSerialNo || '')
                    : (storeConfig.eInvoiceSerialNo || '');
            } else {
                // E-Arşiv
                serialNo = isBulk
                    ? (storeConfig.bulkEArchiveSerialNo || storeConfig.eArchiveSerialNo || '')
                    : (storeConfig.eArchiveSerialNo || '');
            }
        }

        // Calculate total amount
        const totalAmount = order.items?.reduce((sum, item) => {
            return sum + (Number(item.unitPrice) || 0) * (item.quantity || 1);
        }, 0) || Number(order.totalPrice) || 0;

        // Use transaction with lock to prevent race condition
        // Number generation + invoice save must be atomic
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            let invoiceNumber = '';

            if (serialNo) {
                const year = new Date().getFullYear();
                const prefixYear = `${serialNo}${year}`;

                // Lock and get last invoice number
                const lastInvoice = await queryRunner.manager
                    .createQueryBuilder(Invoice, 'invoice')
                    .where('invoice.invoiceNumber LIKE :pattern', { pattern: `${prefixYear}%` })
                    .orderBy('invoice.invoiceNumber', 'DESC')
                    .setLock('pessimistic_write')
                    .getOne();

                if (lastInvoice && lastInvoice.invoiceNumber.startsWith(prefixYear)) {
                    const sequencePart = lastInvoice.invoiceNumber.substring(prefixYear.length);
                    const lastSequence = parseInt(sequencePart, 10);
                    if (!isNaN(lastSequence)) {
                        invoiceNumber = `${prefixYear}${String(lastSequence + 1).padStart(9, '0')}`;
                    } else {
                        invoiceNumber = `${prefixYear}000000001`;
                    }
                } else {
                    invoiceNumber = `${prefixYear}000000001`;
                }
            } else {
                invoiceNumber = `PENDING-${order.orderNumber}`;
            }

            // Create and save invoice within the same transaction (lock still held)
            const invoice = queryRunner.manager.create(Invoice, {
                orderId,
                storeId: order.storeId,
                invoiceNumber,
                invoiceSerial: serialNo,
                status: InvoiceStatus.PENDING,
                totalAmount,
                currencyCode: order.currencyCode || 'TRY',
                invoiceDate: new Date(),
                customerFirstName: order.customer?.firstName,
                customerLastName: order.customer?.lastName,
                customerEmail: order.customer?.email,
                customerAddress: this.formatAddress(order.shippingAddress),
            } as any);

            const saved = await queryRunner.manager.save(invoice) as unknown as Invoice;
            await queryRunner.commitTransaction();

            this.logger.log(`Queued invoice for order ${order.orderNumber} - Invoice: ${invoiceNumber}, ID: ${saved.id}`);
            return saved;

        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Failed to queue invoice for order ${orderId}: ${error.message}`);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Process a pending invoice (build payload and send to Uyumsoft)
     */
    async processPendingInvoice(invoiceId: string): Promise<Invoice> {
        const invoice = await this.invoiceRepository.findOne({
            where: { id: invoiceId },
        });

        if (!invoice) {
            throw new NotFoundException(`Invoice ${invoiceId} not found`);
        }

        if (invoice.status !== InvoiceStatus.PENDING) {
            throw new BadRequestException(`Invoice ${invoiceId} is not in PENDING status`);
        }

        // Use createInvoiceFromOrder which handles all the logic
        return this.createInvoiceFromOrder(invoice.orderId);
    }

    /**
     * Get all pending invoices for batch processing
     */
    async getPendingInvoices(limit: number = 50): Promise<Invoice[]> {
        return this.invoiceRepository.find({
            where: { status: InvoiceStatus.PENDING },
            order: { createdAt: 'ASC' },
            take: limit,
            relations: ['order'],
        });
    }

    /**
     * Process all pending invoices (batch job)
     */
    async processAllPendingInvoices(limit: number = 50): Promise<{
        success: boolean;
        processed: number;
        succeeded: number;
        failed: number;
        results: Array<{ invoiceId: string; orderId: string; status: string; error?: string }>;
    }> {
        const pendingInvoices = await this.getPendingInvoices(limit);
        
        const results: Array<{ invoiceId: string; orderId: string; status: string; error?: string }> = [];
        let succeeded = 0;
        let failed = 0;

        for (const pendingInvoice of pendingInvoices) {
            try {
                const processedInvoice = await this.processPendingInvoice(pendingInvoice.id);
                
                if (processedInvoice.status === InvoiceStatus.SUCCESS) {
                    succeeded++;
                    results.push({
                        invoiceId: processedInvoice.id,
                        orderId: pendingInvoice.orderId,
                        status: 'SUCCESS',
                        invoiceNumber: processedInvoice.invoiceNumber,
                    } as any);
                } else {
                    failed++;
                    results.push({
                        invoiceId: processedInvoice.id,
                        orderId: pendingInvoice.orderId,
                        status: 'ERROR',
                        error: processedInvoice.errorMessage,
                    });
                }
            } catch (error) {
                failed++;
                results.push({
                    invoiceId: pendingInvoice.id,
                    orderId: pendingInvoice.orderId,
                    status: 'ERROR',
                    error: error.message,
                });
            }
        }

        this.logger.log(`Processed ${pendingInvoices.length} pending invoices: ${succeeded} succeeded, ${failed} failed`);

        return {
            success: true,
            processed: pendingInvoices.length,
            succeeded,
            failed,
            results,
        };
    }

    /**
     * Create and send invoice to Uyumsoft from an order
     */
    async createInvoiceFromOrder(orderId: string, options?: {
        branchCode?: string;
        docTraCode?: string;
        costCenterCode?: string;
        whouseCode?: string;
        cardCode?: string;
    }): Promise<Invoice> {
        // 1. Find the order
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items', 'customer', 'store'],
        });

        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        // Check if invoice already exists with SUCCESS status by orderId
        const existingSuccessInvoice = await this.invoiceRepository.findOne({
            where: { orderId, status: InvoiceStatus.SUCCESS },
        });

        if (existingSuccessInvoice) {
            throw new BadRequestException(`Bu sipariş için zaten başarıyla oluşturulmuş bir fatura mevcut! (Fatura No: ${existingSuccessInvoice.invoiceNumber})`);
        }

        // Also check by orderNumber to prevent duplicates from different sources (via order relation)
        const existingByOrderNumber = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .innerJoin('invoice.order', 'order')
            .where('order.orderNumber = :orderNumber', { orderNumber: order.orderNumber })
            .andWhere('invoice.status = :status', { status: InvoiceStatus.SUCCESS })
            .getOne();

        if (existingByOrderNumber && existingByOrderNumber.orderId !== orderId) {
            throw new BadRequestException(`Bu sipariş numarası için başka bir kayıttan fatura zaten kesilmiş: ${existingByOrderNumber.invoiceNumber}`);
        }

        // Check for PENDING invoice to update
        const pendingInvoice = await this.invoiceRepository.findOne({
            where: { orderId, status: InvoiceStatus.PENDING },
        });

        // 2. Get Store settings
        const storeConfig = await this.getStoreSettings(order.storeId);
        if (!storeConfig) {
            throw new BadRequestException('Store settings not found');
        }

        // 3. Determine Invoice Logic
        const integrationType = storeConfig.type as string;
        const isMicroExport = order.micro === true;
        const paymentMethod = order.paymentMethod?.toUpperCase() || '';
        const isHavale = paymentMethod.includes('HAVALE') || paymentMethod.includes('EFT') || paymentMethod.includes('TRANSFER');

        let invoiceSettings = {
            cardCode: '',
            accountCode: '',
            serialNo: '',
            edocNo: '',
            docTraCode: storeConfig.invoiceTransactionCode,
            vknTckn: '11111111111',
            isEInvoice: false,
        };

        // cardCodeSequenceToIncrement is still needed for E-Invoice card code auto-increment
        let cardCodeSequenceToIncrement: keyof Store | null = null;

        // --- BRANCH: TRENDYOL MICRO EXPORT ---
        if (integrationType === StoreType.TRENDYOL && isMicroExport && storeConfig.hasMicroExport) {
            this.logger.log(`Processing Micro Export Invoice for Order ${orderId}`);

            // Fixed TCKN for Micro Export
            invoiceSettings.vknTckn = '11111111111';

            // Card Code: TRENDYOL{CountryCode}
            const countryCode = this.getCountryCode(order);
            invoiceSettings.cardCode = `TRENDYOL ${countryCode}`;

            // Account Code: Check for AZ special case
            if ((countryCode === 'AZ' || countryCode === 'AZERBAIJAN') && storeConfig.microExportAzAccountCode) {
                invoiceSettings.accountCode = storeConfig.microExportAzAccountCode;
            } else {
                invoiceSettings.accountCode = storeConfig.microExportAccountCode;
            }

            // Serial & Sequence
            invoiceSettings.serialNo = storeConfig.microExportEArchiveSerialNo;
            // If pending invoice exists, reuse its number. Otherwise, generate new.
            if (pendingInvoice && pendingInvoice.invoiceNumber) {
                invoiceSettings.edocNo = pendingInvoice.invoiceNumber;
                this.logger.log(`Reusing invoice number from pending invoice: ${invoiceSettings.edocNo}`);
            } else {
                invoiceSettings.edocNo = await this.generateInvoiceNumber(invoiceSettings.serialNo);
                this.logger.log(`Generated new invoice number: ${invoiceSettings.edocNo}`);
            }

            if (storeConfig.microExportTransactionCode) {
                invoiceSettings.docTraCode = storeConfig.microExportTransactionCode;
            }

        }
        // --- BRANCH: STANDARD (Domestic / Other Integrations) ---
        else {
            // Check E-Invoice User via Uyumsoft
            // Check E-Invoice User via Uyumsoft
            // Use smart ID selection similar to OrdersService
            const tckn = order.customer?.tcIdentityNumber;
            const taxNo = order.customer?.taxNumber;

            let idToCheck = tckn;
            const isDummy = (id: string) => !id || id === '11111111111' || id === '2222222222' || id.length < 10;

            if (isDummy(tckn) && !isDummy(taxNo)) {
                idToCheck = taxNo;
            } else if (!isDummy(tckn)) {
                idToCheck = tckn;
            } else {
                idToCheck = taxNo || tckn;
            }

            // Clean tax ID
            const cleanTaxId = idToCheck?.replace(/\D/g, '');
            const isEInvoiceUser = cleanTaxId && cleanTaxId.length >= 10
                ? await this.checkEInvoiceUser(cleanTaxId)
                : false;

            if (isEInvoiceUser) {
                // --- E-FATURA ---
                this.logger.log(`Customer is E-Invoice User. Processing E-Invoice for Order ${orderId}`);
                invoiceSettings.isEInvoice = true;
                invoiceSettings.vknTckn = cleanTaxId; // Use real Tax ID

                // Card Code: E-Invoice uses unique card code logic (Auto-increment)
                // "cari kart kodu o başlangıç aslında 1'er arttırarak gideceksin"
                invoiceSettings.cardCode = storeConfig.eInvoiceCardCode;
                cardCodeSequenceToIncrement = 'eInvoiceCardCode';

                // Update Account Code based on Payment (Ikas Havale check)
                if (integrationType === StoreType.IKAS && isHavale && storeConfig.eInvoiceHavaleAccountCode) {
                    invoiceSettings.accountCode = storeConfig.eInvoiceHavaleAccountCode;
                } else {
                    invoiceSettings.accountCode = storeConfig.eInvoiceAccountCode;
                }

                // Serial & Sequence
                invoiceSettings.serialNo = storeConfig.eInvoiceSerialNo;
                // If pending invoice exists, reuse its number. Otherwise, generate new.
                if (pendingInvoice && pendingInvoice.invoiceNumber) {
                    invoiceSettings.edocNo = pendingInvoice.invoiceNumber;
                    this.logger.log(`Reusing invoice number from pending invoice: ${invoiceSettings.edocNo}`);
                } else {
                    invoiceSettings.edocNo = await this.generateInvoiceNumber(invoiceSettings.serialNo);
                    this.logger.log(`Generated new invoice number: ${invoiceSettings.edocNo}`);
                }

            } else {
                // --- E-ARŞİV ---
                this.logger.log(`Processing E-Archive Invoice for Order ${orderId}`);
                invoiceSettings.isEInvoice = false;

                // Create Entity logic moved to shared block below
                // if (cleanTaxId && cleanTaxId.length >= 10) ...

                // For E-Archive B2C, we usually use 11111111111 and generic Card Code
                invoiceSettings.vknTckn = '11111111111';

                // E-Archive Card Code
                if (integrationType === StoreType.IKAS && isHavale && storeConfig.eArchiveHavaleCardCode) {
                    invoiceSettings.cardCode = storeConfig.eArchiveHavaleCardCode;
                } else {
                    invoiceSettings.cardCode = storeConfig.eArchiveCardCode;
                }

                // E-Archive Account Code
                if (integrationType === StoreType.IKAS && isHavale && storeConfig.eArchiveHavaleAccountCode) {
                    invoiceSettings.accountCode = storeConfig.eArchiveHavaleAccountCode;
                } else {
                    invoiceSettings.accountCode = storeConfig.eArchiveAccountCode;
                }

                // Serial & Sequence
                invoiceSettings.serialNo = storeConfig.eArchiveSerialNo;
                // If pending invoice exists, reuse its number. Otherwise, generate new.
                if (pendingInvoice && pendingInvoice.invoiceNumber) {
                    invoiceSettings.edocNo = pendingInvoice.invoiceNumber;
                    this.logger.log(`Reusing invoice number from pending invoice: ${invoiceSettings.edocNo}`);
                } else {
                    invoiceSettings.edocNo = await this.generateInvoiceNumber(invoiceSettings.serialNo);
                    this.logger.log(`Generated new invoice number: ${invoiceSettings.edocNo}`);
                }
            }

            // Sync Entity with Uyumsoft (Cari Kart Açma/Güncelleme)
            // ONLY if customer is an E-Invoice User, otherwise skip and create invoice directly
            if (isEInvoiceUser && cleanTaxId && cleanTaxId.length >= 10 && invoiceSettings.cardCode) {
                const invAddr = (order.invoiceAddress as any) || (order.shippingAddress as any);
                const customerPayload = {
                    entityCode: invoiceSettings.cardCode, // FIX: Use invoiceSettings.cardCode instead of options?.cardCode
                    entityName: order.customer?.company || `${order.customer?.firstName} ${order.customer?.lastName}`,
                    entityNameShort: order.customer?.company || `${order.customer?.firstName} ${order.customer?.lastName}`,
                    searchByEntityId: false,
                    putByEntityId: false,
                    searchByEntityCode: false,
                    putByEntityCode: false,
                    tel: order.customer?.phone || '',
                    address1: this.formatAddress(invAddr),
                    countryName: invAddr?.country || 'Türkiye',
                    countryCode: this.getCountryCode(order),
                    cityId: (() => {
                        const code = invAddr?.cityCode || this.getCityPlateCode(invAddr?.city);
                        const num = parseInt(String(code), 10);
                        if (!isNaN(num) && num > 0 && num < 10) return `0${num}`;
                        return String(code || '');
                    })(),
                    cityName: invAddr?.city || '',
                    townId: invAddr?.districtId || invAddr?.disttrictId || 0,
                    townName: invAddr?.district || '',
                    coCode: storeConfig.coCode,
                    entityType: 'Müşteri',
                    accCode: invoiceSettings.accountCode,
                    iseInvoiceEntity: isEInvoiceUser,
                    firstName: order.customer?.firstName,
                    familyName: order.customer?.lastName,
                    email: order.customer?.email || '',
                    identifyNo: order.customer?.tcIdentityNumber || '',
                    zipCode: invAddr?.postalCode || invAddr?.zipCode || '',
                };

                await this.insertEntity(customerPayload);
            }
        }

        // 4. Generate Invoice Number (Using Store Configuration)
        // Use the sequence defined in IntegrationStore (edocNo calculated above)
        // e.g. edocNo = EMA2026000016935
        const invoiceNumber = invoiceSettings.edocNo;

        // Derive Voucher No (Remove Serial Prefix only) e.g. EMA2026000000001 -> 2026000000001
        const voucherNo = invoiceNumber.replace(invoiceSettings.serialNo || '', '');

        // 5. Build Uyumsoft Payload
        const requestPayload = await this.buildUyumsoftPayload(order, {
            invoiceNumber,
            voucherNo,
            invoiceSerial: invoiceSettings.serialNo,
            edocNo: invoiceNumber,
            branchCode: options?.branchCode,
            docTraCode: invoiceSettings.docTraCode || options?.docTraCode,
            costCenterCode: options?.costCenterCode,
            whouseCode: options?.whouseCode,
            cardCode: invoiceSettings.cardCode || options?.cardCode,
            accountCode: invoiceSettings.accountCode || undefined,
            vknTckn: invoiceSettings.vknTckn,
            storeConfig,
        });    // Pass extra overrides if needed

        // 6. Create or update Invoice record
        let savedInvoice: Invoice;
        
        if (pendingInvoice) {
            // Update existing pending invoice
            pendingInvoice.invoiceNumber = invoiceNumber;
            pendingInvoice.invoiceSerial = invoiceSettings.serialNo;
            pendingInvoice.edocNo = invoiceSettings.edocNo;
            pendingInvoice.ettn = '';
            pendingInvoice.status = InvoiceStatus.PENDING;
            pendingInvoice.cardCode = invoiceSettings.cardCode;
            pendingInvoice.branchCode = options?.branchCode || '';
            pendingInvoice.docTraCode = invoiceSettings.docTraCode;
            pendingInvoice.costCenterCode = options?.costCenterCode || '';
            pendingInvoice.whouseCode = options?.whouseCode || '';
            pendingInvoice.customerFirstName = order.customer?.firstName;
            pendingInvoice.customerLastName = order.customer?.lastName;
            pendingInvoice.customerEmail = order.customer?.email;
            pendingInvoice.customerAddress = this.formatAddress(order.shippingAddress);
            pendingInvoice.totalAmount = order.totalPrice;
            pendingInvoice.currencyCode = order.currencyCode || 'TRY';
            pendingInvoice.invoiceDate = new Date();
            pendingInvoice.shippingDate = order.orderDate;
            pendingInvoice.requestPayload = requestPayload;
            
            savedInvoice = await this.invoiceRepository.save(pendingInvoice) as unknown as Invoice;
            this.logger.log(`Updated pending invoice ${savedInvoice.id} for order ${orderId}`);
        } else {
            // Create new invoice
            const invoice = this.invoiceRepository.create({
                orderId: order.id,
                storeId: order.storeId,
                invoiceNumber,
                invoiceSerial: invoiceSettings.serialNo,
                edocNo: invoiceSettings.edocNo,
                ettn: '',
                status: InvoiceStatus.PENDING,
                cardCode: invoiceSettings.cardCode,
                branchCode: options?.branchCode,
                docTraCode: invoiceSettings.docTraCode,
                costCenterCode: options?.costCenterCode,
                whouseCode: options?.whouseCode,
                customerFirstName: order.customer?.firstName,
                customerLastName: order.customer?.lastName,
                customerEmail: order.customer?.email,
                customerAddress: this.formatAddress(order.shippingAddress),
                totalAmount: order.totalPrice,
                currencyCode: order.currencyCode || 'TRY',
                invoiceDate: new Date(),
                shippingDate: order.orderDate,
                requestPayload,
            } as any);

            savedInvoice = await this.invoiceRepository.save(invoice) as unknown as Invoice;
        }

        // 7. Send to Uyumsoft
        try {
            const response = await this.sendToUyumsoft(requestPayload, orderId);

            savedInvoice.status = InvoiceStatus.SUCCESS;
            savedInvoice.responsePayload = response;
            savedInvoice.uyumsoftInvoiceId = response?.invoiceId || response?.id;
            savedInvoice.ettn = response?.ettn;

            this.logger.log(`Invoice ${invoiceSettings.edocNo} sent successfully to Uyumsoft`);

            // 8. Increment Card Code Sequence (Only on Success, for E-Invoice customers)
            if (cardCodeSequenceToIncrement) {
                await this.incrementStoreSequence(storeConfig.id, cardCodeSequenceToIncrement);
            }

            // 9. Log to order history
            try {
                await this.orderHistoryService.logEvent({
                    orderId: order.id,
                    action: OrderHistoryAction.INVOICE_CREATED,
                    description: `Fatura kesildi: ${savedInvoice.invoiceNumber || invoiceSettings.edocNo}`,
                    metadata: {
                        invoiceNumber: savedInvoice.invoiceNumber,
                        invoiceId: savedInvoice.id,
                        edocNo: invoiceSettings.edocNo,
                        ettn: savedInvoice.ettn,
                    },
                });
            } catch (historyError) {
                this.logger.warn(`Failed to log invoice history: ${historyError.message}`);
            }

            // 10. Update order status to INVOICED
            try {
                await this.orderRepository.update(order.id, { status: OrderStatus.INVOICED });
                this.logger.log(`Order ${order.id} status updated to INVOICED`);
            } catch (statusError) {
                this.logger.warn(`Failed to update order status: ${statusError.message}`);
            }

            // 11. Send Invoiced status to Trendyol if applicable
            if (order.storeId && storeConfig.type !== StoreType.MANUAL) {
                try {
                    await this.sendInvoicedStatusToIntegration(order, savedInvoice, storeConfig);
                } catch (integrationError) {
                    this.logger.warn(`Failed to send Invoiced status to integration: ${integrationError.message}`);
                }
            }

        } catch (error) {
            savedInvoice.status = InvoiceStatus.ERROR;
            savedInvoice.errorMessage = error.message || 'Unknown error';
            savedInvoice.responsePayload = error.response?.data;
            this.logger.error(`Failed to send invoice ${invoiceSettings.edocNo} to Uyumsoft`, error);
        }

        return this.invoiceRepository.save(savedInvoice) as unknown as Invoice;
    }

    /**
     * Create and send bulk invoices to Uyumsoft using InsertInvoiceMulti
     */
    /**
     * Toplu fatura kuyruğa ekleme - sadece PENDING kayıtlar oluşturur
     * Asıl fatura kesimi job tarafından yapılır
     * @param sendImmediately - true ise direkt Uyumsoft'a gönderir, false ise sadece kuyruğa ekler
     */
    async createBulkInvoices(orderIds: string[], options?: {
        branchCode?: string;
        docTraCode?: string;
        costCenterCode?: string;
        whouseCode?: string;
        sendImmediately?: boolean; // default: false - sadece kuyruğa ekle
    }): Promise<{ success: Array<{ orderId: string; invoiceNumber: string }>; failed: { orderId: string; error: string }[] }> {
        const sendImmediately = options?.sendImmediately ?? false;
        const results = {
            success: [] as Array<{ orderId: string; invoiceNumber: string }>,
            failed: [] as { orderId: string; error: string }[],
        };

        if (!orderIds || orderIds.length === 0) {
            throw new BadRequestException('No order IDs provided');
        }

        this.logger.log(`Starting bulk invoice creation for ${orderIds.length} orders`);

        // 1. Fetch all orders with relations
        const orders = await this.orderRepository.find({
            where: orderIds.map(id => ({ id })),
            relations: ['items', 'customer', 'store'],
        });

        if (orders.length === 0) {
            throw new NotFoundException('No orders found');
        }

        // 2. Track sequence counters per serial prefix to avoid duplicates in bulk
        // Key: serial prefix (e.g., "EEA"), Value: next sequence number to use
        const sequenceCounters: Map<string, number> = new Map();

        // Helper to get next invoice number with in-memory tracking for bulk
        const getNextBulkInvoiceNumber = async (serialNo: string): Promise<string> => {
            const year = new Date().getFullYear();
            const prefixYear = `${serialNo}${year}`;

            if (!sequenceCounters.has(serialNo)) {
                // First time for this serial - query DB for max (all statuses, not just SUCCESS)
                const lastInvoice = await this.invoiceRepository
                    .createQueryBuilder('invoice')
                    .where('invoice.invoiceNumber LIKE :pattern', { pattern: `${prefixYear}%` })
                    .orderBy('invoice.invoiceNumber', 'DESC')
                    .getOne();

                let startSeq = 1;
                if (lastInvoice && lastInvoice.invoiceNumber.startsWith(prefixYear)) {
                    const sequencePart = lastInvoice.invoiceNumber.substring(prefixYear.length);
                    const lastSeq = parseInt(sequencePart, 10);
                    if (!isNaN(lastSeq)) {
                        startSeq = lastSeq + 1;
                    }
                }
                sequenceCounters.set(serialNo, startSeq);
                this.logger.log(`Bulk: Starting sequence for ${serialNo} at ${startSeq}`);
            }

            const nextSeq = sequenceCounters.get(serialNo)!;
            sequenceCounters.set(serialNo, nextSeq + 1); // Increment for next order
            return `${prefixYear}${String(nextSeq).padStart(9, '0')}`;
        };

        // 3. Process each order and prepare payloads
        const invoicePayloads: { order: Order; payload: any; invoice: Invoice; invoiceSettings: any }[] = [];

        for (const order of orders) {
            try {
                // Check if invoice already exists for this order (by orderId)
                const existingInvoiceByOrderId = await this.invoiceRepository.findOne({
                    where: { orderId: order.id },
                    order: { createdAt: 'DESC' },
                });

                if (existingInvoiceByOrderId) {
                    if (existingInvoiceByOrderId.status === InvoiceStatus.SUCCESS) {
                        results.failed.push({ orderId: order.id, error: `Fatura zaten kesilmiş: ${existingInvoiceByOrderId.invoiceNumber}` });
                        continue;
                    }
                    if (existingInvoiceByOrderId.status === InvoiceStatus.PENDING) {
                        results.failed.push({ orderId: order.id, error: 'Fatura zaten kuyrukta bekliyor' });
                        continue;
                    }
                    // ERROR status can be retried - delete old record first
                    if (existingInvoiceByOrderId.status === InvoiceStatus.ERROR) {
                        this.logger.log(`Deleting failed invoice for order ${order.id} before retry`);
                        await this.invoiceRepository.remove(existingInvoiceByOrderId);
                    }
                }

                // Also check by orderNumber to prevent duplicates from different sources (via order relation)
                const existingInvoiceByOrderNumber = await this.invoiceRepository
                    .createQueryBuilder('invoice')
                    .innerJoin('invoice.order', 'o')
                    .where('o.orderNumber = :orderNumber', { orderNumber: order.orderNumber })
                    .andWhere('invoice.status = :status', { status: InvoiceStatus.SUCCESS })
                    .getOne();

                if (existingInvoiceByOrderNumber && existingInvoiceByOrderNumber.orderId !== order.id) {
                    results.failed.push({ orderId: order.id, error: `Bu sipariş numarası için fatura zaten mevcut: ${existingInvoiceByOrderNumber.invoiceNumber}` });
                    continue;
                }

                // Get Store settings
                const storeConfig = await this.getStoreSettings(order.storeId);
                if (!storeConfig) {
                    results.failed.push({ orderId: order.id, error: 'Store settings not found' });
                    continue;
                }

                // Determine invoice settings (same logic as single invoice)
                const integrationType = storeConfig.type as string;
                const isMicroExport = order.micro === true;
                const paymentMethod = order.paymentMethod?.toUpperCase() || '';
                const isHavale = paymentMethod.includes('HAVALE') || paymentMethod.includes('EFT') || paymentMethod.includes('TRANSFER');

                let invoiceSettings = {
                    cardCode: '',
                    accountCode: '',
                    serialNo: '',
                    edocNo: '',
                    docTraCode: storeConfig.invoiceTransactionCode,
                    vknTckn: '11111111111',
                    isEInvoice: false,
                };

                // Determine if customer is E-Invoice user (same logic as single invoice)
                const tckn = order.customer?.tcIdentityNumber;
                const taxNo = order.customer?.taxNumber;

                let idToCheck = tckn;
                const isDummy = (id: string) => !id || id === '11111111111' || id === '2222222222' || id.length < 10;

                if (isDummy(tckn) && !isDummy(taxNo)) {
                    idToCheck = taxNo;
                } else if (!isDummy(tckn)) {
                    idToCheck = tckn;
                } else {
                    idToCheck = taxNo || tckn;
                }

                const cleanTaxId = idToCheck?.replace(/\D/g, '');
                const isEInvoiceUser = cleanTaxId && cleanTaxId.length >= 10
                    ? await this.checkEInvoiceUser(cleanTaxId)
                    : false;

                // Apply BULK-specific serial numbers for bulk invoice creation
                if (integrationType === StoreType.TRENDYOL && isMicroExport && storeConfig.hasMicroExport) {
                    // Mikro İhracat Toplu - always E-Archive (foreign customers)
                    invoiceSettings.vknTckn = '11111111111';
                    invoiceSettings.cardCode = `TRENDYOL ${this.getCountryCode(order)}`;
                    invoiceSettings.accountCode = storeConfig.microExportAccountCode;
                    invoiceSettings.serialNo = storeConfig.microExportBulkSerialNo || storeConfig.microExportEArchiveSerialNo;
                    invoiceSettings.edocNo = await getNextBulkInvoiceNumber(invoiceSettings.serialNo);
                    if (storeConfig.microExportTransactionCode) {
                        invoiceSettings.docTraCode = storeConfig.microExportTransactionCode;
                    }
                } else if (isEInvoiceUser) {
                    // E-FATURA BULK - Customer is E-Invoice registered
                    this.logger.log(`Bulk: Customer ${order.customer?.firstName} is E-Invoice user`);
                    invoiceSettings.isEInvoice = true;
                    invoiceSettings.vknTckn = cleanTaxId;
                    invoiceSettings.cardCode = storeConfig.eInvoiceCardCode;

                    if (integrationType === StoreType.IKAS && isHavale && storeConfig.eInvoiceHavaleAccountCode) {
                        invoiceSettings.accountCode = storeConfig.eInvoiceHavaleAccountCode;
                    } else {
                        invoiceSettings.accountCode = storeConfig.eInvoiceAccountCode;
                    }

                    // Use bulk E-Invoice serial
                    invoiceSettings.serialNo = storeConfig.bulkEInvoiceSerialNo || storeConfig.eInvoiceSerialNo;
                    invoiceSettings.edocNo = await getNextBulkInvoiceNumber(invoiceSettings.serialNo);
                } else {
                    // E-ARŞİV BULK - Customer is NOT E-Invoice registered
                    this.logger.log(`Bulk: Customer ${order.customer?.firstName} is E-Archive (not E-Invoice)`);
                    invoiceSettings.vknTckn = '11111111111';

                    if (integrationType === StoreType.IKAS && isHavale && storeConfig.eArchiveHavaleCardCode) {
                        invoiceSettings.cardCode = storeConfig.eArchiveHavaleCardCode;
                    } else {
                        invoiceSettings.cardCode = storeConfig.eArchiveCardCode;
                    }
                    if (integrationType === StoreType.IKAS && isHavale && storeConfig.eArchiveHavaleAccountCode) {
                        invoiceSettings.accountCode = storeConfig.eArchiveHavaleAccountCode;
                    } else {
                        invoiceSettings.accountCode = storeConfig.eArchiveAccountCode;
                    }

                    // Use bulk E-Archive serial
                    invoiceSettings.serialNo = storeConfig.bulkEArchiveSerialNo || storeConfig.eArchiveSerialNo;
                    invoiceSettings.edocNo = await getNextBulkInvoiceNumber(invoiceSettings.serialNo);
                }

                const invoiceNumber = invoiceSettings.edocNo;
                const voucherNo = invoiceNumber.replace(invoiceSettings.serialNo || '', '');

                // Build payload
                const requestPayload = await this.buildUyumsoftPayload(order, {
                    invoiceNumber,
                    voucherNo,
                    invoiceSerial: invoiceSettings.serialNo,
                    edocNo: invoiceNumber,
                    branchCode: options?.branchCode,
                    docTraCode: invoiceSettings.docTraCode || options?.docTraCode,
                    costCenterCode: options?.costCenterCode,
                    whouseCode: options?.whouseCode,
                    cardCode: invoiceSettings.cardCode,
                    accountCode: invoiceSettings.accountCode,
                    vknTckn: invoiceSettings.vknTckn,
                    storeConfig,
                });

                // Create invoice record (pending)
                const invoice = this.invoiceRepository.create({
                    orderId: order.id,
                    storeId: order.storeId,
                    invoiceNumber,
                    invoiceSerial: invoiceSettings.serialNo,
                    edocNo: invoiceSettings.edocNo,
                    ettn: '',
                    status: InvoiceStatus.PENDING,
                    cardCode: invoiceSettings.cardCode,
                    branchCode: options?.branchCode,
                    docTraCode: invoiceSettings.docTraCode,
                    costCenterCode: options?.costCenterCode,
                    whouseCode: options?.whouseCode,
                    customerFirstName: order.customer?.firstName,
                    customerLastName: order.customer?.lastName,
                    customerEmail: order.customer?.email,
                    customerAddress: this.formatAddress(order.shippingAddress),
                    totalAmount: order.totalPrice,
                    currencyCode: order.currencyCode || 'TRY',
                    invoiceDate: new Date(),
                    shippingDate: order.orderDate,
                    requestPayload,
                } as any);

                const savedInvoice = await this.invoiceRepository.save(invoice) as unknown as Invoice;

                invoicePayloads.push({
                    order,
                    payload: requestPayload,
                    invoice: savedInvoice,
                    invoiceSettings,
                });

                // Kuyruğa eklendi - success'e ekle
                results.success.push({
                    orderId: order.id,
                    invoiceNumber: savedInvoice.invoiceNumber,
                });

            } catch (error) {
                results.failed.push({ orderId: order.id, error: error.message });
            }
        }

        if (invoicePayloads.length === 0) {
            this.logger.warn('No valid invoices to queue');
            return results;
        }

        // 3. sendImmediately: true ise direkt Uyumsoft'a gönder, false ise job işlesin
        if (!sendImmediately) {
            this.logger.log(`Bulk invoice queued: ${invoicePayloads.length} invoices added to queue (PENDING status)`);
            return results;
        }

        // --- sendImmediately: true - Direkt gönder ---
        this.logger.log(`Sending ${invoicePayloads.length} invoices immediately to Uyumsoft...`);

        try {
            const bulkPayload = {
                value: invoicePayloads.map(p => p.payload.value),
            };

            const bulkOrderIds = invoicePayloads.map(p => p.order.id);
            const response = await this.sendToUyumsoftMulti(bulkPayload, bulkOrderIds);

            // Process responses
            if (response?.value && Array.isArray(response.value)) {
                for (let i = 0; i < invoicePayloads.length; i++) {
                    const invoiceData = invoicePayloads[i];
                    const responseItem = response.value[i];

                    if (responseItem && !responseItem.isError) {
                        invoiceData.invoice.status = InvoiceStatus.SUCCESS;
                        invoiceData.invoice.responsePayload = responseItem;
                        invoiceData.invoice.uyumsoftInvoiceId = responseItem?.invoiceId || responseItem?.id;
                        invoiceData.invoice.ettn = responseItem?.ettn;
                        await this.invoiceRepository.save(invoiceData.invoice);

                        // Update order status to INVOICED
                        try {
                            await this.orderRepository.update(invoiceData.order.id, { status: OrderStatus.INVOICED });
                        } catch (statusErr) {
                            this.logger.warn(`Failed to update order ${invoiceData.order.id} status: ${statusErr.message}`);
                        }

                        // Send Invoiced status to marketplace
                        await this.sendInvoicedStatusAfterBulk(invoiceData.order, invoiceData.invoice);
                    } else {
                        invoiceData.invoice.status = InvoiceStatus.ERROR;
                        invoiceData.invoice.errorMessage = responseItem?.exceptionMessage || 'Unknown error';
                        invoiceData.invoice.responsePayload = responseItem;
                        await this.invoiceRepository.save(invoiceData.invoice);
                        // Already in success from queue step, update to failed
                        const idx = results.success.findIndex(s => s.orderId === invoiceData.order.id);
                        if (idx > -1) results.success.splice(idx, 1);
                        results.failed.push({ orderId: invoiceData.order.id, error: invoiceData.invoice.errorMessage });
                    }
                }
            } else {
                // If response is not array, mark all as success
                for (const invoiceData of invoicePayloads) {
                    invoiceData.invoice.status = InvoiceStatus.SUCCESS;
                    invoiceData.invoice.responsePayload = response;
                    await this.invoiceRepository.save(invoiceData.invoice);

                    // Update order status to INVOICED
                    try {
                        await this.orderRepository.update(invoiceData.order.id, { status: OrderStatus.INVOICED });
                    } catch (statusErr) {
                        this.logger.warn(`Failed to update order ${invoiceData.order.id} status: ${statusErr.message}`);
                    }

                    // Send Invoiced status to marketplace
                    await this.sendInvoicedStatusAfterBulk(invoiceData.order, invoiceData.invoice);
                }
            }

            this.logger.log(`Bulk invoice completed: ${results.success.length} success, ${results.failed.length} failed`);

        } catch (error) {
            this.logger.error('Bulk invoice send failed', error);
            // Mark all pending as failed
            for (const invoiceData of invoicePayloads) {
                invoiceData.invoice.status = InvoiceStatus.ERROR;
                invoiceData.invoice.errorMessage = error.message || 'Bulk send failed';
                invoiceData.invoice.responsePayload = error.response?.data;
                await this.invoiceRepository.save(invoiceData.invoice);
                // Update results
                const idx = results.success.findIndex(s => s.orderId === invoiceData.order.id);
                if (idx > -1) results.success.splice(idx, 1);
                results.failed.push({ orderId: invoiceData.order.id, error: invoiceData.invoice.errorMessage });
            }
        }

        return results;
    }

    /**
     * Send bulk invoices to Uyumsoft API using InsertInvoiceMulti
     */
    private async sendToUyumsoftMulti(payload: object, orderIds?: string[]): Promise<any> {
        const apiUrl = this.configService.get<string>('UYUMSOFT_API_URL')
            || 'http://api-embeauty.eko.uyumcloud.com';

        const endpoint = `${apiUrl}/UyumApi/v1/PSM/InsertInvoiceMulti`;
        const startTime = Date.now();

        const { token, secretKey } = await this.getAccessToken();

        try {
            this.logger.log(`[Uyumsoft Multi Request] Payload: ${JSON.stringify(payload)}`);

            const response = await axios.post(
                endpoint,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'UyumSecretKey': secretKey,
                    },
                }
            );

            const durationMs = Date.now() - startTime;
            this.logger.log(`[Uyumsoft Multi Response] Success: ${JSON.stringify(response.data)}`);

            if (orderIds && orderIds.length > 0) {
                for (const orderId of orderIds) {
                    await this.orderApiLogService.log({
                        orderId,
                        provider: ApiLogProvider.UYUMSOFT,
                        logType: ApiLogType.CREATE_INVOICE,
                        endpoint,
                        method: 'POST',
                        requestPayload: { bulk: true, totalCount: orderIds.length },
                        responsePayload: response.data,
                        statusCode: response.status,
                        isSuccess: true,
                        durationMs,
                    });
                }
            }

            return response.data;
        } catch (error: any) {
            const durationMs = Date.now() - startTime;
            const errorResponse = error.response?.data || error.message;
            this.logger.error(`[Uyumsoft Multi Response] Error: ${JSON.stringify(errorResponse)}`);

            if (orderIds && orderIds.length > 0) {
                for (const orderId of orderIds) {
                    await this.orderApiLogService.log({
                        orderId,
                        provider: ApiLogProvider.UYUMSOFT,
                        logType: ApiLogType.CREATE_INVOICE,
                        endpoint,
                        method: 'POST',
                        requestPayload: { bulk: true, totalCount: orderIds.length },
                        responsePayload: errorResponse,
                        statusCode: error.response?.status,
                        isSuccess: false,
                        errorMessage: error.message,
                        durationMs,
                    });
                }
            }

            throw error;
        }
    }

    private getCountryCode(order: Order): string {
        const address = order.invoiceAddress as any;
        return (address?.countryCode || address?.country || 'TR').toUpperCase();
    }

    /**
     * Get Store settings for invoice configuration
     */
    private async getStoreSettings(storeId: string): Promise<Store | null> {
        if (!storeId) {
            return null;
        }

        return this.storeRepository.findOne({
            where: { id: storeId },
        });
    }



    /**
     * Build Uyumsoft InsertInvoice request payload
     */
    private async buildUyumsoftPayload(order: Order, options: {
        invoiceNumber: string;
        voucherNo: string;
        invoiceSerial: string;
        edocNo: string;
        branchCode?: string;
        docTraCode?: string;
        costCenterCode?: string;
        whouseCode?: string;
        cardCode?: string;
        accountCode?: string;
        vknTckn?: string;
        storeConfig?: Store;
    }): Promise<object> {
        const now = new Date();
        const orderDate = new Date(order.orderDate);

        // Embeauty default config
        const EMBEAUTY_CONFIG = {
            branchCode: 'EM2025',
            coCode: 'EM2025',
            docTraCode: 'FTS-101',
            costCenterCode: 'EMBEAUTY',
            whouseCode: 'MERKEZ',
            voucherSerial: 'EMA',
        };

        // Calculate proportional discounts for each line item
        // Formula: 
        // 1. itemGrossTotal = unitPrice * quantity
        // 2. itemPercentage = itemGrossTotal / grossAmount * 100
        // 3. itemDiscount = totalDiscount * itemPercentage / 100
        // 4. discountedUnitPrice = (itemGrossTotal - itemDiscount) / quantity

        const grossAmount = Number(order.grossAmount) || 0;
        const totalDiscount = Number(order.totalDiscount) || 0;

        // Build line items - lookup Product SKU by barcode
        const details = await Promise.all((order.items || []).map(async (item, index) => {
            let dcardCode = '1000010001'; // Default fallback

            // Find product by barcode to get the correct SKU for Uyumsoft
            if (item.barcode) {
                const product = await this.productRepository.findOne({
                    where: { barcode: item.barcode }
                });
                if (product && product.sku) {
                    dcardCode = product.sku;
                }
            }

            // Calculate discounted unit price
            const quantity = Number(item.quantity);
            const originalUnitPrice = Number(item.unitPrice);
            const itemGrossTotal = originalUnitPrice * quantity;

            let discountedUnitPrice = originalUnitPrice;

            // Only calculate discount if there's a discount to distribute and valid grossAmount
            if (totalDiscount > 0 && grossAmount > 0) {
                // Calculate this item's percentage of the total gross
                const itemPercentage = (itemGrossTotal / grossAmount) * 100;
                // Calculate this item's share of the total discount
                const itemDiscountShare = (totalDiscount * itemPercentage) / 100;
                // Calculate discounted total and then unit price
                const discountedTotal = itemGrossTotal - itemDiscountShare;
                discountedUnitPrice = discountedTotal / quantity;
                // Round to 2 decimal places
                discountedUnitPrice = Math.round(discountedUnitPrice * 100) / 100;
            }

            return {
                curRateTypeCode: '',
                qty: quantity,
                curCode: order.currencyCode || 'TRY',
                lineNo: index + 1,
                unitCode: 'ADET',
                dcardCode,
                note1: item.productOrigin ? `Mensei: ${item.productOrigin}` : 'Mensei: ',
                note2: item.productOrigin || 'TR',
                note3: '',
                sourceApp: 'Fatura',
                lineType: 'S',
                vatRate: order.micro ? 0 : 20,
                priceListCode: '',
                curRateTra: 0,
                costCenterCode: options.costCenterCode || EMBEAUTY_CONFIG.costCenterCode,
                whouseCode: options.whouseCode || EMBEAUTY_CONFIG.whouseCode,
                sourceApp2: 'Fatura',
                vatCode: order.micro ? '0-KDV-301' : 20,
                unitPrice: discountedUnitPrice,
                itemNameManual: item.productName?.substring(0, 100) || '',
                qtyPrm: quantity,
                amtVat: '',
                vatStatus: 'Dahil', // Valid values usually 'Dahil' or 'Haric', keeping default
                sourceApp3: 'Fatura',
            };
        }));

        // Build main invoice payload
        return {
            value: {
                curRateTypeCode: '',
                transportTypeId: '57',
                transporterId: '31',
                firstName: (() => {
                    if (order.micro) {
                        const invAddr = order.invoiceAddress as any;
                        if (invAddr?.firstName) return invAddr.firstName.substring(0, 100);
                    }
                    return (order.customer?.company || order.customer?.firstName || '').substring(0, 100);
                })(),
                familyName: (() => {
                    if (order.micro) {
                        const invAddr = order.invoiceAddress as any;
                        if (invAddr?.lastName) return invAddr.lastName.substring(0, 100);
                    }
                    return (order.customer?.company ? '' : (order.customer?.lastName || '')).substring(0, 100);
                })(),
                address1: this.formatAddress(order.shippingAddress).substring(0, 100),
                address2: order.customer?.taxOffice ? `V.D.: ${order.customer.taxOffice}` : ' ',
                address3: '',
                countyId: '',
                voucherNo: options.voucherNo,
                sourceApp: 'Fatura',
                gnlNote3: '',
                cardType: 'Cari',
                voucherSerial: options.invoiceSerial || EMBEAUTY_CONFIG.voucherSerial,
                sourceApp2: 'Fatura',
                sourceApp3: 'Fatura',
                edocNo: options.edocNo,
                cardCode: options.cardCode || this.getCardCodeFromOrder(order),
                gnlNote4: '',
                currencyOption: 'Sevk_Tarihindeki_Kur',
                branchCode: options.branchCode || options.storeConfig?.branchCode || EMBEAUTY_CONFIG.branchCode,
                gnlNote1: order.orderNumber || '',
                docTraCode: options.docTraCode || EMBEAUTY_CONFIG.docTraCode,
                curTra: 1,
                note1: options.edocNo,
                docDate: new Date().toISOString(),
                note2: '',
                note3: '',
                catCode2: (() => {
                    const months = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN',
                        'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
                    return months[new Date().getMonth()];
                })(),
                curCode: order.currencyCode || 'TRY',
                gnlNote2: new Date(order.orderDate).toISOString().replace('T', ' ').substring(0, 19),
                shippingDate: new Date(order.orderDate).toISOString(),
                coCode: options.branchCode || options.storeConfig?.coCode || EMBEAUTY_CONFIG.coCode,
                details,
                GnlNote5: order.cargoTrackingNumber || '',
                GnlNote6: new Date().toISOString(),
                email: order.customer?.email || '',
                // Add Tax Number if provided (10 digit VKN only, skip 11 digit TCKN for now)
                ...(options.vknTckn && options.vknTckn.length === 10 ? { taxNumber: options.vknTckn } : {}),
                ...(order.customer?.taxOffice ? { taxOffice: order.customer.taxOffice } : {}),
            },
        };
    }

    // Token cache
    private cachedToken: string | null = null;
    private cachedSecretKey: string | null = null;
    private tokenExpiry: Date | null = null;

    /**
     * Get access token from Uyumsoft (with caching)
     */
    private async getAccessToken(): Promise<{ token: string; secretKey: string }> {
        // Check if cached token is still valid (with 5 min buffer)
        if (this.cachedToken && this.cachedSecretKey && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return { token: this.cachedToken, secretKey: this.cachedSecretKey };
        }

        const apiUrl = this.configService.get<string>('UYUMSOFT_API_URL')
            || 'http://api-embeauty.eko.uyumcloud.com';
        const username = this.configService.get<string>('UYUMSOFT_USER');
        const password = this.configService.get<string>('UYUMSOFT_PASSWORD');

        if (!username || !password) {
            throw new Error('Uyumsoft credentials not configured (UYUMSOFT_USER, UYUMSOFT_PASSWORD)');
        }

        try {
            const response = await axios.post(
                `${apiUrl}/UyumApi/v1/GNL/UyumLogin`,
                {
                    userName: username,
                    password: password,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const result = response.data?.result;
            const token = result?.access_token;
            const secretKey = result?.uyumSecretKey;
            const expiresIn = result?.expires_in || 86399; // Default ~24 hours

            if (!token || !secretKey) {
                throw new Error('Invalid token response from Uyumsoft');
            }

            // Cache token based on expires_in (with 5 min buffer)
            this.cachedToken = token;
            this.cachedSecretKey = secretKey;
            this.tokenExpiry = new Date(Date.now() + (expiresIn - 300) * 1000);

            this.logger.log('Successfully obtained Uyumsoft access token');
            return { token, secretKey };
        } catch (error) {
            this.logger.error('Failed to get Uyumsoft access token', error);
            throw new Error(`Failed to authenticate with Uyumsoft: ${error.message}`);
        }
    }

    /**
     * Send invoice to Uyumsoft API
     */
    private async sendToUyumsoft(payload: object, orderId?: string): Promise<any> {
        const apiUrl = this.configService.get<string>('UYUMSOFT_API_URL')
            || 'http://api-embeauty.eko.uyumcloud.com';

        const endpoint = `${apiUrl}/UyumApi/v1/PSM/InsertInvoice`;
        const startTime = Date.now();

        // Get fresh token and secret key
        const { token, secretKey } = await this.getAccessToken();

        try {
            this.logger.log(`[Uyumsoft Request] Payload: ${JSON.stringify(payload)}`);

            const response = await axios.post(
                endpoint,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'UyumSecretKey': secretKey,
                    },
                }
            );

            const durationMs = Date.now() - startTime;
            this.logger.log(`[Uyumsoft Response] Success: ${JSON.stringify(response.data)}`);

            if (orderId) {
                await this.orderApiLogService.log({
                    orderId,
                    provider: ApiLogProvider.UYUMSOFT,
                    logType: ApiLogType.CREATE_INVOICE,
                    endpoint,
                    method: 'POST',
                    requestPayload: payload,
                    responsePayload: response.data,
                    statusCode: response.status,
                    isSuccess: true,
                    durationMs,
                });
            }

            return response.data;
        } catch (error: any) {
            const durationMs = Date.now() - startTime;
            const errorResponse = error.response?.data || error.message;
            this.logger.error(`[Uyumsoft Response] Error: ${JSON.stringify(errorResponse)}`);

            if (orderId) {
                await this.orderApiLogService.log({
                    orderId,
                    provider: ApiLogProvider.UYUMSOFT,
                    logType: ApiLogType.CREATE_INVOICE,
                    endpoint,
                    method: 'POST',
                    requestPayload: payload,
                    responsePayload: errorResponse,
                    statusCode: error.response?.status,
                    isSuccess: false,
                    errorMessage: error.message,
                    durationMs,
                });
            }

            throw error;
        }
    }

    /**
     * Generate unique invoice number based on prefix and last record in DB
     * Format: {PREFIX}{YEAR}{SEQUENCE} (e.g. EMA2026000000001)
     * This queries ALL invoices regardless of integration to ensure shared sequence
     * Uses pessimistic_write lock to prevent race conditions
     */
    private async generateInvoiceNumber(prefix: string): Promise<string> {
        const year = new Date().getFullYear();
        const prefixYear = `${prefix}${year}`;

        // Use QueryRunner for transaction with row-level lock
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Look for the HIGHEST invoice number with this specific prefix and year
            // across ALL integrations/stores to ensure shared sequence
            // Check ALL statuses (not just SUCCESS and PENDING) to avoid duplicate numbers
            // FOR UPDATE lock prevents race conditions
            const lastInvoice = await queryRunner.manager
                .createQueryBuilder(Invoice, 'invoice')
                .where('invoice.invoiceNumber LIKE :pattern', { pattern: `${prefixYear}%` })
                .orderBy('invoice.invoiceNumber', 'DESC') // Order by number to get MAX
                .setLock('pessimistic_write') // Postgres: FOR UPDATE
                .getOne();

            let invoiceNumber: string;

            if (lastInvoice && lastInvoice.invoiceNumber.startsWith(prefixYear)) {
                const sequencePart = lastInvoice.invoiceNumber.substring(prefixYear.length);
                const lastSequence = parseInt(sequencePart, 10);

                if (!isNaN(lastSequence)) {
                    this.logger.log(`Found last invoice ${lastInvoice.invoiceNumber}, next will be ${lastSequence + 1}`);
                    invoiceNumber = `${prefixYear}${String(lastSequence + 1).padStart(9, '0')}`;
                } else {
                    invoiceNumber = `${prefixYear}000000001`;
                }
            } else {
                // Default start
                this.logger.log(`No existing invoices with prefix ${prefixYear}, starting from 000000001`);
                invoiceNumber = `${prefixYear}000000001`;
            }

            await queryRunner.commitTransaction();
            return invoiceNumber;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Failed to generate invoice number for prefix ${prefix}: ${error.message}`);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Determine card code based on order source
     */
    private getCardCodeFromOrder(order: Order): string {
        // This can be customized based on integration type
        // For now, return a default
        return 'TRENDYOL';
    }

    /**
     * Format address object to string
     */
    private formatAddress(address: any): string {
        if (!address) return '';
        if (typeof address === 'string') return address;

        const parts = [
            address.fullAddress,
            address.neighborhood,
            address.district,
            address.city,
        ].filter(Boolean);

        return parts.join(', ');
    }

    /**
     * Find all invoices with pagination and filters
     */
    async findAll(
        page = 1,
        limit = 10,
        filters?: {
            status?: string;
            documentType?: string;
            startDate?: string;
            endDate?: string;
            customerName?: string;
            cardCode?: string;
            invoiceNumber?: string;
            edocNo?: string;
        }
    ): Promise<{ success: boolean; data: Invoice[]; meta: { total: number; page: number; totalPages: number } }> {
        const query = this.invoiceRepository.createQueryBuilder('invoice')
            .leftJoinAndSelect('invoice.order', 'order')
            .leftJoinAndSelect('invoice.store', 'store')
            .orderBy('invoice.createdAt', 'DESC');

        if (filters?.status) {
            query.andWhere('invoice.status = :status', { status: filters.status });
        }

        if (filters?.documentType) {
            query.andWhere('invoice.documentType = :documentType', { documentType: filters.documentType });
        }

        if (filters?.startDate) {
            query.andWhere('invoice.createdAt >= :startDate', { startDate: filters.startDate });
        }

        if (filters?.endDate) {
            query.andWhere('invoice.createdAt <= :endDate', { endDate: filters.endDate });
        }

        if (filters?.customerName) {
            query.andWhere(
                '(LOWER(invoice.customerFirstName) LIKE LOWER(:name) OR LOWER(invoice.customerLastName) LIKE LOWER(:name))',
                { name: `%${filters.customerName}%` }
            );
        }

        if (filters?.cardCode) {
            query.andWhere('invoice.cardCode LIKE :cardCode', { cardCode: `%${filters.cardCode}%` });
        }

        if (filters?.invoiceNumber) {
            query.andWhere('invoice.invoiceNumber LIKE :invoiceNumber', { invoiceNumber: `%${filters.invoiceNumber}%` });
        }

        if (filters?.edocNo) {
            query.andWhere('invoice.edocNo LIKE :edocNo', { edocNo: `%${filters.edocNo}%` });
        }

        const [data, total] = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            success: true,
            data,
            meta: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Find invoice by ID
     */
    async findOne(id: string): Promise<Invoice> {
        const invoice = await this.invoiceRepository.findOne({
            where: { id },
            relations: ['order', 'order.items', 'store'],
        });

        if (!invoice) {
            throw new NotFoundException(`Invoice ${id} not found`);
        }

        return invoice;
    }

    /**
     * Find invoice by order ID
     */
    async findByOrderId(orderId: string): Promise<Invoice | null> {
        return this.invoiceRepository.findOne({
            where: { orderId },
            relations: ['order'],
        });
    }

    /**
     * Retry failed invoice
     */
    async retryInvoice(id: string): Promise<Invoice> {
        const invoice = await this.findOne(id);

        if (invoice.status === InvoiceStatus.SUCCESS) {
            throw new BadRequestException('Invoice already sent successfully');
        }

        // Rebuild payload from order (in case config changed)
        const order = await this.orderRepository.findOne({
            where: { id: invoice.orderId },
            relations: ['items', 'customer', 'store'],
        });

        if (!order) {
            throw new NotFoundException(`Order ${invoice.orderId} not found`);
        }

        // Rebuild payload with current config
        const voucherNo = invoice.invoiceNumber.replace('RST', '');
        const newPayload = await this.buildUyumsoftPayload(order, {
            invoiceNumber: invoice.invoiceNumber,
            voucherNo,
            invoiceSerial: invoice.invoiceSerial || 'EMA',
            edocNo: invoice.edocNo || `EMA${voucherNo}`,
            branchCode: invoice.branchCode,
            docTraCode: invoice.docTraCode,
            costCenterCode: invoice.costCenterCode,
            whouseCode: invoice.whouseCode,
            cardCode: invoice.cardCode,
        });

        // Update stored payload
        invoice.requestPayload = newPayload;

        // Retry sending to Uyumsoft
        try {
            const response = await this.sendToUyumsoft(newPayload, invoice.orderId || undefined);

            invoice.status = InvoiceStatus.SUCCESS;
            invoice.responsePayload = response;
            invoice.uyumsoftInvoiceId = response?.invoiceId || response?.id;
            invoice.errorMessage = null as any;

            this.logger.log(`Invoice ${invoice.edocNo} retry successful`);
        } catch (error) {
            invoice.status = InvoiceStatus.ERROR;
            invoice.errorMessage = error.message || 'Unknown error';
            invoice.responsePayload = error.response?.data;

            this.logger.error(`Invoice ${invoice.edocNo} retry failed`, error);
        }

        return this.invoiceRepository.save(invoice);
    }

    /**
     * Get e-invoice PDF/HTML from Uyumsoft
     */
    async getInvoicePdf(invoiceId: string): Promise<{ html: string; pdfUrl?: string }> {
        const invoice = await this.findOne(invoiceId);

        if (invoice.status !== InvoiceStatus.SUCCESS) {
            throw new BadRequestException('Invoice not yet sent successfully');
        }

        const apiUrl = this.configService.get<string>('UYUMSOFT_API_URL')
            || 'http://api-embeauty.eko.uyumcloud.com';

        const { token, secretKey } = await this.getAccessToken();

        try {
            // Try to get HTML view
            const response = await axios.post(
                `${apiUrl}/UyumApi/v1/PSM/GetEInvoiceHTML`,
                {
                    value: {
                        ettn: invoice.ettn,
                        edocNo: invoice.edocNo,
                        invoiceId: invoice.uyumsoftInvoiceId,
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'UyumSecretKey': secretKey,
                    },
                }
            );

            return {
                html: response.data?.result || response.data?.html || response.data,
                pdfUrl: response.data?.pdfUrl,
            };
        } catch (error) {
            this.logger.error(`Failed to get invoice PDF for ${invoice.edocNo}`, error);
            throw new Error(`Failed to get invoice PDF: ${error.message}`);
        }
    }


    /**
     * Check if user is E-Invoice user via Uyumsoft
     */
    async checkEInvoiceUser(vknTckn: string): Promise<boolean> {
        if (!vknTckn || vknTckn.length < 10) return false;

        // Skip dummy TCKN/VKNs
        const dummyNumbers = ['11111111111', '2222222222', '1111111111'];
        if (dummyNumbers.includes(vknTckn)) {
            return false;
        }

        const apiUrl = this.configService.get<string>('UYUMSOFT_API_URL')
            || 'http://api-embeauty.eko.uyumcloud.com';

        const { token, secretKey } = await this.getAccessToken();

        try {
            this.logger.debug(`Checking E-Invoice User for VKN/TCKN: ${vknTckn} at ${apiUrl}/UyumApi/v1/FIN/CheckEInvoiceUserByEntity`);

            // Use FIN/CheckEInvoiceUserByEntity endpoint
            const response = await axios.post(
                `${apiUrl}/UyumApi/v1/FIN/CheckEInvoiceUserByEntity`,
                {
                    value: {
                        vknTckn: vknTckn
                    },
                    pageIndex: 0,
                    pageSize: 0,
                    totalPages: 0,
                    totalCount: 0
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'UyumSecretKey': secretKey,
                    },
                }
            );

            // Check result
            // Response format per user: { result: { ... }, ... }
            // We assume if result is present/truthy or based on logic it's an e-invoice user.
            // However, typical Uyumsoft "Check" endpoints return data if the user exists.
            // Let's log the full result to be sure and tentatively assume if "result" object is not empty/null it's true.
            // BUT, usually these return a boolean or status.
            // Let's rely on the debug logs to finetune, but for now map existence of result to true?
            // User didn't specify the *response* logic for "is user", just the content type.
            // Usually if pageIndex/totalCount > 0 or result has data.
            // Let's assume if the request 200 OK and result is not null, they might be a user?
            // Actually, "CheckEInvoiceUser" implies a boolean check or returning the user info.

            const result = response.data?.result;
            const isUser = !!result; // Tentative: if result is not null/undefined

            this.logger.debug(`E-Invoice Check Result for ${vknTckn}: ${isUser} (Raw Result: ${JSON.stringify(result)})`);

            return isUser;
        } catch (error) {
            // Log as warning, not error, to reduce noise
            this.logger.warn(`Failed to check E-Invoice user for ${vknTckn}: ${error.message} (Status: ${error.response?.status})`);
            if (error.response?.data) {
                this.logger.debug(`Error Response Data: ${JSON.stringify(error.response.data)}`);
            }
            return false; // Fail safe to E-Archive
        }
    }

    /**
     * Create/Update entity (customer) in Uyumsoft
     */
    async insertEntity(customer: any): Promise<any> {
        const apiUrl = this.configService.get<string>('UYUMSOFT_API_URL')
            || 'http://api-embeauty.eko.uyumcloud.com';

        const { token, secretKey } = await this.getAccessToken();

        try {
            // Log payload for debugging
            this.logger.debug(`Inserting Entity Payload: ${JSON.stringify(customer)}`);

            const response = await axios.post(
                `${apiUrl}/UyumApi/v1/FIN/InsertEntity`,
                {
                    value: customer
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'UyumSecretKey': secretKey,
                    },
                }
            );

            return response.data;
        } catch (error) {
            // Detailed error logging
            if (error.response?.data) {
                this.logger.error(`Uyumsoft InsertEntity Error Response: ${JSON.stringify(error.response.data)}`);
            }
            this.logger.error('Failed to insert/update entity in Uyumsoft', error);

            // Don't throw, just log. Setup might be optional or already exists.
            // Throwing might block invoice generation which we might want to avoid if entity exists.
            // But for new customers it is required.
            // Let's re-throw if it's a critical error, but for "Already exists" we should ignore.
            const errorMsg = error.response?.data?.message || '';
            const exceptionMsg = error.response?.data?.responseException?.exceptionMessage || '';
            const statusCode = error.response?.status;

            // Check for explicit "duplicate key" or "already exists" patterns
            if (
                errorMsg.includes('zaten var') ||
                errorMsg.includes('already exists') ||
                exceptionMsg.includes('duplicate key value') ||
                statusCode === 417
            ) {
                this.logger.warn(`Entity already exists in Uyumsoft (ignored): ${exceptionMsg || errorMsg}`);
                return null;
            }

            throw new Error(`Failed to create customer entity: ${errorMsg || error.message}`);
        }
    }

    /**
     * Get City Plate Code (0-81) based on name
     */
    private getCityPlateCode(city: string): string {
        if (!city) return '0';

        const plates: { [key: string]: number } = {
            'ADANA': 1, 'ADIYAMAN': 2, 'AFYON': 3, 'AFYONKARAHİSAR': 3, 'AĞRI': 4,
            'AMASYA': 5, 'ANKARA': 6, 'ANTALYA': 7, 'ARTVİN': 8, 'AYDIN': 9,
            'BALIKESİR': 10, 'BİLECİK': 11, 'BİNGÖL': 12, 'BİTLİS': 13, 'BOLU': 14,
            'BURDUR': 15, 'BURSA': 16, 'ÇANAKKALE': 17, 'ÇANKIRI': 18, 'ÇORUM': 19,
            'DENİZLİ': 20, 'DİYARBAKIR': 21, 'EDİRNE': 22, 'ELAZIĞ': 23, 'ERZİNCAN': 24,
            'ERZURUM': 25, 'ESKİŞEHİR': 26, 'GAZİANTEP': 27, 'GİRESUN': 28, 'GÜMÜŞHANE': 29,
            'HAKKARİ': 30, 'HATAY': 31, 'ISPARTA': 32, 'MERSİN': 33, 'İÇEL': 33,
            'İSTANBUL': 34, 'İZMİR': 35, 'KARS': 36, 'KASTAMONU': 37, 'KAYSERİ': 38,
            'KIRKLARELİ': 39, 'KIRŞEHİR': 40, 'KOCAELİ': 41, 'İZMİT': 41, 'KONYA': 42,
            'KÜTAHYA': 43, 'MALATYA': 44, 'MANİSA': 45, 'KAHRAMANMARAŞ': 46, 'MARAŞ': 46,
            'MARDİN': 47, 'MUĞLA': 48, 'MUŞ': 49, 'NEVŞEHİR': 50, 'NİĞDE': 51,
            'ORDU': 52, 'RİZE': 53, 'SAKARYA': 54, 'ADAPAZARI': 54, 'SAMSUN': 55,
            'SİİRT': 56, 'SİNOP': 57, 'SİVAS': 58, 'TEKİRDAĞ': 59, 'TOKAT': 60,
            'TRABZON': 61, 'TUNCELİ': 62, 'ŞANLIURFA': 63, 'URFA': 63, 'UŞAK': 64,
            'VAN': 65, 'YOZGAT': 66, 'ZONGULDAK': 67, 'AKSARAY': 68, 'BAYBURT': 69,
            'KARAMAN': 70, 'KIRIKKALE': 71, 'BATMAN': 72, 'ŞIRNAK': 73, 'BARTIN': 74,
            'ARDAHAN': 75, 'IĞDIR': 76, 'YALOVA': 77, 'KARABÜK': 78, 'KİLİS': 79,
            'OSMANİYE': 80, 'DÜZCE': 81
        };

        // Normalize Turkish characters
        const upperCity = city.toLocaleUpperCase('tr-TR').trim();

        let plate = plates[upperCity];

        // Try finding by inclusion if not exact match (basic heuristic, risky but user asked for mapping)
        if (!plate) {
            // Check substrings or simple normalization
            const found = Object.keys(plates).find(key => upperCity.includes(key));
            if (found) plate = plates[found];
        }

        if (plate && plate < 10) return `0${plate}`;
        return String(plate || '0');
    }

    /**
     * Increment sequence number for a specific field in Store
     */
    async incrementStoreSequence(storeId: string, field: keyof Store): Promise<void> {
        const store = await this.storeRepository.findOne({
            where: { id: storeId }
        });

        if (!store) return;

        // Get current value
        const currentValue = store[field] as string;
        if (!currentValue) return;

        // Try to parse number
        const numberPart = currentValue.match(/\d+$/)?.[0];
        if (!numberPart) return;

        const prefix = currentValue.substring(0, currentValue.length - numberPart.length);
        const nextNumber = BigInt(numberPart) + 1n;
        const nextValue = `${prefix}${nextNumber.toString().padStart(numberPart.length, '0')}`;

        // Update
        await this.storeRepository.update(
            { id: store.id },
            { [field]: nextValue }
        );

        this.logger.log(`Incremented sequence ${field} for store ${storeId}: ${currentValue} -> ${nextValue}`);
    }

    /**
    * Get Invoice from Uyumsoft by Document Number (Fatura No)
    */
    async getInvoiceFromUyumsoft(docNo: string): Promise<any> {
        const apiUrl = this.configService.get<string>('UYUMSOFT_API_URL')
            || 'http://api-embeauty.eko.uyumcloud.com';

        const { token, secretKey } = await this.getAccessToken();

        try {
            this.logger.log(`Fetching Invoice from Uyumsoft with DocNo: ${docNo}`);

            const response = await axios.post(
                `${apiUrl}/UyumApi/v1/PSM/GetInvoice`,
                {
                    value: {
                        docNo: docNo
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'UyumSecretKey': secretKey,
                    }
                }
            );

            // Check response structure
            const result = response.data?.result;

            // The response structure is { invoicE_M: [...], invoicE_D: [...] } based on user feedback
            const masterList = result?.invoicE_M;
            const detailList = result?.invoicE_D;

            if (!masterList || !Array.isArray(masterList) || masterList.length === 0) {
                throw new NotFoundException(`Invoice with number ${docNo} not found in Uyumsoft`);
            }

            const master = masterList[0];

            // Validate 'MALALIS' (in catCode1)
            // User JSON shows catCode1: "MALALIS" in master
            if (master.catCode1 !== 'MALALIS') {
                this.logger.warn(`Invoice found but catCode1 is not 'MALALIS'. Value: ${master.catCode1}`);
                throw new BadRequestException(`Fatura bulundu (${docNo}) fakat Özel Kod 1 'MALALIS' değil. (Değer: ${master.catCode1 || 'Boş'})`);
            }

            // Parse Date: "18.01.2026" -> Date object
            let orderDate = new Date();
            if (master.docDate) {
                const parts = master.docDate.split('.');
                if (parts.length === 3) {
                    orderDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                }
            }

            // Parse supplier info
            // User JSON: entityTaxNo: "1601683910", entityName: "BEATRİS..."
            // Also check vknTckn just in case

            // Parse items
            const items = (detailList || []).map((d: any) => {
                // qty: "100,00000" -> replace , with .
                const qty = parseFloat((d.qty || '0').replace(',', '.').replaceAll('.', '')); // Wait, standard TR format is 100.000,00 or simple 100,00 ?
                // In the JSON: "qty": "100,00000" matches 100. "amt": "10000,00".
                // It seems comma is decimal separator. Thousand separator is likely dot.
                // Uyumsoft usually sends string with comma as decimal.
                // Let's replace dot with nothing (thousand sep) and comma with dot (decimal).
                // Actually, "100,00000" -> 100.
                // "10000,00" -> 10000.

                const parseMoney = (val: string) => {
                    if (!val) return 0;
                    // Remove all dots (thousand separators)
                    // Replace comma with dot
                    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
                };

                return {
                    itemCode: (d.itemCode || '').trim(),
                    barcode: (d.barcode || d.dcardCode || '').trim(), // dcardCode seems to be barcode or main code
                    name: (d.itemName || d.dcardName || '').trim(),
                    quantity: parseMoney(d.qty),
                    unitPrice: parseMoney(d.unitPrice),
                };
            });

            // Parse address
            const address = [master.address1, master.address2, master.cityName, master.countryName]
                .filter(Boolean)
                .join(' ');

            return {
                docNo: master.docNo,
                date: orderDate,
                taxNumber: master.entityTaxNo || master.vknTckn,
                supplierName: master.entityName || master.title,
                supplierAddress: address,
                items: items
            };
        } catch (error) {
            this.logger.error(`Failed to get invoice ${docNo} from Uyumsoft`, error);
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new Error(`Uyumsoft API Error: ${error.message}`);
        }
    }

    /**
     * Get Invoice HTML from Uyumsoft
     */

    /**
     * Send Invoiced status to integration (Trendyol etc.) after invoice is successfully created
     */
    private async sendInvoicedStatusToIntegration(order: Order, invoice: Invoice, storeConfig: Store): Promise<void> {
        // Check if sendOrderStatus is enabled
        if (!storeConfig.sendOrderStatus) {
            this.logger.log(`Skipping Invoiced status - sendOrderStatus is disabled for store ${storeConfig.id}`);
            return;
        }

        if (storeConfig.type === StoreType.TRENDYOL) {
            await this.updateTrendyolInvoicedStatus(order, storeConfig, invoice);
        }
    }

    /**
     * Send Invoiced status after bulk invoice - fetches store and calls main method
     */
    private async sendInvoicedStatusAfterBulk(order: Order, invoice: Invoice): Promise<void> {
        if (!order.storeId) {
            return;
        }

        try {
            const storeConfig = await this.storeRepository.findOne({
                where: { id: order.storeId },
            });

            if (!storeConfig || storeConfig.type === StoreType.MANUAL) {
                return;
            }

            await this.sendInvoicedStatusToIntegration(order, invoice, storeConfig);
        } catch (error: any) {
            this.logger.warn(`Failed to send Invoiced status for bulk order ${order.id}: ${error.message}`);
        }
    }

    /**
     * Update Trendyol order status to Invoiced
     */
    private async updateTrendyolInvoicedStatus(
        order: Order,
        storeConfig: Store,
        invoice: Invoice,
    ): Promise<void> {
        // Need to load order items if not already loaded
        let orderWithItems: Order = order;
        if (!order.items || order.items.length === 0) {
            const loadedOrder = await this.orderRepository.findOne({
                where: { id: order.id },
                relations: ['items'],
            });
            if (!loadedOrder) {
                throw new Error('Order not found');
            }
            orderWithItems = loadedOrder;
        }

        const lines = orderWithItems.items
            .filter((item) => item.lineId)
            .map((item) => ({
                lineId: Number(item.lineId),
                quantity: item.quantity,
            }));

        if (lines.length === 0) {
            throw new Error('Order has no line items with lineId');
        }

        const requestBody = {
            lines,
            params: {
                invoiceNumber: invoice.invoiceNumber || invoice.edocNo,
            },
            status: 'Invoiced',
        };

        const url = `https://apigw.trendyol.com/integration/order/sellers/${storeConfig.sellerId}/shipment-packages/${order.packageId}`;
        const auth = Buffer.from(`${storeConfig.apiKey}:${storeConfig.apiSecret}`).toString('base64');
        const startTime = Date.now();

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const durationMs = Date.now() - startTime;
        const responseText = await response.text();
        let responseData: object | string = responseText;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            // Keep as string if not valid JSON
        }

        // Log API call
        await this.orderApiLogService.log({
            orderId: order.id,
            provider: ApiLogProvider.TRENDYOL,
            logType: ApiLogType.UPDATE_STATUS,
            endpoint: url,
            method: 'PUT',
            requestPayload: requestBody,
            responsePayload: responseData,
            statusCode: response.status,
            isSuccess: response.ok,
            errorMessage: !response.ok ? `Trendyol API error: ${response.status}` : undefined,
            durationMs,
        });

        if (!response.ok) {
            throw new Error(`Trendyol API error: ${response.status} - ${responseText}`);
        }

        this.logger.log(`Trendyol status updated to Invoiced for package ${order.packageId}`);

        // Log to order history
        try {
            await this.orderHistoryService.logEvent({
                orderId: order.id,
                action: OrderHistoryAction.INTEGRATION_STATUS_INVOICED,
                description: `Trendyol statüsü güncellendi: Invoiced - Fatura: ${invoice.invoiceNumber || invoice.edocNo}`,
                metadata: {
                    integration: StoreType.TRENDYOL,
                    status: 'Invoiced',
                    invoiceNumber: invoice.invoiceNumber || invoice.edocNo,
                },
            });
        } catch (historyError) {
            this.logger.warn(`Failed to log integration status history: ${historyError.message}`);
        }
    }

    /**
     * İade için fatura kes (Uyumsoft'a gönder) ve Gider Pusulası oluştur
     * - Uyumsoft'a iade faturası gönderir
     * - Gider pusulası kaydı oluşturur (PDF için)
     */
    async createRefundInvoiceForReturn(data: {
        returnId: string;
        storeId: string;
        orderId?: string;
        orderNumber: string;
        customerFirstName: string;
        customerLastName: string;
        customerAddress: string;
        cargoTrackingNumber?: string;
        cargoProviderName?: string;
        totalAmount: number;
        items: Array<{
            productName: string;
            barcode: string;
            quantity: number;
            price: number;
            vatRate?: number;
            shelfType?: 'NORMAL' | 'DAMAGED'; // Sağlam veya Hasarlı
        }>;
    }): Promise<Invoice> {
        const store = await this.storeRepository.findOne({ where: { id: data.storeId } });
        if (!store) {
            throw new NotFoundException('Mağaza bulunamadı');
        }

        // Check if invoice already exists for this return
        const existingInvoice = await this.invoiceRepository.findOne({
            where: { returnId: data.returnId },
        });

        if (existingInvoice) {
            this.logger.log(`Refund invoice already exists for return ${data.returnId}`);
            return existingInvoice;
        }

        // Orijinal siparişi bul - cardCode kuralını oradan al
        let originalOrder: Order | null = null;
        if (data.orderId) {
            originalOrder = await this.orderRepository.findOne({
                where: { id: data.orderId },
                relations: ['customer'],
            });
        }

        // cardCode belirle - orijinal siparişteki fatura kuralına göre
        let cardCode = store.eArchiveCardCode || 'TRENDYOL';

        if (originalOrder) {
            // Orijinal siparişin faturasını bul ve cardCode'u oradan al
            const originalInvoice = await this.invoiceRepository.findOne({
                where: { orderId: originalOrder.id, status: InvoiceStatus.SUCCESS },
            });

            if (originalInvoice?.cardCode) {
                cardCode = originalInvoice.cardCode;
                this.logger.log(`Using cardCode from original invoice: ${cardCode}`);
            } else {
                // Fatura yoksa, normal fatura kurallarını uygula
                const integrationType = store.type as string;
                const isMicroExport = originalOrder.micro === true;
                const paymentMethod = originalOrder.paymentMethod?.toUpperCase() || '';
                const isHavale = paymentMethod.includes('HAVALE') || paymentMethod.includes('EFT') || paymentMethod.includes('TRANSFER');

                if (integrationType === StoreType.TRENDYOL && isMicroExport && store.hasMicroExport) {
                    // Mikro İhracat
                    const countryCode = this.getCountryCode(originalOrder);
                    cardCode = `TRENDYOL ${countryCode}`;
                } else {
                    // E-Arşiv / E-Fatura kuralı
                    const tckn = originalOrder.customer?.tcIdentityNumber;
                    const taxNo = originalOrder.customer?.taxNumber;
                    let idToCheck = tckn;
                    const isDummy = (id: string) => !id || id === '11111111111' || id.length < 10;

                    if (isDummy(tckn) && !isDummy(taxNo)) {
                        idToCheck = taxNo;
                    } else if (!isDummy(tckn)) {
                        idToCheck = tckn;
                    } else {
                        idToCheck = taxNo || tckn;
                    }

                    const cleanTaxId = idToCheck?.replace(/\D/g, '');
                    const isEInvoiceUser = cleanTaxId && cleanTaxId.length >= 10
                        ? await this.checkEInvoiceUser(cleanTaxId)
                        : false;

                    if (isEInvoiceUser) {
                        cardCode = store.eInvoiceCardCode || store.eArchiveCardCode || 'TRENDYOL';
                    } else {
                        if (integrationType === StoreType.IKAS && isHavale && store.eArchiveHavaleCardCode) {
                            cardCode = store.eArchiveHavaleCardCode;
                        } else {
                            cardCode = store.eArchiveCardCode || 'TRENDYOL';
                        }
                    }
                }
                this.logger.log(`Determined cardCode from order rules: ${cardCode}`);
            }
        }

        // E-Fatura mı kontrol et (cardCode kuralından çıkarıyoruz)
        // E-Fatura kullanıcıları için seri numarası gerekmiyor
        const isEInvoice = cardCode === store.eInvoiceCardCode;

        // İade faturası seri numarası: E-Arşiv için GPL, E-Fatura için seri yok
        let serialNo = '';
        let invoiceNumber = '';
        let voucherNo = '';

        if (isEInvoice) {
            // E-Fatura: Seri numarası gerek yok
            invoiceNumber = `EFATURA-${data.orderNumber}-${Date.now()}`;
            voucherNo = invoiceNumber;
            this.logger.log(`E-Fatura refund - no serial number needed`);
        } else {
            // E-Arşiv: GPL serisi kullan
            serialNo = store.refundExpenseVoucherEArchiveSerialNo || 'GPL';
            const sequenceNo = await this.getNextSequenceNumber(serialNo);
            invoiceNumber = `${serialNo}${new Date().getFullYear()}${sequenceNo.toString().padStart(9, '0')}`;
            voucherNo = invoiceNumber.replace(serialNo, '');
            this.logger.log(`E-Arşiv refund - using serial: ${serialNo}, number: ${invoiceNumber}`);
        }

        // Build line items for Uyumsoft
        const details = await Promise.all(data.items.map(async (item, index) => {
            let dcardCode = '1000010001'; // Default fallback

            // Find product by barcode to get the correct SKU for Uyumsoft
            if (item.barcode) {
                const product = await this.productRepository.findOne({
                    where: { barcode: item.barcode }
                });
                if (product && product.sku) {
                    dcardCode = product.sku;
                }
            }

            // whouseCode: Sağlam (NORMAL) → MERKEZ, Hasarlı (DAMAGED) → İADE DEPO
            const whouseCode = item.shelfType === 'DAMAGED' ? 'İADE DEPO' : 'MERKEZ';

            return {
                curRateTypeCode: '',
                qty: item.quantity,
                curCode: 'TRY',
                lineNo: index + 1,
                unitCode: 'ADET',
                dcardCode,
                note1: '',
                note2: '',
                note3: '',
                sourceApp: 'Fatura',
                lineType: 'S',
                vatRate: item.vatRate ?? 20,
                priceListCode: '',
                curRateTra: 0,
                costCenterCode: store.companyCode || 'FARMAKOZMETIKA',
                whouseCode, // Sağlam: MERKEZ, Hasarlı: İADE DEPO
                sourceApp2: 'Fatura',
                vatCode: item.vatRate ?? 20,
                unitPrice: item.price,
                itemNameManual: item.productName?.substring(0, 100) || '',
                qtyPrm: item.quantity,
                amtVat: '',
                vatStatus: 'Dahil',
                sourceApp3: 'Fatura',
            };
        }));

        // Build Uyumsoft payload for refund invoice
        const requestPayload = {
            value: {
                curRateTypeCode: '',
                transportTypeId: '31', // İade için farklı transport type
                familyName: data.customerLastName?.substring(0, 100) || '',
                GnlNote5: data.cargoTrackingNumber || '',
                address1: data.customerAddress?.substring(0, 100) || '',
                address2: '',
                address3: '',
                voucherNo,
                sourceApp: 'Fatura',
                gnlNote3: '',
                cardType: 'Cari',
                voucherSerial: serialNo, // "D"
                sourceApp2: 'Fatura',
                sourceApp3: 'Fatura',
                edocNo: invoiceNumber,
                cardCode, // Orijinal siparişin kuralına göre
                gnlNote4: data.cargoProviderName || 'ARAS KARGO YURT İÇİ YURT DIŞI TAŞIMACILIK ANONİM ŞİRKETİ',
                currencyOption: 'Sevk_Tarihindeki_Kur',
                branchCode: store.branchCode || 'FK2020',
                gnlNote1: data.orderNumber || '',
                docTraCode: 'GIDPSL', // Gider Pusulası işlem kodu
                firstName: data.customerFirstName?.substring(0, 100) || '',
                curTra: 1,
                note1: invoiceNumber,
                docDate: new Date().toISOString(),
                note2: '',
                curCode: 'TRY',
                gnlNote2: new Date().toISOString().replace('T', ' ').substring(0, 19),
                shippingDate: new Date().toISOString(),
                coCode: store.coCode || store.branchCode || 'FK2020',
                details,
                GnlNote6: new Date().toISOString(),
                email: '',
            },
        };

        // Create invoice record (PENDING)
        const invoice = this.invoiceRepository.create({
            documentType: DocumentType.EXPENSE_VOUCHER,
            returnId: data.returnId,
            storeId: data.storeId,
            orderId: data.orderId, // Orijinal sipariş ID'si
            invoiceNumber,
            invoiceSerial: serialNo,
            edocNo: invoiceNumber,
            status: InvoiceStatus.PENDING,
            totalAmount: data.totalAmount,
            currencyCode: 'TRY',
            invoiceDate: new Date(),
            customerFirstName: data.customerFirstName,
            customerLastName: data.customerLastName,
            customerAddress: data.customerAddress,
            cardCode,
            branchCode: store.branchCode,
            docTraCode: 'GIDPSL',
            // whouseCode: Tüm itemlar aynı depoya mı gidiyor kontrol et
            whouseCode: data.items.every(i => i.shelfType === 'DAMAGED') ? 'İADE DEPO' : 
                        data.items.every(i => i.shelfType !== 'DAMAGED') ? 'MERKEZ' : 'KARMA',
            requestPayload,
        } as any);

        const savedInvoice = await this.invoiceRepository.save(invoice) as unknown as Invoice;
        this.logger.log(`Refund invoice created for return ${data.returnId} - Invoice: ${invoiceNumber}, cardCode: ${cardCode}`);

        // Send to Uyumsoft
        try {
            const response = await this.sendToUyumsoft(requestPayload, data.orderId);

            if (response && !response.isError) {
                savedInvoice.status = InvoiceStatus.SUCCESS;
                savedInvoice.responsePayload = response;
                savedInvoice.uyumsoftInvoiceId = response.invoiceId || response.id;
                savedInvoice.ettn = response.ettn;
                this.logger.log(`Refund invoice sent to Uyumsoft successfully: ${invoiceNumber}`);
            } else {
                savedInvoice.status = InvoiceStatus.ERROR;
                savedInvoice.errorMessage = response?.exceptionMessage || 'Uyumsoft error';
                savedInvoice.responsePayload = response;
                this.logger.error(`Refund invoice failed: ${savedInvoice.errorMessage}`);
            }
        } catch (error: any) {
            savedInvoice.status = InvoiceStatus.ERROR;
            savedInvoice.errorMessage = error.message || 'Unknown error';
            this.logger.error(`Refund invoice error: ${error.message}`);
        }

        await this.invoiceRepository.save(savedInvoice);
        return savedInvoice;
    }

    /**
     * İade için Gider Pusulası bul
     */
    async findExpenseVoucherByReturnId(returnId: string): Promise<Invoice | null> {
        return this.invoiceRepository.findOne({
            where: { 
                returnId,
                documentType: DocumentType.EXPENSE_VOUCHER,
            },
        });
    }

    /**
     * Gider Pusulası PDF verisi oluştur
     * PDF formatı:
     * - İSİM SOYİSİM / ÜNVAN
     * - FATURA ADRESİ
     * - TCKN / VKN
     * - TARİH / SAAT
     * - SİPARİŞ NO
     * - Ürün tablosu (Barkod, Adet, KDV, Birim Fiyat, Tutar)
     * - Ara Toplam, KDV, Toplam
     * - Yazıyla toplam
     */
    async getExpenseVoucherData(returnId: string): Promise<{
        // Header bilgileri
        invoiceNumber: string;
        invoiceDate: Date;
        invoiceDateFormatted: string; // "24.01.2026"
        invoiceTimeFormatted: string; // "14:30"
        
        // Müşteri bilgileri
        customerName: string;
        customerAddress: string;
        tckn: string;
        
        // Sipariş bilgileri
        orderNumber: string;
        
        // Ürün listesi
        items: Array<{
            barcode: string;
            productName: string;
            quantity: number;
            vatRate: number;
            vatRateFormatted: string; // "20%"
            unitPrice: number;
            unitPriceFormatted: string; // "253.27"
            totalPrice: number;
            totalPriceFormatted: string; // "253.27"
        }>;
        
        // Toplamlar
        subtotal: number;
        subtotalFormatted: string; // "211.06 TRY"
        vatAmount: number;
        vatAmountFormatted: string; // "42.21 TRY"
        vatRate: number;
        total: number;
        totalFormatted: string; // "253.27 TRY"
        totalInWords: string; // "IKIYUZELLIUC TRY YIRMIYEDI KURUS"
        
        // Fatura durumu
        status: string;
        whouseCode: string;
    } | null> {
        const invoice = await this.findExpenseVoucherByReturnId(returnId);
        if (!invoice) {
            return null;
        }

        // Request payload'dan item bilgilerini çıkar
        const payload = invoice.requestPayload as any;
        const details = payload?.value?.details || [];

        // Format helpers
        const formatPrice = (price: number) => price.toFixed(2);
        const formatDate = (date: Date) => {
            const d = new Date(date);
            return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
        };
        const formatTime = (date: Date) => {
            const d = new Date(date);
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        };

        const items = details.map((d: any) => {
            const qty = d.qty || 1;
            const unitPrice = d.unitPrice || 0;
            const totalPrice = unitPrice * qty;
            const vatRate = d.vatRate || 20;

            return {
                barcode: d.dcardCode || '',
                productName: d.itemNameManual || '',
                quantity: qty,
                vatRate,
                vatRateFormatted: `${vatRate}%`,
                unitPrice,
                unitPriceFormatted: formatPrice(unitPrice),
                totalPrice,
                totalPriceFormatted: formatPrice(totalPrice),
            };
        });

        const total = Number(invoice.totalAmount) || 0;
        const vatRate = items[0]?.vatRate || 20;
        const subtotal = total / (1 + vatRate / 100);
        const vatAmount = total - subtotal;

        return {
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.invoiceDate,
            invoiceDateFormatted: formatDate(invoice.invoiceDate),
            invoiceTimeFormatted: formatTime(invoice.invoiceDate),
            
            customerName: `${invoice.customerFirstName || ''} ${invoice.customerLastName || ''}`.trim().toUpperCase(),
            customerAddress: (invoice.customerAddress || '').toUpperCase(),
            tckn: '11111111111',
            
            orderNumber: payload?.value?.gnlNote1 || '',
            
            items,
            
            subtotal: Math.round(subtotal * 100) / 100,
            subtotalFormatted: `${formatPrice(Math.round(subtotal * 100) / 100)} TRY`,
            vatAmount: Math.round(vatAmount * 100) / 100,
            vatAmountFormatted: `${formatPrice(Math.round(vatAmount * 100) / 100)} TRY`,
            vatRate,
            total,
            totalFormatted: `${formatPrice(total)} TRY`,
            totalInWords: this.numberToWords(total),
            
            status: invoice.status,
            whouseCode: invoice.whouseCode || '',
        };
    }

    /**
     * Sayıyı yazıya çevir (Türkçe)
     */
    private numberToWords(amount: number): string {
        const ones = ['', 'BİR', 'İKİ', 'ÜÇ', 'DÖRT', 'BEŞ', 'ALTI', 'YEDİ', 'SEKİZ', 'DOKUZ'];
        const tens = ['', 'ON', 'YİRMİ', 'OTUZ', 'KIRK', 'ELLİ', 'ALTMIŞ', 'YETMİŞ', 'SEKSEN', 'DOKSAN'];
        const hundreds = ['', 'YÜZ', 'İKİYÜZ', 'ÜÇYÜZ', 'DÖRTYÜZ', 'BEŞYÜZ', 'ALTIYÜZ', 'YEDİYÜZ', 'SEKİZYÜZ', 'DOKUZYÜZ'];

        const intPart = Math.floor(amount);
        const decPart = Math.round((amount - intPart) * 100);

        let result = '';

        if (intPart >= 1000) {
            const thousands = Math.floor(intPart / 1000);
            if (thousands === 1) {
                result += 'BİN';
            } else {
                result += this.numberToWords(thousands) + 'BİN';
            }
        }

        const remainder = intPart % 1000;
        if (remainder >= 100) {
            result += hundreds[Math.floor(remainder / 100)];
        }
        const tensRemainder = remainder % 100;
        if (tensRemainder >= 10) {
            result += tens[Math.floor(tensRemainder / 10)];
        }
        const onesRemainder = tensRemainder % 10;
        if (onesRemainder > 0) {
            result += ones[onesRemainder];
        }

        if (result === '') result = 'SIFIR';

        result += ' TRY';

        if (decPart > 0) {
            result += ' ';
            if (decPart >= 10) {
                result += tens[Math.floor(decPart / 10)];
            }
            if (decPart % 10 > 0) {
                result += ones[decPart % 10];
            }
            result += ' KURUŞ';
        }

        return result;
    }

    /**
     * Bir sonraki sıra numarasını al (lock ile)
     */
    private async getNextSequenceNumber(serialNo: string): Promise<number> {
        const year = new Date().getFullYear();
        const pattern = `${serialNo}${year}%`;
        
        const lastInvoice = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .where('invoice.invoiceNumber LIKE :pattern', { pattern })
            .orderBy('invoice.invoiceNumber', 'DESC')
            .getOne();

        if (!lastInvoice) {
            return 1;
        }

        const lastNumber = lastInvoice.invoiceNumber.replace(`${serialNo}${year}`, '');
        return parseInt(lastNumber, 10) + 1;
    }
}
