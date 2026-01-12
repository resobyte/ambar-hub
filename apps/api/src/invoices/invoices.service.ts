import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Invoice } from './entities/invoice.entity';
import { Order } from '../orders/entities/order.entity';
import { InvoiceStatus } from './enums/invoice-status.enum';

@Injectable()
export class InvoicesService {
    private readonly logger = new Logger(InvoicesService.name);

    constructor(
        @InjectRepository(Invoice)
        private readonly invoiceRepository: Repository<Invoice>,
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
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
        // 1. Find the order with items and customer
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items', 'customer', 'store'],
        });

        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        // Check if invoice already exists for this order
        const existingInvoice = await this.invoiceRepository.findOne({
            where: { orderId },
        });

        if (existingInvoice && existingInvoice.status === InvoiceStatus.SUCCESS) {
            throw new BadRequestException(`Invoice already exists for order ${orderId}`);
        }

        // 2. Generate invoice number
        const invoiceNumber = await this.generateInvoiceNumber();
        const invoiceSerial = options?.branchCode?.substring(0, 3) || 'EMA';
        const edocNo = `${invoiceSerial}${invoiceNumber}`;

        // 3. Build Uyumsoft request payload
        const requestPayload = this.buildUyumsoftPayload(order, {
            invoiceNumber,
            invoiceSerial,
            edocNo,
            ...options,
        });

        // 4. Create invoice record
        const invoice = this.invoiceRepository.create({
            orderId: order.id,
            storeId: order.storeId,
            invoiceNumber,
            invoiceSerial,
            edocNo,
            status: InvoiceStatus.PENDING,
            cardCode: options?.cardCode || this.getCardCodeFromOrder(order),
            branchCode: options?.branchCode,
            docTraCode: options?.docTraCode,
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

        // 5. Send to Uyumsoft API
        try {
            const response = await this.sendToUyumsoft(requestPayload);

            savedInvoice.status = InvoiceStatus.SUCCESS;
            savedInvoice.responsePayload = response;
            savedInvoice.uyumsoftInvoiceId = response?.invoiceId || response?.id;
            savedInvoice.ettn = response?.ettn;

            this.logger.log(`Invoice ${edocNo} sent successfully to Uyumsoft`);
        } catch (error) {
            savedInvoice.status = InvoiceStatus.ERROR;
            savedInvoice.errorMessage = error.message || 'Unknown error';
            savedInvoice.responsePayload = error.response?.data;

            this.logger.error(`Failed to send invoice ${edocNo} to Uyumsoft`, error);
        }

        return this.invoiceRepository.save(savedInvoice) as unknown as Invoice;
    }

    /**
     * Build Uyumsoft InsertInvoice request payload
     */
    private buildUyumsoftPayload(order: Order, options: {
        invoiceNumber: string;
        invoiceSerial: string;
        edocNo: string;
        branchCode?: string;
        docTraCode?: string;
        costCenterCode?: string;
        whouseCode?: string;
        cardCode?: string;
    }): object {
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

        // Build line items
        const details = (order.items || []).map((item, index) => ({
            curRateTypeCode: '',
            qty: item.quantity,
            curCode: order.currencyCode || 'TRY',
            lineNo: index + 1,
            unitCode: 'ADET',
            dcardCode: item.merchantSku || item.stockCode || item.sku || item.barcode || '',
            note1: item.productOrigin ? `Mensei: ${item.productOrigin}` : 'Mensei: ',
            note2: item.productOrigin || 'TR',
            note3: '',
            sourceApp: 'Fatura',
            lineType: 'S',
            vatRate: item.vatRate || 20,
            priceListCode: '',
            curRateTra: 0,
            costCenterCode: options.costCenterCode || EMBEAUTY_CONFIG.costCenterCode,
            whouseCode: options.whouseCode || EMBEAUTY_CONFIG.whouseCode,
            sourceApp2: 'Fatura',
            vatCode: item.vatRate || 20,
            unitPrice: Number(item.unitPrice),
            itemNameManual: item.productName,
            qtyPrm: item.quantity,
            amtVat: '',
            vatStatus: 'Dahil',
            sourceApp3: 'Fatura',
        }));

        // Build main invoice payload
        return {
            value: {
                curRateTypeCode: '',
                transportTypeId: '',
                transporterId: null,
                firstName: order.customer?.firstName || '',
                familyName: order.customer?.lastName || '',
                address1: this.formatAddress(order.shippingAddress),
                address2: '',
                address3: '',
                countyId: '',
                voucherNo: options.invoiceNumber,
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
                branchCode: options.branchCode || EMBEAUTY_CONFIG.branchCode,
                gnlNote1: `${order.customer?.trendyolCustomerId || ''}_${order.orderNumber}`,
                docTraCode: options.docTraCode || EMBEAUTY_CONFIG.docTraCode,
                curTra: 1,
                note1: options.edocNo,
                docDate: new Date().toISOString(),
                note2: '',
                note3: '',
                curCode: order.currencyCode || 'TRY',
                gnlNote2: new Date(order.orderDate).toISOString().replace('T', ' ').substring(0, 19),
                shippingDate: new Date(order.orderDate).toISOString(),
                coCode: options.branchCode || EMBEAUTY_CONFIG.coCode,
                details,
                GnlNote5: order.cargoTrackingNumber || '',
                GnlNote6: new Date().toISOString(),
                email: order.customer?.email || '',
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
     * Generate unique invoice number
     */
    private async generateInvoiceNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const lastInvoice = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .where('invoice.invoiceNumber LIKE :pattern', { pattern: `${year}%` })
            .orderBy('invoice.invoiceNumber', 'DESC')
            .getOne();

        if (lastInvoice) {
            const lastNumber = parseInt(lastInvoice.invoiceNumber.substring(4), 10);
            return `${year}${String(lastNumber + 1).padStart(9, '0')}`;
        }

        return `${year}000000001`;
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
    async findAll(page = 1, limit = 10): Promise<{ data: Invoice[]; total: number }> {
        const [data, total] = await this.invoiceRepository.findAndCount({
            skip: (page - 1) * limit,
            take: limit,
            relations: ['order', 'store'],
            order: { createdAt: 'DESC' },
        });
        return { data, total };
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
        const newPayload = this.buildUyumsoftPayload(order, {
            invoiceNumber: invoice.invoiceNumber,
            invoiceSerial: invoice.invoiceSerial || 'EMA',
            edocNo: invoice.edocNo || `EMA${invoice.invoiceNumber}`,
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
}
