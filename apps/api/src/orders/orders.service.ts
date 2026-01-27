import { Injectable, Logger, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { FaultyOrder, FaultyOrderReason } from './entities/faulty-order.entity';
import { CustomersService } from '../customers/customers.service';
import { StoresService } from '../stores/stores.service';
import { ProductStoresService } from '../product-stores/product-stores.service';
import { OrderStatus } from './enums/order-status.enum';
import { Store, StoreType } from '../stores/entities/store.entity';
import { Product } from '../products/entities/product.entity';
import * as XLSX from 'xlsx';
import { ProductSetItem } from '../products/entities/product-set-item.entity';
import { ProductType } from '../products/enums/product-type.enum';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { RouteOrder } from '../routes/entities/route-order.entity';
import { ShelfStock } from '../shelves/entities/shelf-stock.entity';
import { ArasKargoService } from '../stores/providers/aras-kargo.service';
import axios from 'axios';

import { InvoicesService } from '../invoices/invoices.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ReshipmentDto } from './dto/reshipment.dto';
import { Customer, CustomerType } from '../customers/entities/customer.entity';
import { OrderHistoryService } from './order-history.service';
import { OrderHistoryAction } from './entities/order-history.entity';
import { ZplTemplateService } from './zpl-template.service';
import { OrderApiLogService } from './order-api-log.service';
import { ApiLogProvider, ApiLogType } from './entities/order-api-log.entity';
import { ShelvesService } from '../shelves/shelves.service';
import { StockSyncService } from '../stock-sync/stock-sync.service';
import { StockUpdateReason } from '../stock-sync/enums/stock-sync.enum';

export interface CancelOrderResult {
    success: boolean;
    message: string;
    refundInvoiceNumber?: string;
    cargoReverted?: boolean;
    stockReleased?: boolean;
}

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    /**
     * Marketplace timestamp'lerini UTC'ye dönüştürür.
     * - Trendyol: Unix timestamp (ms) olarak gönderir ama UTC+3 offset'lidir, 3 saat çıkarılır
     * - Hepsiburada/IKAS: ISO string gönderir, olduğu gibi parse edilir
     */
    private convertMarketplaceTimestamp(timestamp: number | string | null | undefined): Date | null {
        if (!timestamp) return null;

        // ISO string ise (örn: "2024-01-15T14:30:00.000Z")
        if (typeof timestamp === 'string' && timestamp.includes('-')) {
            const date = new Date(timestamp);
            return isNaN(date.getTime()) ? null : date;
        }

        // Unix timestamp (Trendyol) - +3 offset'li gelir, 3 saat çıkar
        const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
        if (isNaN(ts)) return null;
        const utcTime = ts - (3 * 60 * 60 * 1000);
        return new Date(utcTime);
    }

    constructor(
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        @InjectRepository(OrderItem)
        private readonly orderItemRepository: Repository<OrderItem>,
        @InjectRepository(FaultyOrder)
        private readonly faultyOrderRepository: Repository<FaultyOrder>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @InjectRepository(ProductSetItem)
        private readonly productSetItemRepository: Repository<ProductSetItem>,
        @InjectRepository(ProductStore)
        private readonly productStoreRepository: Repository<ProductStore>,
        @InjectRepository(RouteOrder)
        private readonly routeOrderRepository: Repository<RouteOrder>,
        @InjectRepository(Store)
        private readonly storeRepository: Repository<Store>,
        @InjectRepository(ShelfStock)
        private readonly shelfStockRepository: Repository<ShelfStock>,
        private readonly customersService: CustomersService,
        private readonly storesService: StoresService,
        private readonly productStoresService: ProductStoresService,
        private readonly arasKargoService: ArasKargoService,
        private readonly invoicesService: InvoicesService,
        private readonly orderHistoryService: OrderHistoryService,
        private readonly zplTemplateService: ZplTemplateService,
        private readonly orderApiLogService: OrderApiLogService,
        @Inject(forwardRef(() => ShelvesService))
        private readonly shelvesService: ShelvesService,
        @Inject(forwardRef(() => StockSyncService))
        private readonly stockSyncService: StockSyncService,
    ) { }

    private mapStatus(status: string): OrderStatus {
        if (!status) return OrderStatus.UNKNOWN;
        const s = status.toLowerCase();

        if (s === 'created' || s === 'open') return OrderStatus.CREATED;
        if (s === 'unpacked') return OrderStatus.REPACK;
        if (s === 'picking' || s === 'ready_to_ship' || s === 'preparing') return OrderStatus.PICKING;
        if (s === 'shipped') return OrderStatus.SHIPPED;
        if (s === 'cancelled') return OrderStatus.CANCELLED;
        if (s === 'delivered') return OrderStatus.DELIVERED;

        switch (status) {
            case 'Created': return OrderStatus.CREATED;
            case 'Picking': return OrderStatus.PICKING;
            case 'Invoiced': return OrderStatus.INVOICED;
            case 'Shipped': return OrderStatus.SHIPPED;
            case 'Cancelled': return OrderStatus.CANCELLED;
            case 'Delivered': return OrderStatus.DELIVERED;
            case 'UnDelivered': return OrderStatus.UNDELIVERED;
            case 'Returned': return OrderStatus.RETURNED;
            case 'Repack': return OrderStatus.REPACK;
            case 'UnSupplied': return OrderStatus.UNSUPPLIED;
            case 'DRAFT': return OrderStatus.CREATED;
            case 'PARTIALLY_CANCELLED': return OrderStatus.CREATED;
            case 'PARTIALLY_REFUNDED': return OrderStatus.RETURNED;
            case 'REFUNDED': return OrderStatus.RETURNED;
            case 'REFUND_REJECTED': return OrderStatus.DELIVERED;
            case 'REFUND_REQUESTED': return OrderStatus.RETURNED;
            case 'WAITING_UPSELL_ACTION': return OrderStatus.CREATED;
            default: return OrderStatus.UNKNOWN;
        }
    }

    private async expandSetProduct(barcode: string, originalLine: any): Promise<any[] | null> {
        if (!barcode) return null;

        const product = await this.productRepository.findOne({
            where: { barcode, productType: ProductType.SET },
        });

        if (!product) return null;

        const setItems = await this.productSetItemRepository.find({
            where: { setProductId: product.id },
            relations: ['componentProduct'],
            order: { sortOrder: 'ASC' },
        });

        if (setItems.length === 0) return null;

        return setItems.map((setItem, index) => ({
            ...originalLine,
            productName: setItem.componentProduct.name,
            barcode: setItem.componentProduct.barcode,
            sku: setItem.componentProduct.sku,
            merchantSku: setItem.componentProduct.sku,
            stockCode: setItem.componentProduct.sku,
            quantity: (originalLine.quantity || 1) * setItem.quantity,
            price: Number(setItem.priceShare),
            lineUnitPrice: Number(setItem.priceShare),
            unitPrice: Number(setItem.priceShare),
            _isSetComponent: true,
            _setProductId: product.id,
            _setBarcode: barcode,
            lineNo: (originalLine.lineNo || 1) * 100 + index,
        }));
    }

    private async checkProductsExist(lines: any[], storeId?: string): Promise<{ valid: boolean; missing: string[] }> {
        const missing: string[] = [];
        for (const line of lines) {
            const barcode = line.barcode;
            const sku = line.sku;
            if (!barcode && !sku) continue;

            let product: Product | null = null;

            // Eğer storeId varsa, önce mağazaya özel barkod/SKU ile ara
            if (storeId) {
                product = await this.productStoresService.findProductByStoreCode(storeId, barcode, sku);
            }

            // Global barkod ile ara
            if (!product && barcode) {
                product = await this.productRepository.findOne({ where: { barcode } });
            }

            // Global SKU ile ara
            if (!product && sku) {
                product = await this.productRepository.findOne({ where: { sku } });
            }

            if (!product) {
                missing.push(barcode || sku);
            }
        }
        return { valid: missing.length === 0, missing };
    }

    private async saveAsFaultyOrder(
        pkg: any,
        storeId: string,
        missingBarcodes: string[],
    ): Promise<void> {
        const packageId = pkg.shipmentPackageId?.toString() || pkg.packageId?.toString() || pkg.orderNumber;

        const existing = await this.faultyOrderRepository.findOne({ where: { packageId } });
        if (existing) {
            existing.missingBarcodes = missingBarcodes;
            existing.retryCount += 1;
            existing.rawData = pkg;
            await this.faultyOrderRepository.save(existing);
            this.logger.log(`Updated faulty order ${packageId} (retry #${existing.retryCount})`);
            return;
        }

        const faultyOrder = this.faultyOrderRepository.create({
            storeId,
            packageId,
            orderNumber: pkg.orderNumber?.toString(),
            rawData: pkg,
            missingBarcodes,
            errorReason: FaultyOrderReason.MISSING_PRODUCTS,
            retryCount: 0,
            customerName: `${pkg.customerFirstName || ''} ${pkg.customerLastName || ''}`.trim(),
            totalPrice: pkg.totalPrice || 0,
            currencyCode: pkg.currencyCode || 'TRY',
        });

        await this.faultyOrderRepository.save(faultyOrder);
        this.logger.warn(`Saved faulty order ${packageId} - missing products: ${missingBarcodes.join(', ')}`);
    }

    async create(dto: CreateOrderDto): Promise<Order> {
        let customer: Customer;

        if (dto.customerId) {
            const existing = await this.customersService.findOne(dto.customerId);
            if (!existing) {
                throw new Error('Müşteri bulunamadı');
            }
            customer = existing;
        } else if (dto.newCustomerData) {
            const email = dto.newCustomerData.email || `manual-${Date.now()}@placeholder.com`;

            customer = await this.customersService.createOrUpdate({
                firstName: dto.newCustomerData.firstName,
                lastName: dto.newCustomerData.lastName,
                email: email,
                phone: dto.newCustomerData.phone,
                city: dto.newCustomerData.city,
                district: dto.newCustomerData.district,
                address: dto.newCustomerData.addressDetail,
                tcIdentityNumber: dto.newCustomerData.tcIdentityNumber,
                taxNumber: dto.newCustomerData.taxNumber,
                taxOffice: dto.newCustomerData.taxOffice,
                company: dto.newCustomerData.company,
                type: dto.newCustomerData.company ? CustomerType.COMMERCIAL : CustomerType.INDIVIDUAL
            } as any);
        } else {
            throw new Error('Müşteri seçilmeli veya yeni müşteri bilgileri girilmelidir.');
        }

        let totalPrice = 0;
        let grossAmount = 0;

        for (const item of dto.items) {
            totalPrice += item.price * item.quantity;
            grossAmount += item.price * item.quantity;
        }

        const orderNumber = `MAN-${Date.now()}`;

        // Check stock availability for manual orders
        let initialStatus = OrderStatus.CREATED;
        if (dto.storeId) {
            initialStatus = await this.determineManualOrderStatus(dto.items, dto.storeId);
        }

        const isCommercial = customer.type === CustomerType.COMMERCIAL || !!dto.newCustomerData?.company;

        const newOrder = this.orderRepository.create({
            orderNumber,
            packageId: orderNumber,
            customerId: customer.id,
            storeId: dto.storeId,
            status: initialStatus,
            type: dto.orderType,
            totalPrice,
            grossAmount,
            totalDiscount: 0,
            sellerDiscount: 0,
            tyDiscount: 0,
            currencyCode: 'TRY',
            orderDate: new Date(),
            shippingAddress: dto.shippingAddress,
            invoiceAddress: dto.invoiceAddress,
            paymentMethod: dto.paymentMethod,
            isCod: dto.isCod || false,
            customer: customer,
            commercial: isCommercial,
            isEInvoiceUser: isCommercial,
            createdBy: 'MANUAL_USER',
            // Manuel siparişte documentType belirtilmemişse default INVOICE olacak
            // Sadece WAYBILL seçilmişse WAYBILL kullanılır
            documentType: dto.documentType || 'INVOICE',
        });

        const savedOrder = await this.orderRepository.save(newOrder);

        const orderItems: OrderItem[] = [];
        for (const itemDto of dto.items) {
            const product = await this.productRepository.findOne({ where: { id: itemDto.productId } });

            const orderItem = this.orderItemRepository.create({
                orderId: savedOrder.id,
                productName: product ? product.name : 'Unknown Product',
                sku: product ? product.sku : 'UNKNOWN',
                barcode: product ? product.barcode : 'UNKNOWN',
                quantity: itemDto.quantity,
                unitPrice: itemDto.price,
                grossAmount: itemDto.price * itemDto.quantity,
                vatRate: product ? product.vatRate : 20,
                currencyCode: 'TRY',
            });
            orderItems.push(orderItem);
        }

        if (orderItems.length > 0) {
            await this.orderItemRepository.save(orderItems);
        }

        // For manual orders, create Aras Kargo shipment during order creation
        // If it fails, rollback the entire order creation
        if (dto.storeId) {
            const store = await this.storeRepository.findOne({ where: { id: dto.storeId } });
            if (store && store.cargoUsername) {
                try {
                    const credentials = {
                        customerCode: store.cargoCustomerCode,
                        username: store.cargoUsername,
                        password: store.cargoPassword,
                    };

                    const arasResult = await this.arasKargoService.createShipment(savedOrder, credentials);
                    
                    await this.orderApiLogService.log({
                        orderId: savedOrder.id,
                        provider: ApiLogProvider.ARAS_KARGO,
                        logType: ApiLogType.SET_ORDER,
                        endpoint: arasResult._request?.endpoint,
                        method: 'POST',
                        requestPayload: arasResult._request,
                        responsePayload: arasResult._response,
                        isSuccess: arasResult.ResultCode === '0',
                        errorMessage: arasResult.ResultCode !== '0' ? arasResult.ResultMsg : undefined,
                        durationMs: arasResult._durationMs,
                    });

                    if (arasResult.ResultCode === '0') {
                        this.logger.log(`Aras Kargo shipment created for manual order ${orderNumber}`);

                        // Update order with cargo tracking info
                        const integrationCode = savedOrder.packageId || savedOrder.orderNumber;
                        await this.orderRepository.update(savedOrder.id, {
                            cargoTrackingNumber: integrationCode,
                            cargoProviderName: 'Aras Kargo',
                        });
                        savedOrder.cargoTrackingNumber = integrationCode;

                        await this.orderHistoryService.logEvent({
                            orderId: savedOrder.id,
                            action: OrderHistoryAction.CARGO_CREATED,
                            description: `Aras Kargo kaydı oluşturuldu`,
                            metadata: {
                                provider: 'Aras Kargo',
                                resultCode: arasResult.ResultCode,
                                integrationCode,
                            },
                        });
                    } else {
                        // Aras Kargo failed - rollback order creation
                        this.logger.error(`Aras Kargo shipment creation failed for order ${orderNumber}: ${arasResult.ResultMsg}`);
                        await this.orderRepository.delete({ id: savedOrder.id });
                        await this.orderItemRepository.delete({ orderId: savedOrder.id });
                        throw new BadRequestException(`Kargo kaydı oluşturulamadı: ${arasResult.ResultMsg}. Sipariş oluşturulmadı.`);
                    }
                } catch (error: any) {
                    // If it's a BadRequestException, re-throw it
                    if (error instanceof BadRequestException) {
                        throw error;
                    }
                    
                    // Log other errors and rollback
                    this.logger.error(`Aras Kargo error for order ${orderNumber}: ${error.message}`);
                    await this.orderRepository.delete({ id: savedOrder.id });
                    await this.orderItemRepository.delete({ orderId: savedOrder.id });
                    
                    if (error._request) {
                        await this.orderApiLogService.log({
                            orderId: savedOrder.id,
                            provider: ApiLogProvider.ARAS_KARGO,
                            logType: ApiLogType.SET_ORDER,
                            endpoint: error._request?.endpoint,
                            method: 'POST',
                            requestPayload: error._request,
                            responsePayload: error._response,
                            isSuccess: false,
                            errorMessage: error.message,
                            durationMs: error._durationMs,
                        });
                    }
                    
                    throw new BadRequestException(`Kargo kaydı oluşturulurken hata: ${error.message}. Sipariş oluşturulmadı.`);
                }
            }
        }

        await this.updateStockCommitment(savedOrder, 'reserve');

        return savedOrder;
    }

    async syncOrders(storeId: string) {
        const store = await this.storeRepository.findOne({
            where: { id: storeId },
            relations: ['warehouse'],
        });

        if (!store || !store.isActive) {
            this.logger.warn(`Invalid or inactive store: ${storeId}`);
            return;
        }

        try {
            if (store.type === StoreType.TRENDYOL) {
                await this.syncTrendyolOrders(store.sellerId, store.apiKey, store.apiSecret, storeId);
            } else if (store.type === StoreType.HEPSIBURADA) {
                await this.syncHepsiburadaOrders(store.sellerId, store.apiKey, store.apiSecret, storeId, store.name);
            } else if (store.type === StoreType.IKAS) {
                await this.syncIkasOrders(store.apiKey, store.apiSecret, store.sellerId, storeId);
            }
        } catch (error) {
            this.logger.error(`Failed to sync orders for store ${storeId}`, error);
        }
    }

    private async syncTrendyolOrders(sellerId: string, apiKey: string, apiSecret: string, storeId: string) {
        const url = `https://apigw.trendyol.com/integration/order/sellers/${sellerId}/orders`;
        const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

        let page = 0;
        let totalPages = 1;

        do {
            const params = new URLSearchParams({
                page: page.toString(),
                size: '200',
                orderByField: 'PackageLastModifiedDate',
                orderByDirection: 'DESC',
            });

            try {
                const response = await fetch(`${url}?${params}`, {
                    method: 'GET',
                    headers: { Authorization: `Basic ${auth}` },
                });

                if (!response.ok) {
                    this.logger.error(`Trendyol API error for store ${storeId}: ${response.statusText}`);
                    break;
                }

                const data: any = await response.json();
                const packages = data.content;
                totalPages = data.totalPages;

                this.logger.log(`Fetched page ${page + 1}/${totalPages} (${packages.length} orders) for store ${storeId}`);

                for (const pkg of packages) {
                    await this.processOrderPackage(pkg, storeId);
                }

                page++;
            } catch (error) {
                this.logger.error(`Error fetching page ${page} for store ${storeId}`, error);
                break;
            }
        } while (page < totalPages);
    }

    async fetchSingleTrendyolOrder(orderNumber: string): Promise<{ success: boolean; message: string; order?: Order }> {
        const stores = await this.storesService.findByType(StoreType.TRENDYOL);

        if (!stores || stores.length === 0) {
            return { success: false, message: 'Aktif Trendyol mağazası bulunamadı.' };
        }

        let found = false;
        let processedOrder: Order | null = null;

        for (const store of stores) {
            if (!store.isActive) continue;

            try {
                const url = `https://apigw.trendyol.com/integration/order/sellers/${store.sellerId}/orders`;
                const auth = Buffer.from(`${store.apiKey}:${store.apiSecret}`).toString('base64');

                const params = new URLSearchParams({
                    orderNumber: orderNumber,
                    size: '10'
                });

                this.logger.log(`Checking Trendyol store ${store.name} for order ${orderNumber}`);

                const response = await fetch(`${url}?${params}`, {
                    method: 'GET',
                    headers: { Authorization: `Basic ${auth}` },
                });

                if (!response.ok) {
                    continue;
                }

                const data: any = await response.json();
                const packages = data.content;

                if (packages && packages.length > 0) {
                    this.logger.log(`Order ${orderNumber} found in store ${store.name}`);

                    for (const pkg of packages) {
                        if (pkg.orderNumber === orderNumber) {
                            await this.processOrderPackage(pkg, store.id);

                            processedOrder = await this.orderRepository.findOne({
                                where: { orderNumber },
                                relations: ['items', 'customer', 'store']
                            });
                            found = true;
                        }
                    }
                }
            } catch (error) {
                this.logger.error(`Error checking Trendyol store ${store.id}`, error);
            }

            if (found) break;
        }

        if (found && processedOrder) {
            return { success: true, message: 'Sipariş başarıyla çekildi.', order: processedOrder };
        } else {
            return { success: false, message: 'Sipariş hiçbir Trendyol mağazasında bulunamadı.' };
        }
    }

    private async syncHepsiburadaOrders(merchantId: string, username: string, password: string, storeId: string, storeName: string) {
        merchantId = merchantId?.trim();
        username = username?.trim();
        password = password?.trim();

        this.logger.log(`[Hepsiburada] Starting sync for Store: ${storeName} (MerchantID: ${merchantId})`);

        try {
            const auth = Buffer.from(`${merchantId}:${password}`).toString('base64');

            const orderEndpoints = [
                { url: `https://oms-external.hepsiburada.com/orders/merchantid/${merchantId}`, type: 'Open', status: OrderStatus.CREATED },
            ];

            const statusEndpoints = [
                { url: `https://oms-external.hepsiburada.com/orders/merchantid/${merchantId}/cancelled`, type: 'Cancelled', status: OrderStatus.CANCELLED, orderNumberField: 'orderNumber' },
                { url: `https://oms-external.hepsiburada.com/packages/merchantid/${merchantId}/shipped`, type: 'Shipped', status: OrderStatus.SHIPPED, orderNumberField: 'OrderNumber' },
                { url: `https://oms-external.hepsiburada.com/packages/merchantid/${merchantId}/delivered`, type: 'Delivered', status: OrderStatus.DELIVERED, orderNumberField: 'OrderNumber' },
                { url: `https://oms-external.hepsiburada.com/packages/merchantid/${merchantId}/undelivered`, type: 'Undelivered', status: OrderStatus.UNDELIVERED, orderNumberField: 'OrderNumber' },
            ];

            for (const endpoint of orderEndpoints) {
                this.logger.log(`Fetching ${endpoint.type} Hepsiburada orders from ${endpoint.url}`);

                let offset = 0;
                let limit = 100;
                let hasMore = true;
                let totalFetched = 0;

                while (hasMore) {
                    try {
                        const response = await axios.get(endpoint.url, {
                            headers: {
                                'Authorization': `Basic ${auth}`,
                                'User-Agent': 'hamurlabs_dev',
                                'Accept': 'application/json',
                                'Content-Type': 'application/json'
                            },
                            params: { limit: limit, offset: offset }
                        });

                        const data = response.data;

                        let items: any[] = [];
                        if (Array.isArray(data)) {
                            items = data;
                        } else if (data?.items && Array.isArray(data.items)) {
                            items = data.items;
                        } else if (data?.content && Array.isArray(data.content)) {
                            items = data.content;
                        }

                        if (items.length === 0) {
                            hasMore = false;
                            break;
                        }

                        const orderMap = new Map<string, any[]>();
                        for (const item of items) {
                            const orderNumber = item.orderNumber || item.OrderNumber || item.orderId || item.OrderId;
                            if (!orderNumber) continue;

                            if (!orderMap.has(orderNumber)) {
                                orderMap.set(orderNumber, []);
                            }
                            orderMap.get(orderNumber)!.push(item);
                        }

                        for (const [orderNumber, orderItems] of orderMap) {
                            try {
                                const internalPkg = this.mapHepsiburadaItems(orderItems);
                                if (!internalPkg) continue;
                                await this.processOrderPackage(internalPkg, storeId);
                            } catch (err) {
                                this.logger.error(`Failed to process order ${orderNumber}: ${err.message}`);
                            }
                        }

                        totalFetched += items.length;

                        if (items.length < limit) {
                            hasMore = false;
                        } else {
                            offset += limit;
                        }

                    } catch (error) {
                        if (axios.isAxiosError(error)) {
                            const status = error.response?.status;
                            if (status === 401 || status === 403) {
                                this.logger.error(`[Hepsiburada] Authentication failed!`);
                                return;
                            }
                        }
                        hasMore = false;
                    }
                }
            }

            for (const statusEndpoint of statusEndpoints) {
                let offset = 0;
                const limit = 100;
                let hasMore = true;

                while (hasMore) {
                    try {
                        const response = await axios.get(statusEndpoint.url, {
                            headers: {
                                'Authorization': `Basic ${auth}`,
                                'User-Agent': 'hamurlabs_dev',
                                'Accept': 'application/json',
                            },
                            params: { limit, offset }
                        });

                        const data = response.data;
                        let items: any[] = [];
                        if (Array.isArray(data)) {
                            items = data;
                        } else if (data?.items && Array.isArray(data.items)) {
                            items = data.items;
                        }

                        if (items.length === 0) {
                            hasMore = false;
                            break;
                        }

                        for (const item of items) {
                            const orderNumber = item[statusEndpoint.orderNumberField] || item.orderNumber || item.OrderNumber;
                            if (!orderNumber) continue;

                            const existingOrder = await this.orderRepository.findOne({
                                where: { orderNumber, storeId }
                            });

                            if (existingOrder && existingOrder.status !== statusEndpoint.status) {
                                existingOrder.status = statusEndpoint.status;
                                await this.orderRepository.save(existingOrder);
                            }
                        }

                        if (items.length < limit) {
                            hasMore = false;
                        } else {
                            offset += limit;
                        }
                    } catch (error) {
                        hasMore = false;
                    }
                }
            }

            this.logger.log(`[Hepsiburada] Sync completed for Store: ${storeName}`);

        } catch (error) {
            this.logger.error(`[Hepsiburada] Critical error in sync for store ${storeId}`, error);
        }
    }

    private mapHepsiburadaItems(hbItems: any[]): any {
        if (!hbItems || hbItems.length === 0) return null;

        const firstItem = hbItems[0];

        const orderNumber = firstItem.orderNumber || firstItem.OrderNumber;
        const orderId = firstItem.orderId || firstItem.OrderId;
        const orderDate = firstItem.orderDate || firstItem.OrderDate;
        const customerId = firstItem.customerId || firstItem.CustomerId;
        const customerName = firstItem.customerName || firstItem.CustomerName || '';
        const shippingAddress = firstItem.shippingAddress || firstItem.ShippingAddress || {};
        const invoice = firstItem.invoice || firstItem.Invoice || {};
        const status = firstItem.status || firstItem.Status || 'UNKNOWN';
        const dueDate = firstItem.dueDate || firstItem.DueDate;
        const isMicroExport = firstItem.isMicroExport || firstItem.IsMicroExport || false;

        let totalPrice = 0;
        for (const item of hbItems) {
            const itemTotal = item.totalPrice?.amount || item.totalPrice?.Amount ||
                item.TotalPrice?.amount || item.TotalPrice?.Amount ||
                item.totalPrice || item.TotalPrice || 0;
            totalPrice += parseFloat(itemTotal) || 0;
        }

        const hbId = invoice?.turkishIdentityNumber || invoice?.TurkishIdentityNumber;
        const hbTax = invoice?.taxNumber || invoice?.TaxNumber;

        const isDummy = (id: string) => !id || id === '11111111111' || id === '2222222222' || id.length < 10;
        let validId = null;
        if (!isDummy(hbId)) {
            validId = hbId;
        } else if (!isDummy(hbTax)) {
            validId = hbTax;
        }

        const nameParts = (customerName || '').toString().trim().split(/\s+/).filter((p: string) => p.length > 0);
        const customerFirstName = nameParts[0] || 'Müşteri';
        const customerLastName = nameParts.slice(1).join(' ') || '';

        const addressName = shippingAddress?.addressName || shippingAddress?.AddressName || '';
        const addressLine = shippingAddress?.address || shippingAddress?.Address ||
            shippingAddress?.addressLine || shippingAddress?.AddressLine || '';
        const city = shippingAddress?.city || shippingAddress?.City || '';
        const district = shippingAddress?.district || shippingAddress?.District ||
            shippingAddress?.county || shippingAddress?.County || '';
        const phone = shippingAddress?.phoneNumber || shippingAddress?.PhoneNumber || '';
        const zipCode = shippingAddress?.zipCode || shippingAddress?.ZipCode || '';

        const invoiceAddress = invoice?.address || invoice?.Address || {};
        const taxOffice = invoice?.taxOffice || invoice?.TaxOffice || '';
        const companyName = invoiceAddress?.name || invoiceAddress?.Name || '';

        return {
            packageId: orderId || orderNumber,
            orderNumber: orderNumber,
            orderDate: orderDate || new Date().toISOString(),
            agreedDeliveryDate: dueDate || null,
            totalPrice,
            grossAmount: totalPrice,
            totalDiscount: 0,
            sellerDiscount: 0,
            tyDiscount: 0,
            status: status,
            customerFirstName,
            customerLastName,
            customerEmail: null,
            customerId: customerId,
            tcIdentityNumber: validId,
            taxOffice: taxOffice || null,
            company: companyName || null,
            isMicroExport: isMicroExport,
            invoiceAddress: {
                firstName: customerFirstName,
                lastName: customerLastName,
                phone: phone,
                city: city,
                district: district,
                fullAddress: addressLine,
            },
            shipmentAddress: {
                firstName: addressName || customerFirstName,
                lastName: '',
                city: city,
                district: district,
                fullAddress: addressLine,
                phone: phone,
                zipCode: zipCode,
            },
            lines: hbItems.map((item: any) => {
                const unitPrice = item.unitPrice?.amount || item.unitPrice?.Amount ||
                    item.UnitPrice?.amount || item.UnitPrice?.Amount ||
                    item.unitPrice || item.UnitPrice || 0;
                const itemTotal = item.totalPrice?.amount || item.totalPrice?.Amount ||
                    item.TotalPrice?.amount || item.TotalPrice?.Amount ||
                    item.totalPrice || item.TotalPrice || 0;
                return {
                    productName: item.name || item.Name || item.productName || item.ProductName,
                    sku: item.merchantSKU || item.MerchantSKU || item.sku || item.Sku,
                    barcode: item.productBarcode || item.ProductBarcode || item.barcode || item.Barcode,
                    quantity: item.quantity || item.Quantity || 1,
                    price: parseFloat(unitPrice) || 0,
                    lineGrossAmount: parseFloat(itemTotal) || 0,
                    discount: 0,
                    lineSellerDiscount: 0,
                    lineTyDiscount: 0,
                    vatRate: item.vatRate || item.VatRate || 0,
                };
            })
        };
    }

    private async processOrderPackage(pkg: any, storeId: string) {
        const packageId = pkg.packageId || pkg.shipmentPackageId?.toString() || pkg.orderNumber;
        const orderNumber = pkg.orderNumber;
        const lines = pkg.lines || [];

        const existingFaulty = await this.faultyOrderRepository.findOne({ where: { packageId } });

        const { valid, missing } = await this.checkProductsExist(lines, storeId);

        if (!valid) {
            await this.saveAsFaultyOrder(pkg, storeId, missing);
            return;
        }

        if (existingFaulty) {
            await this.faultyOrderRepository.delete({ id: existingFaulty.id });
            this.logger.log(`Resolved faulty order ${packageId} - all products now exist`);
        }

        const customerData = {
            firstName: pkg.invoiceAddress?.firstName || pkg.customerFirstName,
            lastName: pkg.invoiceAddress?.lastName || pkg.customerLastName,
            email: pkg.customerEmail,
            phone: pkg.invoiceAddress?.phone || pkg.shipmentAddress?.phone,
            city: pkg.shipmentAddress?.city || pkg.invoiceAddress?.city,
            district: pkg.shipmentAddress?.district || pkg.invoiceAddress?.district,
            address: pkg.shipmentAddress?.fullAddress || pkg.shipmentAddress?.address1 || pkg.invoiceAddress?.fullAddress,
            invoiceCity: pkg.invoiceAddress?.city,
            invoiceDistrict: pkg.invoiceAddress?.district,
            invoiceAddress: pkg.invoiceAddress?.fullAddress || pkg.invoiceAddress?.address1,
            tcIdentityNumber: pkg.tcIdentityNumber || pkg.identityNumber || pkg.invoiceAddress?.taxNumber || pkg.invoiceAddress?.identityNumber || pkg.taxNumber,
            trendyolCustomerId: pkg.customerId?.toString(),
            company: pkg.invoiceAddress?.company || null,
            taxOffice: pkg.invoiceAddress?.taxOffice || null,
            taxNumber: pkg.taxNumber || pkg.invoiceAddress?.taxNumber || null,
        };

        if (!customerData.email) {
            customerData.email = `customer-${customerData.trendyolCustomerId || orderNumber}@placeholder.com`;
        }

        const customer = await this.customersService.createOrUpdate(customerData);

        let order = await this.orderRepository.findOne({ where: { packageId } });
        const newIntegrationStatus = pkg.status || pkg.shipmentPackageStatus;
        const status = this.mapStatus(newIntegrationStatus);

        if (order) {
            // Handle marketplace status updates
            if (order.integrationStatus !== newIntegrationStatus) {
                // CANCELLED: Always update internal status to CANCELLED
                if (newIntegrationStatus === 'Cancelled' || newIntegrationStatus === 'CANCELLED') {
                    order.status = OrderStatus.CANCELLED;
                    order.integrationStatus = newIntegrationStatus;
                    order.lastModifiedDate = this.convertMarketplaceTimestamp(pkg.lastModifiedDate) || new Date();
                    order.invoiceLink = pkg.invoiceLink || order.invoiceLink;
                    order.cargoTrackingNumber = pkg.cargoTrackingNumber?.toString() || order.cargoTrackingNumber;
                    order.cargoTrackingLink = pkg.cargoTrackingLink || order.cargoTrackingLink;
                    order.packageHistories = pkg.packageHistories || order.packageHistories;
                    await this.orderRepository.save(order);
                    
                    // Release stock for cancelled orders
                    if (order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.RETURNED) {
                        await this.updateStockCommitment(order, 'release');
                    }
                    this.logger.log(`Order ${order.orderNumber} cancelled by marketplace`);
                }
                // CREATED: Do NOT update internal status if order is already in a different status
                else if (newIntegrationStatus === 'Created' || newIntegrationStatus === 'CREATED') {
                    if (order.status === OrderStatus.CREATED) {
                        // Only update metadata, keep CREATED status
                        order.integrationStatus = newIntegrationStatus;
                        order.lastModifiedDate = this.convertMarketplaceTimestamp(pkg.lastModifiedDate) || new Date();
                        order.invoiceLink = pkg.invoiceLink || order.invoiceLink;
                        order.cargoTrackingNumber = pkg.cargoTrackingNumber?.toString() || order.cargoTrackingNumber;
                        order.cargoTrackingLink = pkg.cargoTrackingLink || order.cargoTrackingLink;
                        order.packageHistories = pkg.packageHistories || order.packageHistories;
                        await this.orderRepository.save(order);
                    } else {
                        // Skip update - order is in a different status, don't downgrade
                        this.logger.debug(`Skipping CREATED status update for order ${order.orderNumber} (current status: ${order.status})`);
                    }
                }
                // OTHER STATUSES: Update integration status only, preserve internal status
                else {
                    order.integrationStatus = newIntegrationStatus;
                    order.lastModifiedDate = this.convertMarketplaceTimestamp(pkg.lastModifiedDate) || new Date();
                    order.invoiceLink = pkg.invoiceLink || order.invoiceLink;
                    order.cargoTrackingNumber = pkg.cargoTrackingNumber?.toString() || order.cargoTrackingNumber;
                    order.cargoTrackingLink = pkg.cargoTrackingLink || order.cargoTrackingLink;
                    order.packageHistories = pkg.packageHistories || order.packageHistories;
                    await this.orderRepository.save(order);
                    
                    // Release stock for returns/unsupplied
                    if ((newIntegrationStatus === 'Returned' || newIntegrationStatus === 'UnSupplied') &&
                        order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.RETURNED) {
                        await this.updateStockCommitment(order, 'release');
                    }
                }
            }
        } else {
            const initialStatus = await this.determineInitialStatus(status, lines, storeId);

            const tckn = pkg.tcIdentityNumber || customer?.tcIdentityNumber;
            const taxNo = pkg.taxNumber || pkg.invoiceAddress?.taxNumber || customer?.taxNumber;

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
                ? await this.invoicesService.checkEInvoiceUser(cleanTaxId)
                : false;

            const newOrder = this.orderRepository.create({
                packageId,
                orderNumber,
                isEInvoiceUser,
                storeId,
                customer,
                status: initialStatus,
                integrationStatus: pkg.status || pkg.shipmentPackageStatus,
                totalPrice: pkg.totalPrice ?? pkg.packageTotalPrice ?? 0,
                grossAmount: pkg.grossAmount ?? pkg.packageGrossAmount,
                totalDiscount: pkg.totalDiscount ?? pkg.packageTotalDiscount ?? 0,
                sellerDiscount: pkg.packageSellerDiscount ?? pkg.sellerDiscount ?? 0,
                tyDiscount: pkg.totalTyDiscount ?? pkg.packageTyDiscount ?? pkg.tyDiscount ?? 0,
                currencyCode: pkg.currencyCode,
                orderDate: this.convertMarketplaceTimestamp(pkg.orderDate) || new Date(),
                estimatedDeliveryStart: this.convertMarketplaceTimestamp(pkg.estimatedDeliveryStartDate),
                estimatedDeliveryEnd: this.convertMarketplaceTimestamp(pkg.estimatedDeliveryEndDate),
                agreedDeliveryDate: this.convertMarketplaceTimestamp(pkg.agreedDeliveryDate),
                lastModifiedDate: this.convertMarketplaceTimestamp(pkg.lastModifiedDate),
                cargoTrackingNumber: pkg.cargoTrackingNumber?.toString(),
                cargoTrackingLink: pkg.cargoTrackingLink,
                cargoSenderNumber: pkg.cargoSenderNumber,
                cargoProviderName: pkg.cargoProviderName,
                deliveryType: pkg.deliveryType,
                fastDelivery: pkg.fastDelivery ?? false,
                whoPays: pkg.whoPays,
                shippingAddress: pkg.shipmentAddress,
                invoiceAddress: pkg.invoiceAddress,
                invoiceLink: pkg.invoiceLink,
                taxNumber: pkg.taxNumber,
                commercial: pkg.commercial ?? false,
                micro: pkg.micro ?? false,
                etgbNo: pkg.etgbNo,
                etgbDate: this.convertMarketplaceTimestamp(pkg.etgbDate),
                hsCode: pkg.hsCode,
                containsDangerousProduct: pkg.containsDangerousProduct ?? false,
                warehouseId: pkg.warehouseId?.toString(),
                giftBoxRequested: pkg.giftBoxRequested ?? false,
                threePByTrendyol: pkg['3pByTrendyol'] ?? false,
                deliveredByService: pkg.deliveredByService ?? false,
                cargoDeci: pkg.cargoDeci,
                isCod: pkg.isCod ?? false,
                createdBy: pkg.createdBy,
                originPackageIds: pkg.originPackageIds,
                packageHistories: pkg.packageHistories,
            } as any);

            const savedOrder = await this.orderRepository.save(newOrder) as unknown as Order;

            const rawLines = pkg.lines || [];
            const expandedLines: any[] = [];

            for (const line of rawLines) {
                const expandedComponents = await this.expandSetProduct(line.barcode, line);
                if (expandedComponents) {
                    expandedLines.push(...expandedComponents);
                } else {
                    expandedLines.push(line);
                }
            }

            const items = expandedLines.map((line: any) => this.orderItemRepository.create({
                orderId: savedOrder.id,
                lineId: line.lineId?.toString() || line.id?.toString(),
                productName: line.productName,
                sku: line.sku,
                merchantSku: line.merchantSku,
                stockCode: line.stockCode,
                barcode: line.barcode,
                productCode: line.productCode?.toString() || line.contentId?.toString(),
                contentId: line.contentId?.toString(),
                productColor: line.productColor,
                productSize: line.productSize,
                productOrigin: line.productOrigin,
                productCategoryId: line.productCategoryId,
                quantity: line.quantity,
                unitPrice: line.price ?? line.lineUnitPrice ?? 0,
                grossAmount: line.lineGrossAmount ?? line.amount,
                discount: line.discount ?? line.lineTotalDiscount ?? 0,
                sellerDiscount: line.lineSellerDiscount ?? 0,
                tyDiscount: line.tyDiscount ?? line.lineTyDiscount ?? 0,
                currencyCode: line.currencyCode,
                vatBaseAmount: line.vatBaseAmount,
                vatRate: line.vatRate,
                commission: line.commission,
                orderLineItemStatus: line.orderLineItemStatusName,
                salesCampaignId: line.salesCampaignId,
                cancelledBy: line.cancelledBy,
                cancelReason: line.cancelReason,
                cancelReasonCode: line.cancelReasonCode,
                discountDetails: line.discountDetails,
                fastDeliveryOptions: line.fastDeliveryOptions,
                setProductId: line._setProductId || null,
                isSetComponent: line._isSetComponent || false,
                setBarcode: line._setBarcode || null,
            } as any)) as unknown as OrderItem[];

            if (items.length > 0) {
                await this.orderItemRepository.save(items);
            }

            if (initialStatus !== OrderStatus.CANCELLED && initialStatus !== OrderStatus.SHIPPED && initialStatus !== OrderStatus.RETURNED && initialStatus !== OrderStatus.UNSUPPLIED) {
                await this.updateStockCommitment(savedOrder, 'reserve');
            }
        }
    }

    private async updateStockCommitment(order: Order, action: 'reserve' | 'release') {
        const factor = action === 'reserve' ? 1 : -1;
        const items = await this.orderItemRepository.find({ where: { orderId: order.id } });

        for (const item of items) {
            const storeId = order.storeId;
            if (!storeId) continue;

            let productId = null;

            // 1. Önce mağazaya özel barkod/SKU ile ara (storeBarcode, storeSku)
            const storeProduct = await this.productStoresService.findProductByStoreCode(storeId, item.barcode, item.sku);
            if (storeProduct) {
                productId = storeProduct.id;
            }

            // 2. Mağazaya özel bulunamazsa global barkod ile ara
            if (!productId && item.barcode) {
                const product = await this.productRepository.findOne({ where: { barcode: item.barcode } });
                if (product) productId = product.id;
            }

            // 3. Global SKU ile ara
            if (!productId && item.sku) {
                const product = await this.productRepository.findOne({ where: { sku: item.sku } });
                if (product) productId = product.id;
            }

            if (!productId) continue;

            const productStore = await this.productStoreRepository.findOne({
                where: { productId, storeId }
            });

            if (productStore) {
                const change = item.quantity * factor;
                productStore.committedQuantity = Math.max(0, (productStore.committedQuantity || 0) + change);
                productStore.sellableQuantity = Math.max(0, productStore.sellableQuantity - change);
                await this.productStoreRepository.save(productStore);

                // Stok senkronizasyonunu tetikle
                const reason = action === 'reserve' ? StockUpdateReason.ORDER_CREATED : StockUpdateReason.ORDER_CANCELLED;
                try {
                    await this.stockSyncService.enqueueStockUpdate(productId, storeId, reason);
                } catch (error) {
                    this.logger.warn(`Failed to enqueue stock update for product ${productId}: ${error.message}`);
                }
            }
        }
    }

    private async checkStockAvailability(lines: any[], storeId: string): Promise<{
        allItemsHaveStock: boolean;
        insufficientProducts: string[];
    }> {
        const insufficientProducts: string[] = [];

        for (const line of lines) {
            const barcode = line.barcode;
            const sku = line.sku;
            const requiredQty = line.quantity || 1;

            if (!barcode && !sku) continue;

            let product: Product | null = null;

            // 1. Önce mağazaya özel barkod/SKU ile ara
            product = await this.productStoresService.findProductByStoreCode(storeId, barcode, sku);

            // 2. Global barkod ile ara
            if (!product && barcode) {
                product = await this.productRepository.findOne({ where: { barcode } });
            }

            // 3. Global SKU ile ara
            if (!product && sku) {
                product = await this.productRepository.findOne({ where: { sku } });
            }

            if (!product) {
                insufficientProducts.push(barcode || sku);
                continue;
            }

            const productStore = await this.productStoreRepository.findOne({
                where: { productId: product.id, storeId }
            });

            if (!productStore) {
                insufficientProducts.push(barcode || sku);
                continue;
            }

            const availableStock = (productStore.sellableQuantity || 0) + (productStore.reservableQuantity || 0);

            if (availableStock < requiredQty) {
                insufficientProducts.push(barcode || sku);
            }
        }

        return { allItemsHaveStock: insufficientProducts.length === 0, insufficientProducts };
    }

    private async determineManualOrderStatus(
        items: Array<{ productId: string; quantity: number; price: number }>,
        storeId: string
    ): Promise<OrderStatus> {
        for (const item of items) {
            const product = await this.productRepository.findOne({
                where: { id: item.productId }
            });

            if (!product) {
                this.logger.log(`Manual order: Product ${item.productId} not found, status WAITING_STOCK`);
                return OrderStatus.WAITING_STOCK;
            }

            const sellableStock = await this.shelfStockRepository
                .createQueryBuilder('ss')
                .innerJoin('ss.shelf', 'shelf')
                .where('ss.productId = :productId', { productId: item.productId })
                .andWhere('shelf.isSellable = :isSellable', { isSellable: true })
                .select('SUM(ss.quantity)', 'totalQuantity')
                .getRawOne();

            const totalSellableQuantity = Number(sellableStock?.totalQuantity) || 0;

            this.logger.log(`Manual order: Product ${product.name} (${item.productId}) - need ${item.quantity}, sellable stock: ${totalSellableQuantity}`);

            if (totalSellableQuantity < item.quantity) {
                this.logger.log(`Manual order: Insufficient stock for product ${item.productId}, status WAITING_STOCK`);
                return OrderStatus.WAITING_STOCK;
            }
        }

        this.logger.log(`Manual order: All items have sufficient stock, status WAITING_PICKING`);
        return OrderStatus.WAITING_PICKING;
    }

    private async determineInitialStatus(
        marketplaceStatus: OrderStatus,
        lines: any[],
        storeId: string
    ): Promise<OrderStatus> {
        if (marketplaceStatus !== OrderStatus.CREATED) {
            return marketplaceStatus;
        }

        const { allItemsHaveStock } = await this.checkStockAvailability(lines, storeId);

        if (allItemsHaveStock) {
            this.logger.log(`Order has sufficient stock, setting status to WAITING_PICKING`);
            return OrderStatus.WAITING_PICKING;
        } else {
            this.logger.log(`Order has insufficient stock, setting status to WAITING_STOCK`);
            return OrderStatus.WAITING_STOCK;
        }
    }

    private async syncIkasOrders(clientId: string, clientSecret: string, storeName: string, storeId: string) {
        this.logger.debug(`Syncing Ikas orders for store: ${storeName}`);
        const authUrl = `https://${storeName}.myikas.com/api/admin/oauth/token`;
        const graphQlUrl = `https://api.myikas.com/api/v1/admin/graphql`;

        try {
            const tokenResponse = await axios.post(authUrl, new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const accessToken = tokenResponse.data.access_token;
            if (!accessToken) {
                this.logger.error(`Failed to obtain access token for Ikas store ${storeName}`);
                return;
            }

            const query = `
                query ListOrders($page: Int, $limit: Int) {
                    listOrder(pagination: { page: $page, limit: $limit }) {
                        data {
                            id
                            orderNumber
                            orderedAt
                            status
                            totalPrice
                            currencyCode
                            customer {
                                id
                                firstName
                                lastName
                                email
                                phone
                            }
                            billingAddress {
                                phone
                                city { name }
                                district { name }
                                addressLine1
                                addressLine2
                            }
                            shippingAddress {
                                phone
                                city { name }
                                district { name }
                                addressLine1
                                addressLine2
                            }
                            orderLineItems {
                                id
                                quantity
                                price
                                variant {
                                    name
                                    sku
                                    barcodeList
                                }
                            }
                        }
                        hasNext
                        page
                        limit
                        count
                    }
                }
            `;

            let page = 1;
            let hasNext = true;

            while (hasNext) {
                const response = await axios.post(graphQlUrl, {
                    query,
                    variables: { page, limit: 50 },
                }, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.data.errors) {
                    this.logger.error(`GraphQL errors for Ikas store ${storeName}: ${JSON.stringify(response.data.errors)}`);
                    break;
                }

                const listOrder = response.data.data.listOrder;
                const orders = listOrder.data;
                hasNext = listOrder.hasNext;

                this.logger.log(`Fetched Ikas page ${page} (${orders.length} orders) for store ${storeName}`);

                for (const order of orders) {
                    try {
                        const internalPkg = this.mapIkasOrder(order);
                        if (internalPkg) {
                            await this.processOrderPackage(internalPkg, storeId);
                        }
                    } catch (err) {
                        this.logger.error(`Failed to process Ikas order ${order.orderNumber}: ${err.message}`);
                    }
                }

                if (hasNext) {
                    page++;
                }
            }

        } catch (error) {
            if (axios.isAxiosError(error)) {
                this.logger.error(`Error syncing Ikas orders for ${storeName}: ${error.message}`);
            } else {
                this.logger.error(`Error syncing Ikas orders for ${storeName}`, error);
            }
        }
    }

    private mapIkasOrder(ikasOrder: any): any {
        if (!ikasOrder) return null;

        const customer = ikasOrder.customer;
        const shippingAddress = ikasOrder.shippingAddress;

        const address = [shippingAddress?.addressLine1, shippingAddress?.addressLine2].filter(Boolean).join(' ');

        const totalDiscount = (ikasOrder.orderLineItems || []).reduce(
            (sum: number, item: any) => sum + (item.discountPrice || 0), 0
        );
        const grossAmount = (ikasOrder.totalPrice || 0) + totalDiscount;

        const ikasId = ikasOrder.billingAddress?.identityNumber;
        const ikasTax = ikasOrder.billingAddress?.taxNumber;

        let validIkasId = null;
        const isDummyIkas = (id: string) => !id || id === '11111111111' || id === '2222222222' || id.length < 10;

        if (!isDummyIkas(ikasId)) {
            validIkasId = ikasId;
        } else if (!isDummyIkas(ikasTax)) {
            validIkasId = ikasTax;
        }

        return {
            orderNumber: ikasOrder.orderNumber,
            orderDate: ikasOrder.orderedAt,
            totalPrice: ikasOrder.totalPrice,
            grossAmount,
            totalDiscount,
            sellerDiscount: 0,
            tyDiscount: 0,
            status: ikasOrder.status,
            customerFirstName: customer?.firstName || 'Ikas',
            customerLastName: customer?.lastName || 'Customer',
            customerEmail: customer?.email,
            customerId: customer?.id,
            tcIdentityNumber: validIkasId,
            taxOffice: ikasOrder.billingAddress?.taxOffice || null,
            company: ikasOrder.billingAddress?.company || null,
            billingAddress: {
                phone: ikasOrder.billingAddress?.phone || customer?.phone
            },
            shipmentAddress: {
                city: shippingAddress?.city?.name,
                district: shippingAddress?.district?.name,
                fullAddress: address,
                phone: shippingAddress?.phone
            },
            lines: (ikasOrder.orderLineItems || []).map((item: any) => {
                const itemDiscount = item.discountPrice || 0;
                const itemGrossAmount = (item.price || 0) + itemDiscount;
                return {
                    productName: item.variant?.name || 'Unknown Product',
                    sku: item.variant?.sku,
                    barcode: item.variant?.barcodeList?.[0] || '',
                    quantity: item.quantity,
                    price: item.finalPrice || item.price,
                    lineGrossAmount: itemGrossAmount,
                    discount: itemDiscount,
                    lineSellerDiscount: 0,
                    lineTyDiscount: 0,
                };
            })
        };
    }

    async findOne(id: string): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id },
            relations: ['customer', 'items', 'store'],
        });
        if (!order) {
            throw new Error('Sipariş bulunamadı');
        }
        return order;
    }

    async findAll(page = 1, limit = 10, filters?: {
        orderNumber?: string;
        packageId?: string;
        storeId?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
        customerName?: string;
        micro?: boolean;
        startDeliveryDate?: string;
        endDeliveryDate?: string;
        sortBy?: string;
        sortOrder?: 'ASC' | 'DESC';
    }): Promise<{ data: Order[], total: number }> {
        const queryBuilder = this.orderRepository.createQueryBuilder('order')
            .leftJoinAndSelect('order.customer', 'customer')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('order.store', 'store');

        if (filters?.orderNumber) {
            queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${filters.orderNumber}%` });
        }
        if (filters?.packageId) {
            queryBuilder.andWhere('order.packageId LIKE :packageId', { packageId: `%${filters.packageId}%` });
        }
        if (filters?.storeId) {
            queryBuilder.andWhere('order.storeId = :storeId', { storeId: filters.storeId });
        }
        if (filters?.status) {
            queryBuilder.andWhere('order.status = :status', { status: filters.status });
        }
        if (filters?.startDate) {
            queryBuilder.andWhere('order.orderDate >= :startDate', { startDate: new Date(filters.startDate) });
        }
        if (filters?.endDate) {
            queryBuilder.andWhere('order.orderDate <= :endDate', { endDate: new Date(filters.endDate) });
        }
        if (filters?.customerName) {
            queryBuilder.andWhere(
                "(CONCAT(customer.firstName, ' ', customer.lastName) LIKE :customerName)",
                { customerName: `%${filters.customerName}%` }
            );
        }
        if (filters?.micro !== undefined) {
            queryBuilder.andWhere('order.micro = :micro', { micro: filters.micro });
        }
        if (filters?.startDeliveryDate) {
            queryBuilder.andWhere('order.agreedDeliveryDate >= :startDeliveryDate', { startDeliveryDate: new Date(filters.startDeliveryDate) });
        }
        if (filters?.endDeliveryDate) {
            queryBuilder.andWhere('order.agreedDeliveryDate <= :endDeliveryDate', { endDeliveryDate: new Date(filters.endDeliveryDate) });
        }

        const allowedSortFields: Record<string, string> = {
            orderNumber: 'order.orderNumber',
            orderDate: 'order.orderDate',
            agreedDeliveryDate: 'order.agreedDeliveryDate',
            totalPrice: 'order.totalPrice',
            status: 'order.status',
            createdAt: 'order.createdAt',
        };
        const sortField = allowedSortFields[filters?.sortBy || 'orderDate'] || 'order.orderDate';
        const sortOrder = filters?.sortOrder === 'ASC' ? 'ASC' : 'DESC';

        queryBuilder.orderBy(sortField, sortOrder)
            .skip((page - 1) * limit)
            .take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();
        return { data, total };
    }

    async exportOrders(filters?: {
        orderNumber?: string;
        packageId?: string;
        storeId?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
        customerName?: string;
        micro?: boolean;
        startDeliveryDate?: string;
        endDeliveryDate?: string;
    }): Promise<Buffer> {
        const queryBuilder = this.orderRepository.createQueryBuilder('order')
            .leftJoinAndSelect('order.customer', 'customer')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('order.store', 'store');

        if (filters?.orderNumber) queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${filters.orderNumber}%` });
        if (filters?.packageId) queryBuilder.andWhere('order.packageId LIKE :packageId', { packageId: `%${filters.packageId}%` });
        if (filters?.storeId) queryBuilder.andWhere('order.storeId = :storeId', { storeId: filters.storeId });
        if (filters?.status) queryBuilder.andWhere('order.status = :status', { status: filters.status });
        if (filters?.startDate) queryBuilder.andWhere('order.orderDate >= :startDate', { startDate: new Date(filters.startDate) });
        if (filters?.endDate) queryBuilder.andWhere('order.orderDate <= :endDate', { endDate: new Date(filters.endDate) });
        if (filters?.customerName) {
            queryBuilder.andWhere(
                "(CONCAT(customer.firstName, ' ', customer.lastName) LIKE :customerName)",
                { customerName: `%${filters.customerName}%` }
            );
        }
        if (filters?.micro !== undefined) {
            queryBuilder.andWhere('order.micro = :micro', { micro: filters.micro });
        }
        if (filters?.startDeliveryDate) {
            queryBuilder.andWhere('order.agreedDeliveryDate >= :startDeliveryDate', { startDeliveryDate: new Date(filters.startDeliveryDate) });
        }
        if (filters?.endDeliveryDate) {
            queryBuilder.andWhere('order.agreedDeliveryDate <= :endDeliveryDate', { endDeliveryDate: new Date(filters.endDeliveryDate) });
        }

        queryBuilder.orderBy('order.orderDate', 'DESC');

        const orders = await queryBuilder.getMany();

        const data = orders.map(order => ({
            'Sipariş No': order.orderNumber,
            'Paket No': order.packageId || '',
            'Mağaza': order.store?.name || '',
            'Müşteri': order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Misafir',
            'Tarih': new Date(order.orderDate).toLocaleString('tr-TR'),
            'Beklenen Kargolama': order.agreedDeliveryDate ? new Date(order.agreedDeliveryDate).toLocaleString('tr-TR') : '',
            'Tutar': order.totalPrice,
            'Durum': order.status,
            'Kargo Takip No': order.cargoTrackingNumber || '',
            'Mikro İhracat': order.micro ? 'Evet' : 'Hayır'
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Siparişler');

        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    async findFaultyOrders(
        page: number = 1,
        limit: number = 10,
        filters?: {
            barcode?: string;
            startDate?: string;
            endDate?: string;
            customerName?: string;
            orderNumber?: string;
        }
    ) {
        const query = this.faultyOrderRepository.createQueryBuilder('faulty')
            .leftJoinAndSelect('faulty.store', 'store')
            .orderBy('faulty.createdAt', 'DESC');

        if (filters?.barcode) {
            query.andWhere('faulty.missingBarcodes LIKE :barcode', { barcode: `%${filters.barcode}%` });
        }

        if (filters?.startDate) {
            query.andWhere('faulty.createdAt >= :startDate', { startDate: filters.startDate });
        }

        if (filters?.endDate) {
            query.andWhere('faulty.createdAt <= :endDate', { endDate: filters.endDate });
        }

        if (filters?.customerName) {
            query.andWhere('LOWER(faulty.customerName) LIKE LOWER(:customerName)', { customerName: `%${filters.customerName}%` });
        }

        if (filters?.orderNumber) {
            query.andWhere('faulty.orderNumber LIKE :orderNumber', { orderNumber: `%${filters.orderNumber}%` });
        }

        const [data, total] = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            success: true,
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async deleteFaultyOrder(id: string): Promise<void> {
        await this.faultyOrderRepository.delete(id);
    }

    async updateTrendyolPackageStatus(
        orderId: string,
        status: 'Picking' | 'Invoiced',
        invoiceNumber?: string
    ): Promise<{ success: boolean; message: string }> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items', 'store'],
        });

        if (!order) {
            return { success: false, message: 'Sipariş bulunamadı.' };
        }

        if (!order.store || order.store.type !== StoreType.TRENDYOL) {
            return { success: false, message: 'Bu sipariş Trendyol siparişi değil.' };
        }

        if (status === 'Invoiced' && !invoiceNumber) {
            return { success: false, message: 'Fatura numarası gereklidir.' };
        }

        const store = order.store;

        const lines = order.items
            .filter((item) => item.lineId)
            .map((item) => ({
                lineId: Number(item.lineId),
                quantity: item.quantity,
            }));

        if (lines.length === 0) {
            return { success: false, message: 'Sipariş kalemleri bulunamadı.' };
        }

        const requestBody: {
            lines: Array<{ lineId: number; quantity: number }>;
            params: { invoiceNumber?: string };
            status: string;
        } = {
            lines,
            params: {},
            status,
        };

        if (status === 'Invoiced' && invoiceNumber) {
            requestBody.params.invoiceNumber = invoiceNumber;
        }

        const url = `https://apigw.trendyol.com/integration/order/sellers/${store.sellerId}/shipment-packages/${order.packageId}`;
        const auth = Buffer.from(`${store.apiKey}:${store.apiSecret}`).toString('base64');

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.text();
                this.logger.error(`Trendyol updatePackage failed: ${response.status} - ${errorData}`);
                return {
                    success: false,
                    message: `Trendyol API hatası: ${response.status} - ${errorData}`,
                };
            }

            order.integrationStatus = status;
            if (status === 'Picking') {
                order.status = OrderStatus.PICKING;
            } else if (status === 'Invoiced') {
                order.status = OrderStatus.INVOICED;
            }
            order.lastModifiedDate = new Date();
            await this.orderRepository.save(order);

            this.logger.log(`Trendyol package ${order.packageId} status updated to ${status}`);
            return {
                success: true,
                message: `Paket durumu "${status}" olarak güncellendi.`,
            };
        } catch (error) {
            this.logger.error(`Error updating Trendyol package status: ${error.message}`, error);
            return {
                success: false,
                message: `Bağlantı hatası: ${error.message}`,
            };
        }
    }

    async bulkUpdateTrendyolStatus(
        orderIds: string[],
        status: 'Picking' | 'Invoiced',
        invoiceNumbers?: Record<string, string>
    ): Promise<{ success: boolean; results: Array<{ orderId: string; success: boolean; message: string }> }> {
        const results: Array<{ orderId: string; success: boolean; message: string }> = [];

        for (const orderId of orderIds) {
            const invoiceNumber = invoiceNumbers?.[orderId];
            const result = await this.updateTrendyolPackageStatus(orderId, status, invoiceNumber);
            results.push({ orderId, ...result });
        }

        const allSuccess = results.every((r) => r.success);
        return { success: allSuccess, results };
    }

    async createShipmentForOrder(orderId: string): Promise<{ success: boolean; message: string; data?: any }> {
        try {
            const order = await this.orderRepository.findOne({
                where: { id: orderId },
                relations: ['items', 'store'],
            });

            if (!order) {
                return { success: false, message: 'Sipariş bulunamadı.' };
            }

            const credentials = order.store?.cargoUsername ? {
                customerCode: order.store.cargoCustomerCode,
                username: order.store.cargoUsername,
                password: order.store.cargoPassword,
            } : undefined;

            const arasResult = await this.arasKargoService.createShipment(order, credentials);

            await this.orderApiLogService.log({
                orderId: order.id,
                provider: ApiLogProvider.ARAS_KARGO,
                logType: ApiLogType.SET_ORDER,
                endpoint: arasResult._request?.endpoint,
                method: 'POST',
                requestPayload: arasResult._request,
                responsePayload: arasResult._response,
                isSuccess: arasResult.ResultCode === '0',
                errorMessage: arasResult.ResultCode !== '0' ? arasResult.ResultMsg : undefined,
                durationMs: arasResult._durationMs,
            });

            if (arasResult.ResultCode === '0') {
                return {
                    success: true,
                    message: `Aras Kargo kaydı başarılı. Mesaj: ${arasResult.ResultMsg}`,
                    data: arasResult,
                };
            } else {
                return {
                    success: false,
                    message: `Aras Kargo hatası: ${arasResult.ResultMsg} (Kodu: ${arasResult.ResultCode})`,
                };
            }
        } catch (error: any) {
            this.logger.error(`Aras Kargo createShipment failed: ${error.message}`, error);
            
            if (orderId && error._request) {
                await this.orderApiLogService.log({
                    orderId,
                    provider: ApiLogProvider.ARAS_KARGO,
                    logType: ApiLogType.SET_ORDER,
                    endpoint: error._request?.endpoint,
                    method: 'POST',
                    requestPayload: error._request,
                    responsePayload: error._response,
                    isSuccess: false,
                    errorMessage: error.message,
                    durationMs: error._durationMs,
                });
            }

            return {
                success: false,
                message: `Entegrasyon hatası: ${error.message}`,
            };
        }
    }

    async cancelOrder(orderId: string): Promise<CancelOrderResult> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items', 'store'],
        });

        if (!order) {
            return { success: false, message: 'Sipariş bulunamadı.' };
        }

        if (order.status === OrderStatus.CANCELLED) {
            return { success: false, message: 'Sipariş zaten iptal edilmiş.' };
        }

        if (order.status === OrderStatus.DELIVERED) {
            return { success: false, message: 'Teslim edilmiş sipariş iptal edilemez.' };
        }

        const result: CancelOrderResult = {
            success: true,
            message: '',
            stockReleased: false,
            cargoReverted: false,
        };

        const previousStatus = order.status;
        this.logger.log(`Cancelling order ${order.orderNumber} (status: ${previousStatus})`);

        try {
            const statusesToReleaseStock = [OrderStatus.SHIPPED, OrderStatus.INVOICED, OrderStatus.PICKING, OrderStatus.CREATED, OrderStatus.UNSUPPLIED];

            if (statusesToReleaseStock.includes(previousStatus)) {
                await this.updateStockCommitment(order, 'release');
                result.stockReleased = true;
            }

            const routeOrders = await this.routeOrderRepository.find({ where: { orderId } });
            if (routeOrders.length > 0) {
                await this.routeOrderRepository.remove(routeOrders);
            }

            order.status = OrderStatus.CANCELLED;
            order.lastModifiedDate = new Date();
            await this.orderRepository.save(order);

            result.message = `Sipariş başarıyla iptal edildi. (Önceki durum: ${previousStatus})`;
            this.logger.log(`Order ${order.orderNumber} cancelled successfully`);

        } catch (error) {
            result.success = false;
            result.message = `İptal işlemi sırasında hata: ${error.message}`;
            this.logger.error(`Failed to cancel order ${order.orderNumber}`, error);
        }

        return result;
    }

    /**
     * Check WAITING_STOCK orders and move them to WAITING_PICKING if stock is now available.
     * Called when stock is added (purchase receipt, returns, manual stock add).
     * Uses FIFO - orders are processed by orderDate (oldest first).
     */
    async processWaitingStockOrders(productId?: string): Promise<{
        processed: number;
        movedToWaitingPicking: string[];
    }> {
        const result = { processed: 0, movedToWaitingPicking: [] as string[] };

        // Find all orders in WAITING_STOCK status
        const queryBuilder = this.orderRepository
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.items', 'items')
            .where('order.status = :status', { status: OrderStatus.WAITING_STOCK })
            .orderBy('order.orderDate', 'ASC'); // FIFO - oldest first

        // If productId is specified, only check orders containing that product
        if (productId) {
            const product = await this.productRepository.findOne({ where: { id: productId } });
            if (product?.barcode) {
                queryBuilder.andWhere('items.barcode = :barcode', { barcode: product.barcode });
            }
        }

        const waitingOrders = await queryBuilder.getMany();

        for (const order of waitingOrders) {
            result.processed++;

            // Check if ALL items now have sufficient sellable stock
            let allItemsHaveStock = true;

            for (const item of order.items) {
                const product = await this.productRepository.findOne({
                    where: { barcode: item.barcode }
                });

                if (!product) {
                    allItemsHaveStock = false;
                    break;
                }

                // ShelfStock'tan satılabilir raflardaki toplam stoğu hesapla
                const sellableStock = await this.shelfStockRepository
                    .createQueryBuilder('ss')
                    .innerJoin('ss.shelf', 'shelf')
                    .where('ss.productId = :productId', { productId: product.id })
                    .andWhere('shelf.isSellable = :isSellable', { isSellable: true })
                    .select('SUM(ss.quantity)', 'totalQuantity')
                    .getRawOne();

                const totalSellableQuantity = Number(sellableStock?.totalQuantity) || 0;

                if (totalSellableQuantity < (item.quantity || 1)) {
                    allItemsHaveStock = false;
                    break;
                }
            }

            if (allItemsHaveStock) {
                // Move order to WAITING_PICKING
                await this.orderRepository.update(order.id, { status: OrderStatus.WAITING_PICKING });
                result.movedToWaitingPicking.push(order.orderNumber);
                this.logger.log(`Order ${order.orderNumber} moved from WAITING_STOCK to WAITING_PICKING`);
            }
        }

        this.logger.log(`Processed ${result.processed} WAITING_STOCK orders, moved ${result.movedToWaitingPicking.length} to WAITING_PICKING`);
        return result;
    }

    async reshipOrder(orderId: string, dto: ReshipmentDto, userId?: string): Promise<Order> {
        // 1. Siparişi bul ve ilişkilerle beraber getir
        const originalOrder = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items', 'customer', 'store'],
        });

        if (!originalOrder) {
            throw new NotFoundException(`Sipariş bulunamadı: ${orderId}`);
        }

        // 2. Durum kontrolü (sadece DELIVERED)
        if (originalOrder.status !== OrderStatus.DELIVERED) {
            throw new BadRequestException(
                'Sadece teslim edilmiş siparişler yeniden gönderilebilir'
            );
        }

        // 3. Item'ları validate et
        const validItemIds = originalOrder.items.map(i => i.id);
        const itemMap = new Map(originalOrder.items.map(i => [i.id, i]));

        // Validate all items and quantities
        for (const dtoItem of dto.items) {
            const originalItem = itemMap.get(dtoItem.itemId);
            if (!originalItem) {
                throw new BadRequestException(`Geçersiz ürün ID: ${dtoItem.itemId}`);
            }
            if (dtoItem.quantity <= 0) {
                throw new BadRequestException(`Geçersiz miktar: ${dtoItem.quantity}`);
            }
            if (dtoItem.quantity > originalItem.quantity) {
                throw new BadRequestException(
                    `${originalItem.productName} için maksimum ${originalItem.quantity} adet gönderilebilir`
                );
            }
        }

        // 4. Yeni sipariş numarası oluştur (sonuna R ekleyerek)
        const newOrderNumber = `${originalOrder.orderNumber}R`;
        const newPackageId = `${originalOrder.packageId}R`;

        // Check if reshipment already exists
        const existing = await this.orderRepository.findOne({
            where: { orderNumber: newOrderNumber },
        });

        if (existing) {
            throw new BadRequestException(`Bu sipariş için zaten bir yeniden gönderim mevcut: ${newOrderNumber}`);
        }

        // 5. Seçilen item'ları ve miktarlarını hesapla
        let totalPrice = 0;
        const itemsWithQuantities = dto.items.map(dtoItem => {
            const originalItem = itemMap.get(dtoItem.itemId)!;
            const itemTotal = (originalItem.unitPrice || 0) * dtoItem.quantity;
            totalPrice += itemTotal;
            return { originalItem, quantity: dtoItem.quantity };
        });

        // 6. Yeni sipariş oluştur
        const newOrder = this.orderRepository.create({
            orderNumber: newOrderNumber,
            packageId: newPackageId,
            storeId: originalOrder.storeId,
            customerId: originalOrder.customerId,
            status: OrderStatus.WAITING_PICKING,
            type: originalOrder.type, // Aynı type'ı koru
            totalPrice,
            grossAmount: totalPrice,
            orderDate: new Date(),
            cargoTrackingNumber: dto.cargoTrackingNumber,
            agreedDeliveryDate: originalOrder.agreedDeliveryDate,
            currencyCode: originalOrder.currencyCode || 'TRY',
            shippingAddress: originalOrder.shippingAddress,
            invoiceAddress: originalOrder.invoiceAddress,
            commercial: originalOrder.commercial,
            micro: originalOrder.micro,
            documentType: dto.needsInvoice ? 'INVOICE' : 'WAYBILL', // Fatura ihtiyacını belirt
        });

        const savedOrder = await this.orderRepository.save(newOrder);

        // 7. Seçilen item'ları kısmi miktarlarıyla kopyala
        const newItems = itemsWithQuantities.map(({ originalItem, quantity }) =>
            this.orderItemRepository.create({
                orderId: savedOrder.id,
                lineId: originalItem.lineId,
                productName: originalItem.productName,
                barcode: originalItem.barcode,
                sku: originalItem.sku,
                merchantSku: originalItem.merchantSku,
                stockCode: originalItem.stockCode,
                productCode: originalItem.productCode,
                contentId: originalItem.contentId,
                productColor: originalItem.productColor,
                productSize: originalItem.productSize,
                productOrigin: originalItem.productOrigin,
                productCategoryId: originalItem.productCategoryId,
                quantity, // Kullanıcının seçtiği miktar
                unitPrice: originalItem.unitPrice,
                grossAmount: (originalItem.unitPrice || 0) * quantity,
                discount: originalItem.discount,
                sellerDiscount: originalItem.sellerDiscount,
                tyDiscount: originalItem.tyDiscount,
                currencyCode: originalItem.currencyCode,
                vatBaseAmount: originalItem.vatBaseAmount,
                vatRate: originalItem.vatRate,
                commission: originalItem.commission,
                setProductId: originalItem.setProductId,
                isSetComponent: originalItem.isSetComponent,
                setBarcode: originalItem.setBarcode,
            })
        );

        await this.orderItemRepository.save(newItems);

        // 8. NOT: needsInvoice = true ise documentType = 'INVOICE' olarak ayarlandı
        // Paketleme sırasında normal sipariş akışındaki fatura kuralları uygulanacaktır

        // 9. OrderHistory'e kaydet - Yeni sipariş için
        await this.orderHistoryService.logEvent({
            orderId: savedOrder.id,
            action: OrderHistoryAction.CREATED,
            userId,
            previousStatus: null,
            newStatus: OrderStatus.CREATED,
            description: `Yeniden gönderim: ${originalOrder.orderNumber} siparişinden oluşturuldu`,
            metadata: {
                originalOrderId: originalOrder.id,
                originalOrderNumber: originalOrder.orderNumber,
                reshippedItems: dto.items.length,
                itemDetails: dto.items,
                cargoTrackingNumber: dto.cargoTrackingNumber,
            },
        });

        // 10. Orijinal siparişe de kaydet
        await this.orderHistoryService.logEvent({
            orderId: originalOrder.id,
            action: OrderHistoryAction.NOTE_ADDED,
            userId,
            previousStatus: OrderStatus.DELIVERED,
            newStatus: OrderStatus.DELIVERED,
            description: `Yeniden gönderim oluşturuldu: ${newOrderNumber}`,
            metadata: {
                newOrderId: savedOrder.id,
                newOrderNumber: savedOrder.orderNumber,
                reshippedItemCount: dto.items.length,
                itemDetails: dto.items,
            },
        });

        this.logger.log(`Created reshipment order ${newOrderNumber} from ${originalOrder.orderNumber}`);

        const result = await this.orderRepository.findOne({
            where: { id: savedOrder.id },
            relations: ['items', 'customer', 'store'],
        });

        if (!result) {
            throw new NotFoundException('Oluşturulan sipariş bulunamadı');
        }

        return result;
    }

    /**
     * Generate ZPL cargo label for an order
     * Uses the ZplTemplateService to create a 100mm x 100mm thermal label
     */
    async generateCargoLabelZpl(orderId: string): Promise<{ success: boolean; zpl?: string; message?: string }> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items', 'customer', 'store'],
        });

        if (!order) {
            return { success: false, message: 'Sipariş bulunamadı' };
        }

        if (!order.store) {
            return { success: false, message: 'Mağaza bilgisi bulunamadı' };
        }

        try {
            const zpl = this.zplTemplateService.generateCargoLabel(order, order.store);

            // Optionally save the ZPL to the order
            order.cargoLabelZpl = zpl;
            await this.orderRepository.save(order);

            return { success: true, zpl };
        } catch (error) {
            this.logger.error(`Failed to generate ZPL for order ${orderId}: ${error.message}`);
            return { success: false, message: 'ZPL oluşturma hatası: ' + error.message };
        }
    }

    /**
     * Fetch cargo label from Aras Kargo or generate ZPL locally
     */
    async fetchCargoLabel(orderId: string): Promise<{ success: boolean; zpl?: string; html?: string; message?: string }> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['store'],
        });

        if (!order) {
            return { success: false, message: 'Sipariş bulunamadı' };
        }

        // Try to fetch from Aras Kargo first if we have a tracking number
        if (order.cargoTrackingNumber) {
            try {
                const credentials = order.store?.cargoUsername ? {
                    customerCode: order.store.cargoCustomerCode,
                    username: order.store.cargoUsername,
                    password: order.store.cargoPassword,
                } : undefined;

                const arasResult = await this.arasKargoService.getBarcode(order.cargoTrackingNumber, credentials);
                
                await this.orderApiLogService.log({
                    orderId: order.id,
                    provider: ApiLogProvider.ARAS_KARGO,
                    logType: ApiLogType.GET_BARCODE,
                    endpoint: arasResult._request?.endpoint,
                    method: 'POST',
                    requestPayload: arasResult._request,
                    responsePayload: arasResult._response,
                    isSuccess: !!arasResult.zpl,
                    errorMessage: !arasResult.zpl ? arasResult.resultMsg : undefined,
                    durationMs: arasResult._durationMs,
                });

                if (arasResult.zpl) {
                    order.cargoLabelZpl = arasResult.zpl;
                    await this.orderRepository.save(order);
                    return { success: true, zpl: arasResult.zpl };
                }
            } catch (error) {
                this.logger.warn(`Failed to fetch ZPL from Aras Kargo for ${order.cargoTrackingNumber}: ${error.message}`);
            }
        }

        // Fall back to local ZPL generation
        const result = await this.generateCargoLabelZpl(orderId);
        if (result.success && result.zpl) {
            return { success: true, zpl: result.zpl };
        }

        return { success: false, message: result.message || 'Kargo etiketi oluşturulamadı' };
    }
    /**
     * Get cargo label data for an order (for viewing/reprinting in order detail)
     * Generates HTML label on-demand if not exists
     */
    async getCargoLabel(orderId: string): Promise<{
        success: boolean;
        hasZpl: boolean;
        hasHtml: boolean;
        zpl?: string;
        html?: string;
        labelType: 'aras' | 'dummy' | 'none';
    }> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['customer', 'store', 'items'],
        });

        if (!order) {
            throw new NotFoundException('Sipariş bulunamadı');
        }

        // Generate HTML label on-demand if not exists
        let html = order.cargoLabelHtml;
        if (!html) {
            html = this.generateCargoLabelHtml(order);
            // Save for future use
            await this.orderRepository.update(orderId, { cargoLabelHtml: html });
        }

        return {
            success: true,
            hasZpl: !!order.cargoLabelZpl,
            hasHtml: true, // Always true now since we generate on-demand
            zpl: order.cargoLabelZpl || undefined,
            html,
            labelType: order.cargoLabelZpl ? 'aras' : 'dummy',
        };
    }

    private getLabelaryLabelSizeFromZpl(zpl: string, dpmm: number): { widthIn: string; heightIn: string } {
        const pwMatch = zpl.match(/\^PW(\d+)/);
        const llMatch = zpl.match(/\^LL(\d+)/);

        const pwDots = pwMatch ? Number(pwMatch[1]) : null;
        const llDots = llMatch ? Number(llMatch[1]) : null;

        // Fallback to common shipping label size
        if (!pwDots || !llDots || Number.isNaN(pwDots) || Number.isNaN(llDots) || pwDots <= 0 || llDots <= 0) {
            return { widthIn: '4', heightIn: '6' };
        }

        const widthMm = pwDots / dpmm;
        const heightMm = llDots / dpmm;
        const widthInNum = widthMm / 25.4;
        const heightInNum = heightMm / 25.4;

        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
        const fmt = (v: number) => {
            const fixed = v.toFixed(2);
            return fixed.replace(/\.?0+$/, '');
        };

        return {
            widthIn: fmt(clamp(widthInNum, 1, 8)),
            heightIn: fmt(clamp(heightInNum, 1, 12)),
        };
    }

    async renderZplToHtml(zpl: string): Promise<{ success: boolean; html?: string; message?: string }> {
        if (!zpl || typeof zpl !== 'string') {
            return { success: false, message: 'ZPL gereklidir.' };
        }
        if (zpl.length > 200_000) {
            return { success: false, message: 'ZPL çok büyük.' };
        }

        const labelaryBaseUrl = process.env.LABELARY_API_URL || 'https://api.labelary.com';
        const dpmmRaw = Number(process.env.LABELARY_DPMM || 8);
        const dpmm = Number.isFinite(dpmmRaw) && dpmmRaw > 0 ? dpmmRaw : 8;
        const { widthIn, heightIn } = this.getLabelaryLabelSizeFromZpl(zpl, dpmm);

        const url = `${labelaryBaseUrl}/v1/printers/${dpmm}dpmm/labels/${widthIn}x${heightIn}/0/`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { Accept: 'image/png' },
            body: zpl,
        });

        if (!response.ok) {
            const text = await response.text();
            return { success: false, message: `Labelary error ${response.status}: ${text}` };
        }

        const buf = Buffer.from(await response.arrayBuffer());
        const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;

        const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Kargo Etiketi</title>
  <style type="text/css">
    body { margin: 0; padding: 0; background: #fff; }
    .page { width: ${widthIn}in; height: ${heightIn}in; display: flex; align-items: center; justify-content: center; }
    img { width: 100%; height: auto; display: block; }
    @media print { @page { size: ${widthIn}in ${heightIn}in; margin: 0; } }
  </style>
</head>
<body>
  <div class="page">
    <img src="${dataUrl}" alt="Kargo Etiketi" />
  </div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 200); };
  </script>
