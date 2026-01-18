import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Invoice } from './entities/invoice.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { IntegrationStore } from '../integration-stores/entities/integration-store.entity';
import { InvoiceStatus } from './enums/invoice-status.enum';

@Injectable()
export class InvoicesService {
    private readonly logger = new Logger(InvoicesService.name);

    constructor(
        @InjectRepository(Invoice)
        private readonly invoiceRepository: Repository<Invoice>,
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @InjectRepository(IntegrationStore)
        private readonly integrationStoreRepository: Repository<IntegrationStore>,
        private readonly configService: ConfigService,
    ) { }

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
            relations: ['items', 'customer', 'store', 'integration'],
        });

        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        // Check if invoice already exists
        const existingInvoice = await this.invoiceRepository.findOne({
            where: { orderId },
        });

        if (existingInvoice && existingInvoice.status === InvoiceStatus.SUCCESS) {
            throw new BadRequestException(`Invoice already exists for order ${orderId}`);
        }

        // 2. Get IntegrationStore settings
        const storeConfig = await this.getIntegrationStoreSettings(order.storeId, order.integrationId);
        if (!storeConfig) {
            throw new BadRequestException('Integration store settings not found');
        }

        // 3. Determine Invoice Logic
        const integrationType = order.integration?.type as string;
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
        let cardCodeSequenceToIncrement: keyof IntegrationStore | null = null;

        // --- BRANCH: TRENDYOL MICRO EXPORT ---
        if (integrationType === 'TRENDYOL' && isMicroExport && storeConfig.hasMicroExport) {
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

            // Serial & Sequence - Generate from DB to share across all integrations
            invoiceSettings.serialNo = storeConfig.microExportEArchiveSerialNo;
            invoiceSettings.edocNo = await this.generateInvoiceNumber(invoiceSettings.serialNo);
            // No sequenceToIncrement needed - generateInvoiceNumber queries max from DB

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
                if (integrationType === 'IKAS' && isHavale && storeConfig.eInvoiceHavaleAccountCode) {
                    invoiceSettings.accountCode = storeConfig.eInvoiceHavaleAccountCode;
                } else {
                    invoiceSettings.accountCode = storeConfig.eInvoiceAccountCode;
                }

                // Serial & Sequence - Generate from DB to share across all integrations
                invoiceSettings.serialNo = storeConfig.eInvoiceSerialNo;
                invoiceSettings.edocNo = await this.generateInvoiceNumber(invoiceSettings.serialNo);
                // No sequenceToIncrement needed - generateInvoiceNumber queries max from DB

            } else {
                // --- E-ARŞİV ---
                this.logger.log(`Processing E-Archive Invoice for Order ${orderId}`);
                invoiceSettings.isEInvoice = false;

                // Create Entity logic moved to shared block below
                // if (cleanTaxId && cleanTaxId.length >= 10) ...

                // For E-Archive B2C, we usually use 11111111111 and generic Card Code
                invoiceSettings.vknTckn = '11111111111';

                // E-Archive Card Code
                if (integrationType === 'IKAS' && isHavale && storeConfig.eArchiveHavaleCardCode) {
                    invoiceSettings.cardCode = storeConfig.eArchiveHavaleCardCode;
                } else {
                    invoiceSettings.cardCode = storeConfig.eArchiveCardCode;
                }

                // E-Archive Account Code
                if (integrationType === 'IKAS' && isHavale && storeConfig.eArchiveHavaleAccountCode) {
                    invoiceSettings.accountCode = storeConfig.eArchiveHavaleAccountCode;
                } else {
                    invoiceSettings.accountCode = storeConfig.eArchiveAccountCode;
                }

                // Serial & Sequence - Generate from DB to share across all integrations
                invoiceSettings.serialNo = storeConfig.eArchiveSerialNo;
                invoiceSettings.edocNo = await this.generateInvoiceNumber(invoiceSettings.serialNo);
                // No sequenceToIncrement needed - generateInvoiceNumber queries max from DB
            }

            // Sync Entity with Uyumsoft (Cari Kart Açma/Güncelleme)
            // ONLY if customer is an E-Invoice User, otherwise skip and create invoice directly
            if (isEInvoiceUser && cleanTaxId && cleanTaxId.length >= 10 && invoiceSettings.cardCode) {
                const invAddr = (order.invoiceAddress as any) || (order.shippingAddress as any);
                const customerPayload = {
                    entityCode: options?.cardCode,
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

        // 6. Create & Save Invoice (Pending)
        const invoice = this.invoiceRepository.create({
            orderId: order.id,
            storeId: order.storeId,
            invoiceNumber,
            invoiceSerial: invoiceSettings.serialNo,
            edocNo: invoiceSettings.edocNo,
            ettn: '', // Will be filled from response
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

        // 7. Send to Uyumsoft
        try {
            const response = await this.sendToUyumsoft(requestPayload);

            savedInvoice.status = InvoiceStatus.SUCCESS;
            savedInvoice.responsePayload = response;
            savedInvoice.uyumsoftInvoiceId = response?.invoiceId || response?.id;
            savedInvoice.ettn = response?.ettn;

            this.logger.log(`Invoice ${invoiceSettings.edocNo} sent successfully to Uyumsoft`);

            // 8. Increment Card Code Sequence (Only on Success, for E-Invoice customers)
            if (cardCodeSequenceToIncrement) {
                await this.incrementStoreSequence(storeConfig.storeId, storeConfig.integrationId, cardCodeSequenceToIncrement);
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
    async createBulkInvoices(orderIds: string[], options?: {
        branchCode?: string;
        docTraCode?: string;
        costCenterCode?: string;
        whouseCode?: string;
    }): Promise<{ success: Invoice[]; failed: { orderId: string; error: string }[] }> {
        const results = {
            success: [] as Invoice[],
            failed: [] as { orderId: string; error: string }[],
        };

        if (!orderIds || orderIds.length === 0) {
            throw new BadRequestException('No order IDs provided');
        }

        this.logger.log(`Starting bulk invoice creation for ${orderIds.length} orders`);

        // 1. Fetch all orders with relations
        const orders = await this.orderRepository.find({
            where: orderIds.map(id => ({ id })),
            relations: ['items', 'customer', 'store', 'integration'],
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
                // First time for this serial - query DB for max
                const lastInvoice = await this.invoiceRepository
                    .createQueryBuilder('invoice')
                    .where('invoice.invoiceNumber LIKE :pattern', { pattern: `${prefixYear}%` })
                    .andWhere('invoice.status = :status', { status: InvoiceStatus.SUCCESS })
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
                // Check if invoice already exists
                const existingInvoice = await this.invoiceRepository.findOne({
                    where: { orderId: order.id },
                });

                if (existingInvoice && existingInvoice.status === InvoiceStatus.SUCCESS) {
                    results.failed.push({ orderId: order.id, error: 'Invoice already exists' });
                    continue;
                }

                // Get IntegrationStore settings
                const storeConfig = await this.getIntegrationStoreSettings(order.storeId, order.integrationId);
                if (!storeConfig) {
                    results.failed.push({ orderId: order.id, error: 'Integration store settings not found' });
                    continue;
                }

                // Determine invoice settings (same logic as single invoice)
                const integrationType = order.integration?.type as string;
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
                if (integrationType === 'TRENDYOL' && isMicroExport && storeConfig.hasMicroExport) {
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

                    if (integrationType === 'IKAS' && isHavale && storeConfig.eInvoiceHavaleAccountCode) {
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

                    if (integrationType === 'IKAS' && isHavale && storeConfig.eArchiveHavaleCardCode) {
                        invoiceSettings.cardCode = storeConfig.eArchiveHavaleCardCode;
                    } else {
                        invoiceSettings.cardCode = storeConfig.eArchiveCardCode;
                    }
                    if (integrationType === 'IKAS' && isHavale && storeConfig.eArchiveHavaleAccountCode) {
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

            } catch (error) {
                results.failed.push({ orderId: order.id, error: error.message });
            }
        }

        if (invoicePayloads.length === 0) {
            this.logger.warn('No valid invoices to send');
            return results;
        }

        // 3. Send all payloads to InsertInvoiceMulti
        try {
            const bulkPayload = {
                value: invoicePayloads.map(p => p.payload.value),
            };

            const response = await this.sendToUyumsoftMulti(bulkPayload);

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
                        results.success.push(invoiceData.invoice);
                    } else {
                        invoiceData.invoice.status = InvoiceStatus.ERROR;
                        invoiceData.invoice.errorMessage = responseItem?.exceptionMessage || 'Unknown error';
                        invoiceData.invoice.responsePayload = responseItem;
                        await this.invoiceRepository.save(invoiceData.invoice);
                        results.failed.push({ orderId: invoiceData.order.id, error: invoiceData.invoice.errorMessage });
                    }
                }
            } else {
                // If response is not array, mark all as success or handle differently
                for (const invoiceData of invoicePayloads) {
                    invoiceData.invoice.status = InvoiceStatus.SUCCESS;
                    invoiceData.invoice.responsePayload = response;
                    await this.invoiceRepository.save(invoiceData.invoice);
                    results.success.push(invoiceData.invoice);
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
                results.failed.push({ orderId: invoiceData.order.id, error: invoiceData.invoice.errorMessage });
            }
        }

        return results;
    }

    /**
     * Send bulk invoices to Uyumsoft API using InsertInvoiceMulti
     */
    private async sendToUyumsoftMulti(payload: object): Promise<any> {
        const apiUrl = this.configService.get<string>('UYUMSOFT_API_URL')
            || 'http://api-embeauty.eko.uyumcloud.com';

        const { token, secretKey } = await this.getAccessToken();

        const response = await axios.post(
            `${apiUrl}/UyumApi/v1/PSM/InsertInvoiceMulti`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'UyumSecretKey': secretKey,
                },
            }
        );

        return response.data;
    }

    private getCountryCode(order: Order): string {
        const address = order.invoiceAddress as any;
        return (address?.countryCode || address?.country || 'TR').toUpperCase();
    }

    /**
     * Get IntegrationStore settings for invoice configuration
     */
    private async getIntegrationStoreSettings(storeId: string, integrationId: string): Promise<IntegrationStore | null> {
        if (!storeId || !integrationId) {
            return null;
        }

        return this.integrationStoreRepository.findOne({
            where: { storeId, integrationId },
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
        storeConfig?: IntegrationStore;
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
                vatRate: 20,
                priceListCode: '',
                curRateTra: 0,
                costCenterCode: options.costCenterCode || EMBEAUTY_CONFIG.costCenterCode,
                whouseCode: options.whouseCode || EMBEAUTY_CONFIG.whouseCode,
                sourceApp2: 'Fatura',
                vatCode: 20,
                unitPrice: discountedUnitPrice,
                itemNameManual: item.productName?.substring(0, 100) || '',
                qtyPrm: quantity,
                amtVat: '',
                vatStatus: 'Dahil',
                sourceApp3: 'Fatura',
            };
        }));

        // Build main invoice payload
        return {
            value: {
                curRateTypeCode: '',
                transportTypeId: '57',
                transporterId: null,
                firstName: (order.customer?.company || order.customer?.firstName || '').substring(0, 100),
                familyName: (order.customer?.company ? '' : (order.customer?.lastName || '')).substring(0, 100),
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
    private async sendToUyumsoft(payload: object): Promise<any> {
        const apiUrl = this.configService.get<string>('UYUMSOFT_API_URL')
            || 'http://api-embeauty.eko.uyumcloud.com';

        // Get fresh token and secret key
        const { token, secretKey } = await this.getAccessToken();

        const response = await axios.post(
            `${apiUrl}/UyumApi/v1/PSM/InsertInvoice`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'UyumSecretKey': secretKey,
                },
            }
        );

        return response.data;
    }

    /**
     * Generate unique invoice number based on prefix and last record in DB
     * Format: {PREFIX}{YEAR}{SEQUENCE} (e.g. EMA2026000000001)
     * This queries ALL invoices regardless of integration to ensure shared sequence
     */
    private async generateInvoiceNumber(prefix: string): Promise<string> {
        const year = new Date().getFullYear();
        const prefixYear = `${prefix}${year}`;

        // Look for the HIGHEST invoice number with this specific prefix and year
        // across ALL integrations/stores to ensure shared sequence
        // ONLY count SUCCESSFUL invoices to avoid skipping numbers on failed attempts
        const lastInvoice = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .where('invoice.invoiceNumber LIKE :pattern', { pattern: `${prefixYear}%` })
            .andWhere('invoice.status = :status', { status: InvoiceStatus.SUCCESS })
            .orderBy('invoice.invoiceNumber', 'DESC') // Order by number to get MAX
            .getOne();

        if (lastInvoice && lastInvoice.invoiceNumber.startsWith(prefixYear)) {
            const sequencePart = lastInvoice.invoiceNumber.substring(prefixYear.length);
            const lastSequence = parseInt(sequencePart, 10);

            if (!isNaN(lastSequence)) {
                this.logger.log(`Found last invoice ${lastInvoice.invoiceNumber}, next will be ${lastSequence + 1}`);
                return `${prefixYear}${String(lastSequence + 1).padStart(9, '0')}`;
            }
        }

        // Default start
        this.logger.log(`No existing invoices with prefix ${prefixYear}, starting from 000000001`);
        return `${prefixYear}000000001`;
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
     * Find all invoices with pagination
     */
    async findAll(page = 1, limit = 10): Promise<Invoice[]> {
        const [invoices] = await this.invoiceRepository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            relations: ['order', 'store'],
            order: { createdAt: 'DESC' },
        });
        return invoices;
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
            const response = await this.sendToUyumsoft(newPayload);

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
     * Increment sequence number for a specific field in IntegrationStore
     */
    async incrementStoreSequence(storeId: string, integrationId: string, field: keyof IntegrationStore): Promise<void> {
        const store = await this.integrationStoreRepository.findOne({
            where: { storeId, integrationId }
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
        await this.integrationStoreRepository.update(
            { id: store.id },
            { [field]: nextValue }
        );

        this.logger.log(`Incremented sequence ${field} for store ${storeId}: ${currentValue} -> ${nextValue}`);
    }
}