</body>
</html>
        `.trim();

        return { success: true, html };
    }

    /**
     * Generate cargo label HTML for an order
     */
    private generateCargoLabelHtml(order: Order): string {
        const shippingAddress = order.shippingAddress || {};
        const customerName = order.customer
            ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
            : (shippingAddress as any).firstName
                ? `${(shippingAddress as any).firstName} ${(shippingAddress as any).lastName || ''}`.trim()
                : 'Müşteri';

        const address = (shippingAddress as any).fullAddress
            || `${(shippingAddress as any).address1 || ''} ${(shippingAddress as any).district || ''} ${(shippingAddress as any).city || ''}`.trim()
            || 'Adres bilgisi yok';

        const phone = (shippingAddress as any).phone || order.customer?.phone || '';
        const senderNumber = order.cargoSenderNumber || order.packageId || order.orderNumber;

        // Store info for sender
        const store = order.store;
        const senderName = store?.senderCompanyName || store?.brandName || 'Gönderen';
        const senderAddress = store?.senderAddress || '';

        // Items list
        const itemsList = (order.items || []).slice(0, 5).map(item =>
            `${item.sku || item.barcode || 'N/A'} x${item.quantity || 1} - ${item.productName || 'Ürün'}`
        ).join('<br>');

        return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Kargo Etiketi - ${order.orderNumber}</title>
  <style type="text/css">
    body { font-family: "Arial", sans-serif; margin: 0; padding: 0; }
    .label { width: 100mm; height: 100mm; padding: 5mm; box-sizing: border-box; border: 1px solid #000; }
    .header { text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 5mm; border-bottom: 2px solid #000; padding-bottom: 3mm; }
    .barcode-container { text-align: center; margin: 5mm 0; }
    .sender-number { font-size: 16pt; font-weight: bold; text-align: center; margin: 3mm 0; letter-spacing: 2px; }
    .recipient { margin-top: 5mm; font-size: 11pt; line-height: 1.4; }
    .recipient strong { font-size: 12pt; }
    .sender { margin-top: 3mm; font-size: 9pt; color: #333; }
    .items { margin-top: 3mm; font-size: 8pt; color: #555; border-top: 1px dashed #999; padding-top: 2mm; }
    .order-info { margin-top: 3mm; font-size: 9pt; color: #333; border-top: 1px dashed #999; padding-top: 2mm; }
    @media print { @page { size: 100mm 100mm; margin: 0; } body { margin: 0; } }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
</head>
<body>
  <div class="label">
    <div class="header">KARGO ETİKETİ</div>
    <div class="barcode-container"><svg id="barcode"></svg></div>
    <div class="sender-number">${senderNumber}</div>
    <div class="recipient">
      <strong>ALICI:</strong><br>
      ${customerName}<br>
      ${address}<br>
      ${phone ? `Tel: ${phone}` : ''}
    </div>
    <div class="sender">
      <strong>GÖNDERİCİ:</strong> ${senderName}<br>
      ${senderAddress}
    </div>
    ${itemsList ? `<div class="items"><strong>Ürünler:</strong><br>${itemsList}</div>` : ''}
    <div class="order-info">
      Sipariş No: ${order.orderNumber}<br>
      Tarih: ${new Date().toLocaleDateString('tr-TR')}
    </div>
  </div>
  <script>
    JsBarcode("#barcode", "${senderNumber}", { format: "CODE128", width: 2, height: 50, displayValue: false });
    window.onload = function() { setTimeout(function() { window.print(); }, 500); };
  </script>
</body>
</html>
        `.trim();
    }

    /**
     * Merkezi statü güncelleme metodu
     * PACKED veya INVOICED statüsünden SHIPPED'e geçerken paketleme rafından siler
     */
    async updateOrderStatus(
        orderId: string,
        newStatus: OrderStatus,
        options?: {
            userId?: string;
            notes?: string;
        }
    ): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items'],
        });

        if (!order) {
            throw new NotFoundException(`Order ${orderId} not found`);
        }

        const previousStatus = order.status;

        // Statü değişikliği yoksa direkt return
        if (previousStatus === newStatus) {
            return order;
        }

        // PACKED veya INVOICED'den SHIPPED'e geçişte paketleme rafından sil
        if (
            (previousStatus === OrderStatus.PACKED || previousStatus === OrderStatus.INVOICED) &&
            newStatus === OrderStatus.SHIPPED
        ) {
            try {
                const result = await this.shelvesService.removeOrderFromPackingShelf(orderId, {
                    userId: options?.userId,
                });
                if (result.success) {
                    this.logger.log(`Removed ${result.removed} items from PACKING shelf for order ${order.orderNumber}`);
                } else {
                    this.logger.warn(`Failed to remove items from PACKING shelf: ${result.message}`);
                }
            } catch (error: any) {
                this.logger.error(`Error removing from PACKING shelf for order ${order.orderNumber}: ${error.message}`);
                // Statü güncellemesini engellememek için hata fırlatma
            }
        }

        // Statüyü güncelle
        await this.orderRepository.update(orderId, { status: newStatus });

        // Order history log
        await this.orderHistoryService.logEvent({
            orderId,
            action: this.getStatusAction(newStatus),
            userId: options?.userId,
            previousStatus,
            newStatus,
            description: options?.notes || `Statü değişti: ${previousStatus} → ${newStatus}`,
        });

        // Güncellenmiş order'ı döndür
        const updatedOrder = await this.orderRepository.findOne({
            where: { id: orderId },
        });

        return updatedOrder!;
    }

    /**
     * Statüye karşılık gelen OrderHistoryAction'ı döndürür
     */
    private getStatusAction(status: OrderStatus): OrderHistoryAction {
        switch (status) {
            case OrderStatus.PACKING:
                return OrderHistoryAction.PACKING_STARTED;
            case OrderStatus.PACKED:
                return OrderHistoryAction.PACKING_COMPLETED;
            case OrderStatus.INVOICED:
                return OrderHistoryAction.INVOICED;
            case OrderStatus.SHIPPED:
                return OrderHistoryAction.SHIPPED;
            case OrderStatus.DELIVERED:
                return OrderHistoryAction.DELIVERED;
            case OrderStatus.CANCELLED:
                return OrderHistoryAction.CANCELLED;
            case OrderStatus.RETURNED:
                return OrderHistoryAction.RETURNED;
            default:
                return OrderHistoryAction.NOTE_ADDED;
        }
    }
}