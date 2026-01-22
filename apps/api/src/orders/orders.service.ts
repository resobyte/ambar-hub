import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { FaultyOrder, FaultyOrderReason } from './entities/faulty-order.entity';
import { CustomersService } from '../customers/customers.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { OrderStatus } from './enums/order-status.enum';
import { IntegrationType } from '../integrations/entities/integration.entity';
import { Product } from '../products/entities/product.entity';
import * as XLSX from 'xlsx';
import { ProductSetItem } from '../products/entities/product-set-item.entity';
import { ProductType } from '../products/enums/product-type.enum';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { ArasKargoService } from '../integrations/aras/aras-kargo.service';
import axios from 'axios';

import { InvoicesService } from '../invoices/invoices.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { randomUUID } from 'crypto';
import { Customer, CustomerType } from '../customers/entities/customer.entity';

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

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
        private readonly customersService: CustomersService,
        private readonly integrationsService: IntegrationsService,
        private readonly arasKargoService: ArasKargoService,
        private readonly invoicesService: InvoicesService,
    ) { }

    private mapStatus(status: string): OrderStatus {
        if (!status) return OrderStatus.UNKNOWN;
        const s = status.toLowerCase();

        // Common/Hepsiburada statuses
        if (s === 'created' || s === 'open') return OrderStatus.CREATED;
        if (s === 'unpacked') return OrderStatus.REPACK; // Mapped "Unpacked" (Damaged/Open Pkg) to REPACK
        if (s === 'picking' || s === 'ready_to_ship' || s === 'preparing') return OrderStatus.PICKING;
        if (s === 'shipped') return OrderStatus.SHIPPED;
        if (s === 'cancelled') return OrderStatus.CANCELLED;
        if (s === 'delivered') return OrderStatus.DELIVERED;

        // Trendyol Statuses
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

            // Ikas Statuses
            case 'DRAFT': return OrderStatus.CREATED;
            case 'PARTIALLY_CANCELLED': return OrderStatus.CREATED; // Treat partial cancel as still active/created
            case 'PARTIALLY_REFUNDED': return OrderStatus.RETURNED;
            case 'REFUNDED': return OrderStatus.RETURNED;
            case 'REFUND_REJECTED': return OrderStatus.DELIVERED; // Return rejected implies kept by customer
            case 'REFUND_REQUESTED': return OrderStatus.RETURNED;
            case 'WAITING_UPSELL_ACTION': return OrderStatus.CREATED;

            default: return OrderStatus.UNKNOWN;
        }
    }

    /**
     * Check if a barcode belongs to a SET product and return expanded components
     * Returns null if not a SET, or array of component items if it is
     */
    private async expandSetProduct(barcode: string, originalLine: any): Promise<any[] | null> {
        if (!barcode) return null;

        // Find product by barcode
        const product = await this.productRepository.findOne({
            where: { barcode, productType: ProductType.SET },
        });

        if (!product) return null;

        // Get SET components
        const setItems = await this.productSetItemRepository.find({
            where: { setProductId: product.id },
            relations: ['componentProduct'],
            order: { sortOrder: 'ASC' },
        });

        if (setItems.length === 0) return null;

        // Expand to component items
        return setItems.map((setItem, index) => ({
            ...originalLine,
            // Use component product info
            productName: setItem.componentProduct.name,
            barcode: setItem.componentProduct.barcode,
            sku: setItem.componentProduct.sku,
            merchantSku: setItem.componentProduct.sku,
            stockCode: setItem.componentProduct.sku,
            // Quantity multiplied by component quantity
            quantity: (originalLine.quantity || 1) * setItem.quantity,
            // Use price share from SET definition
            price: Number(setItem.priceShare),
            lineUnitPrice: Number(setItem.priceShare),
            unitPrice: Number(setItem.priceShare),
            // Mark as SET component
            _isSetComponent: true,
            _setProductId: product.id,
            _setBarcode: barcode,
            // Adjust line number
            lineNo: (originalLine.lineNo || 1) * 100 + index,
        }));
    }

    /**
     * Check if all products in order lines exist in our database
     * Returns missing barcodes if any
     */
    private async checkProductsExist(lines: any[]): Promise<{ valid: boolean; missing: string[] }> {
        const missing: string[] = [];
        for (const line of lines) {
            const barcode = line.barcode;
            if (!barcode) continue;

            const product = await this.productRepository.findOne({ where: { barcode } });
            if (!product) {
                missing.push(barcode);
            }
        }
        return { valid: missing.length === 0, missing };
    }

    /**
     * Save order to faulty orders table
     */
    private async saveAsFaultyOrder(
        pkg: any,
        integrationId: string,
        storeId: string,
        missingBarcodes: string[],
    ): Promise<void> {
        const packageId = pkg.shipmentPackageId?.toString() || pkg.packageId?.toString() || pkg.orderNumber;

        // Check if already exists
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
            integrationId,
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

        // 1. Resolve Customer
        if (dto.customerId) {
            const existing = await this.customersService.findOne(dto.customerId);
            if (!existing) {
                throw new Error('Müşteri bulunamadı');
            }
            customer = existing;
        } else if (dto.newCustomerData) {
            // Create new customer
            // Generate a dummy email if not provided, to satisfy unique constraint if needed
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

        // 2. Calculate Totals
        let totalPrice = 0;
        let grossAmount = 0;

        for (const item of dto.items) {
            totalPrice += item.price * item.quantity;
            grossAmount += item.price * item.quantity;
        }

        // 3. Create Order
        const orderNumber = `MAN-${Date.now()}`; // Manual Order

        const newOrder = this.orderRepository.create({
            orderNumber,
            packageId: orderNumber, // Use orderNumber as packageId for manual orders
            integrationId: null, // Manual orders don't have an integration
            customerId: customer.id,
            storeId: dto.storeId, // Ensure Store ID is handled if provided
            status: OrderStatus.CREATED,
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
            commercial: !!dto.newCustomerData?.company, // Simple check, refine if needed based on tax info
            createdBy: 'MANUAL_USER', // Could be dynamic from auth context if available
        });

        // Use a transaction or just save sequentially (simple for now)
        const savedOrder = await this.orderRepository.save(newOrder);

        // 4. Create Items
        const orderItems: OrderItem[] = [];
        for (const itemDto of dto.items) {
            // Fetch product to get details
            const product = await this.productRepository.findOne({ where: { id: itemDto.productId } });

            const orderItem = this.orderItemRepository.create({
                orderId: savedOrder.id,
                // productId field does not exist in OrderItem entity, we rely on sku/barcode/name
                productName: product ? product.name : 'Unknown Product',
                sku: product ? product.sku : 'UNKNOWN',
                barcode: product ? product.barcode : 'UNKNOWN',
                quantity: itemDto.quantity,
                unitPrice: itemDto.price,
                grossAmount: itemDto.price * itemDto.quantity,
                vatRate: product ? product.vatRate : 20, // Default 20 if not found
                currencyCode: 'TRY',
            });
            orderItems.push(orderItem);
        }

        if (orderItems.length > 0) {
            await this.orderItemRepository.save(orderItems);
        }

        // 5. Reserve Stock
        await this.updateStockCommitment(savedOrder, 'reserve');

        return savedOrder;
    }

    async syncOrders(integrationId: string) {
        const integration = await this.integrationsService.findWithStores(integrationId);
        if (!integration || !integration.isActive) {
            this.logger.warn(`Invalid or inactive integration: ${integrationId}`);
            return;
        }

        if (!integration.integrationStores || integration.integrationStores.length === 0) {
            this.logger.warn(`No stores found for integration: ${integrationId}`);
            return;
        }

        // For each connected store in this integration
        for (const storeConfig of integration.integrationStores) {
            if (!storeConfig.isActive) continue;

            try {
                if (integration.type === IntegrationType.TRENDYOL) {
                    await this.syncTrendyolOrders(storeConfig.sellerId, storeConfig.apiKey, storeConfig.apiSecret, integrationId, storeConfig.storeId);
                } else if (integration.type === IntegrationType.HEPSIBURADA) {
                    await this.syncHepsiburadaOrders(storeConfig.sellerId, storeConfig.apiKey, storeConfig.apiSecret, integrationId, storeConfig.storeId, storeConfig.store?.name || 'Unknown Store');
                } else if (integration.type === IntegrationType.IKAS) {
                    await this.syncIkasOrders(storeConfig.apiKey, storeConfig.apiSecret, storeConfig.sellerId, integrationId, storeConfig.storeId);
                }
            } catch (error) {
                this.logger.error(`Failed to sync orders for store ${storeConfig.storeId}`, error);
            }
        }
    }

    private async syncTrendyolOrders(sellerId: string, apiKey: string, apiSecret: string, integrationId: string, storeId: string) {
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
                startDate: '1767214800000',
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
                    await this.processOrderPackage(pkg, integrationId, storeId);
                }

                page++;
            } catch (error) {
                this.logger.error(`Error fetching page ${page} for store ${storeId}`, error);
                break;
            }
        } while (page < totalPages);
    }

    async fetchSingleTrendyolOrder(orderNumber: string): Promise<{ success: boolean; message: string; order?: Order }> {
        // 1. Get all active Trendyol integrations
        const integrations = await this.integrationsService.findActiveByType(IntegrationType.TRENDYOL);

        if (!integrations || integrations.length === 0) {
            return { success: false, message: 'Aktif Trendyol entegrasyonu bulunamadı.' };
        }

        let found = false;
        let processedOrder: Order | null = null;

        for (const integration of integrations) {
            for (const storeConfig of integration.integrationStores) {
                if (!storeConfig.isActive) continue;

                try {
                    const url = `https://apigw.trendyol.com/integration/order/sellers/${storeConfig.sellerId}/orders`;
                    const auth = Buffer.from(`${storeConfig.apiKey}:${storeConfig.apiSecret}`).toString('base64');

                    const params = new URLSearchParams({
                        orderNumber: orderNumber,
                        size: '10' // We expect 1 but API requires page/size usually or just returns list
                    });

                    this.logger.log(`Checking Trendyol store ${storeConfig.store?.name} for order ${orderNumber}`);

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
                        // Found the order!
                        this.logger.log(`Order ${orderNumber} found in store ${storeConfig.store?.name}`);

                        // Process it
                        for (const pkg of packages) {
                            // Only process the specific order number to be safe (though API filtering should have handled it)
                            if (pkg.orderNumber === orderNumber) {
                                await this.processOrderPackage(pkg, integration.id, storeConfig.storeId);

                                // Fetch the newly created/updated order to return it
                                processedOrder = await this.orderRepository.findOne({
                                    where: { orderNumber },
                                    relations: ['items', 'customer', 'integration', 'store']
                                });
                                found = true;
                            }
                        }
                    }
                } catch (error) {
                    this.logger.error(`Error checking Trendyol store ${storeConfig.storeId}`, error);
                }

                if (found) break;
            }
            if (found) break;
        }

        if (found && processedOrder) {
            return { success: true, message: 'Sipariş başarıyla çekildi.', order: processedOrder };
        } else {
            return { success: false, message: 'Sipariş hiçbir Trendyol mağazasında bulunamadı.' };
        }
    }

    private async syncHepsiburadaOrders(merchantId: string, username: string, password: string, integrationId: string, storeId: string, storeName: string) {
        // Trim credentials
        merchantId = merchantId?.trim();
        username = username?.trim();
        password = password?.trim();

        this.logger.debug(`Hepsiburada Sync via SDK - Store: ${storeName}`);

        try {
            const auth = Buffer.from(`${merchantId}:${password}`).toString('base64');

            const endpoints = [
                { url: `https://oms-external.hepsiburada.com/orders/merchantid/${merchantId}`, type: 'Open' },
                { url: `https://oms-external.hepsiburada.com/packages/merchantid/${merchantId}/delivered`, type: 'Delivered' }
            ];

            for (const endpoint of endpoints) {
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
                            params: {
                                limit: limit,
                                offset: offset
                            }
                        });

                        const data = response.data;
                        const orders = Array.isArray(data) ? data : (data.items || []);

                        if (orders.length === 0) {
                            hasMore = false;
                            break;
                        }

                        this.logger.log(`Fetched batch of ${orders.length} ${endpoint.type} orders (Offset: ${offset})`);

                        let successCount = 0;
                        let failCount = 0;

                        for (const order of orders) {
                            try {
                                const internalPkg = this.mapHepsiburadaOrder(order);
                                if (!internalPkg) {
                                    this.logger.warn(`Skipping empty order/package from ${endpoint.type}`);
                                    continue;
                                }
                                await this.processOrderPackage(internalPkg, integrationId, storeId);
                                successCount++;
                            } catch (err) {
                                failCount++;
                                this.logger.error(`Failed to process order ${order?.orderNumber || order?.id}: ${err.message}. Raw Data: ${JSON.stringify(order)}`, err);
                            }
                        }

                        totalFetched += orders.length;
                        this.logger.log(`Processed batch: ${successCount} succeeded, ${failCount} failed. Total fetched so far: ${totalFetched}`);

                        if (orders.length < limit) {
                            hasMore = false;
                        } else {
                            offset += limit;
                        }

                    } catch (error) {
                        if (axios.isAxiosError(error)) {
                            this.logger.error(`Error fetching ${endpoint.type} orders at offset ${offset}: ${error.message}`, error.response?.data);
                        } else {
                            this.logger.error(`Error fetching ${endpoint.type} orders for store ${storeId} at offset ${offset}`, error);
                        }
                        // If a batch fails, we probably should stop or skip? For now, let's stop this endpoint to avoid infinite loops if it's a persistent error
                        hasMore = false;
                    }
                }
            }

        } catch (error) {
            this.logger.error(`Critical error in Hepsiburada sync for store ${storeId}`, error);
        }
    }

    private mapHepsiburadaOrder(hbOrder: any): any {
        if (!hbOrder) return null;

        const customer = hbOrder.Customer || hbOrder.customer;
        const billingAddress = hbOrder.BillingAddress || hbOrder.billingAddress;
        const shippingAddress = hbOrder.ShippingAddress || hbOrder.shippingAddress;
        const items = hbOrder.Items || hbOrder.items || [];

        const totalPrice = hbOrder.TotalPrice?.Amount || hbOrder.totalPrice?.amount || hbOrder.TotalPrice || hbOrder.totalPrice || 0;

        // LOG: Verification Log
        // Logic to extract best identifier
        // Hepsiburada provides both turkishIdentityNumber (TCKN) and taxNumber (VKN)
        // If one is dummy (11111111111) and the other is valid, prefer the valid one.
        const hbId = items?.[0]?.invoice?.turkishIdentityNumber;
        const hbTax = items?.[0]?.invoice?.taxNumber;

        let validId = null;
        const isDummy = (id: string) => !id || id === '11111111111' || id === '2222222222' || id.length < 10;

        if (!isDummy(hbId)) {
            validId = hbId;
        } else if (!isDummy(hbTax)) {
            validId = hbTax;
        } else {
            validId = hbId || hbTax || null;
        }

        // LOG: Verification Log
        const logId = validId;
        const logOffice = items?.[0]?.invoice?.taxOffice;
        const logCompany = items?.[0]?.invoice?.address?.name;
        this.logger.debug(`Hepsiburada Mapping - Order ${hbOrder.OrderNumber || hbOrder.orderNumber}: Identity=${logId} (Raw ID=${hbId}, Tax=${hbTax}), TaxOffice=${logOffice}, Company=${logCompany}`);

        return {
            orderNumber: hbOrder.OrderNumber || hbOrder.orderNumber || hbOrder.Id || hbOrder.id,
            orderDate: hbOrder.OrderDate || hbOrder.orderDate || hbOrder.DeliveredDate || new Date().toISOString(),
            totalPrice,
            grossAmount: totalPrice, // Hepsiburada returns net price, no separate gross
            totalDiscount: 0,
            sellerDiscount: 0,
            tyDiscount: 0,
            status: hbOrder.Status || hbOrder.status || items?.[0]?.Status || items?.[0]?.status || 'UNKNOWN',
            customerFirstName: customer?.Name?.split(' ')[0] || customer?.name?.split(' ')[0] || 'Hb',
            customerLastName: customer?.Name?.split(' ').slice(1).join(' ') || customer?.name?.split(' ').slice(1).join(' ') || 'Customer',
            customerEmail: customer?.Email || customer?.email,
            customerId: customer?.Id || customer?.id,
            tcIdentityNumber: validId,
            taxOffice: items?.[0]?.invoice?.taxOffice || null,
            company: items?.[0]?.invoice?.address?.name || null,
            billingAddress: {
                phone: billingAddress?.PhoneNumber || billingAddress?.phoneNumber || customer?.PhoneNumber || customer?.phoneNumber
            },
            shipmentAddress: {
                city: shippingAddress?.City || shippingAddress?.city,
                district: shippingAddress?.District || shippingAddress?.district,
                fullAddress: shippingAddress?.Address || shippingAddress?.address,
                phone: shippingAddress?.PhoneNumber || shippingAddress?.phoneNumber
            },
            lines: items.map((item: any) => {
                const itemPrice = item.Price?.Amount || item.price?.amount || item.Price || item.price || 0;
                return {
                    productName: item.ProductName || item.productName || item.Name || item.name,
                    sku: item.MerchantSku || item.merchantSku || item.Sku || item.sku,
                    barcode: item.Barcode || item.barcode,
                    quantity: item.Quantity || item.quantity,
                    price: itemPrice,
                    lineGrossAmount: itemPrice, // Hepsiburada returns net price
                    discount: 0,
                    lineSellerDiscount: 0,
                    lineTyDiscount: 0,
                };
            })
        };
    }

    private async processOrderPackage(pkg: any, integrationId: string, storeId: string) {
        const packageId = pkg.packageId || pkg.shipmentPackageId?.toString() || pkg.orderNumber;
        const orderNumber = pkg.orderNumber;
        const lines = pkg.lines || []; // Redeclared here as it's used later


        /*
        // 0. Check if this is already in faulty orders and products now exist
        const existingFaulty = await this.faultyOrderRepository.findOne({ where: { packageId } });
    
        // 1. Validate all products exist
        const lines = pkg.lines || [];
        const { valid, missing } = await this.checkProductsExist(lines);
    
        if (!valid) {
            // Products missing - save to faulty orders
            await this.saveAsFaultyOrder(pkg, integrationId, storeId, missing);
            return; // Don't process as regular order
        }
    
        // Products exist - if was faulty, remove from faulty orders
        if (existingFaulty) {
            await this.faultyOrderRepository.delete({ id: existingFaulty.id });
            this.logger.log(`Resolved faulty order ${packageId} - all products now exist`);
        }
        */

        // 2. Create/Update Customer
        const customerData = {
            firstName: pkg.invoiceAddress?.firstName || pkg.customerFirstName,
            lastName: pkg.invoiceAddress?.lastName || pkg.customerLastName,
            email: pkg.customerEmail,
            phone: pkg.invoiceAddress?.phone || pkg.shipmentAddress?.phone,

            // Shipping Address / Default Address
            city: pkg.shipmentAddress?.city || pkg.invoiceAddress?.city,
            district: pkg.shipmentAddress?.district || pkg.invoiceAddress?.district,
            address: pkg.shipmentAddress?.fullAddress || pkg.shipmentAddress?.address1 || pkg.invoiceAddress?.fullAddress,

            // Invoice Address (New)
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

        // 2. Check Order by packageId (unique)
        let order = await this.orderRepository.findOne({ where: { packageId } });
        const status = this.mapStatus(pkg.status || pkg.shipmentPackageStatus);

        if (order) {
            // Update existing order
            if (order.status !== status || order.integrationStatus !== pkg.status) {
                order.status = status;
                order.integrationStatus = pkg.status || pkg.shipmentPackageStatus;
                order.lastModifiedDate = pkg.lastModifiedDate ? new Date(pkg.lastModifiedDate) : new Date();
                order.invoiceLink = pkg.invoiceLink || order.invoiceLink;
                order.cargoTrackingNumber = pkg.cargoTrackingNumber?.toString() || order.cargoTrackingNumber;
                order.cargoTrackingLink = pkg.cargoTrackingLink || order.cargoTrackingLink;
                order.packageHistories = pkg.packageHistories || order.packageHistories;
                order.packageHistories = pkg.packageHistories || order.packageHistories;
                await this.orderRepository.save(order);

                // Handle Status Change for Commitment
                // If Cancelled or Shipped, release commitment
                if ((status === OrderStatus.CANCELLED || status === OrderStatus.SHIPPED || status === OrderStatus.RETURNED) &&
                    order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.SHIPPED && order.status !== OrderStatus.RETURNED) {
                    await this.updateStockCommitment(order, 'release');
                }
            }
        } else {
            // Determine initial status based on stock availability
            const initialStatus = await this.determineInitialStatus(status, lines, storeId);

            // Check if user is E-Invoice User
            // Check if user is E-Invoice User
            // Prioritize Valid Tax Number over Dummy TCKN
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

            if (cleanTaxId) {
                this.logger.log(`E-Invoice Check for Order ${orderNumber}: TCKN=${cleanTaxId}, IsEInvoice=${isEInvoiceUser}`);
            } else {
                this.logger.debug(`Skipping E-Invoice Check for Order ${orderNumber}: No Valid TCKN`);
            }

            const newOrder = this.orderRepository.create({
                // Identifiers
                packageId,
                orderNumber,
                isEInvoiceUser,
                integrationId,
                storeId,
                customer,

                // Status
                status: initialStatus,
                integrationStatus: pkg.status || pkg.shipmentPackageStatus,

                // Pricing
                totalPrice: pkg.totalPrice ?? pkg.packageTotalPrice ?? 0,
                grossAmount: pkg.grossAmount ?? pkg.packageGrossAmount,
                totalDiscount: pkg.totalDiscount ?? pkg.packageTotalDiscount ?? 0,
                sellerDiscount: pkg.packageSellerDiscount ?? pkg.sellerDiscount ?? 0,
                tyDiscount: pkg.totalTyDiscount ?? pkg.packageTyDiscount ?? pkg.tyDiscount ?? 0,
                currencyCode: pkg.currencyCode,

                // Dates
                orderDate: new Date(pkg.orderDate),
                estimatedDeliveryStart: pkg.estimatedDeliveryStartDate ? new Date(pkg.estimatedDeliveryStartDate) : null,
                estimatedDeliveryEnd: pkg.estimatedDeliveryEndDate ? new Date(pkg.estimatedDeliveryEndDate) : null,
                agreedDeliveryDate: pkg.agreedDeliveryDate ? new Date(pkg.agreedDeliveryDate) : null,
                lastModifiedDate: pkg.lastModifiedDate ? new Date(pkg.lastModifiedDate) : null,

                // Cargo & Shipping
                cargoTrackingNumber: pkg.cargoTrackingNumber?.toString(),
                cargoTrackingLink: pkg.cargoTrackingLink,
                cargoSenderNumber: pkg.cargoSenderNumber,
                cargoProviderName: pkg.cargoProviderName,
                deliveryType: pkg.deliveryType,
                fastDelivery: pkg.fastDelivery ?? false,
                whoPays: pkg.whoPays,

                // Addresses (JSON)
                shippingAddress: pkg.shipmentAddress,
                invoiceAddress: pkg.invoiceAddress,

                // Invoice & Tax
                invoiceLink: pkg.invoiceLink,
                taxNumber: pkg.taxNumber,
                commercial: pkg.commercial ?? false,

                // Micro Export
                micro: pkg.micro ?? false,
                etgbNo: pkg.etgbNo,
                etgbDate: pkg.etgbDate ? new Date(pkg.etgbDate) : null,
                hsCode: pkg.hsCode,
                containsDangerousProduct: pkg.containsDangerousProduct ?? false,

                // Warehouse & Fulfillment
                warehouseId: pkg.warehouseId?.toString(),
                giftBoxRequested: pkg.giftBoxRequested ?? false,
                threePByTrendyol: pkg['3pByTrendyol'] ?? false,
                deliveredByService: pkg.deliveredByService ?? false,
                cargoDeci: pkg.cargoDeci,
                isCod: pkg.isCod ?? false,
                createdBy: pkg.createdBy,
                originPackageIds: pkg.originPackageIds,

                // Package History
                packageHistories: pkg.packageHistories,
            } as any);

            // Reserve stock for new non-cancelled/shipped orders
            if (initialStatus !== OrderStatus.CANCELLED && initialStatus !== OrderStatus.SHIPPED && initialStatus !== OrderStatus.RETURNED && initialStatus !== OrderStatus.UNSUPPLIED) {
                // We need to save items first to calculate commitment
                // So we do it after saving items below
            }

            const savedOrder = await this.orderRepository.save(newOrder) as unknown as Order;

            // Create order items with SET expansion
            const rawLines = pkg.lines || [];
            const expandedLines: any[] = [];

            // Expand SET products to components
            for (const line of rawLines) {
                const expandedComponents = await this.expandSetProduct(line.barcode, line);
                if (expandedComponents) {
                    // This is a SET product, add expanded components
                    expandedLines.push(...expandedComponents);
                } else {
                    // Not a SET, add as-is
                    expandedLines.push(line);
                }
            }

            // Create order items from expanded lines
            const items = expandedLines.map((line: any) => this.orderItemRepository.create({
                orderId: savedOrder.id,

                // Identifiers
                lineId: line.lineId?.toString() || line.id?.toString(),
                productName: line.productName,
                sku: line.sku,
                merchantSku: line.merchantSku,
                stockCode: line.stockCode,
                barcode: line.barcode,
                productCode: line.productCode?.toString() || line.contentId?.toString(),
                contentId: line.contentId?.toString(),

                // Product Details
                productColor: line.productColor,
                productSize: line.productSize,
                productOrigin: line.productOrigin,
                productCategoryId: line.productCategoryId,

                // Quantity & Pricing
                quantity: line.quantity,
                unitPrice: line.price ?? line.lineUnitPrice ?? 0,
                grossAmount: line.lineGrossAmount ?? line.amount,
                discount: line.discount ?? line.lineTotalDiscount ?? 0,
                sellerDiscount: line.lineSellerDiscount ?? 0,
                tyDiscount: line.tyDiscount ?? line.lineTyDiscount ?? 0,
                currencyCode: line.currencyCode,

                // Tax & Commission
                vatBaseAmount: line.vatBaseAmount,
                vatRate: line.vatRate,
                commission: line.commission,

                // Status & Campaign
                orderLineItemStatus: line.orderLineItemStatusName,
                salesCampaignId: line.salesCampaignId,

                // Cancellation
                cancelledBy: line.cancelledBy,
                cancelReason: line.cancelReason,
                cancelReasonCode: line.cancelReasonCode,

                // JSON Details
                discountDetails: line.discountDetails,
                fastDeliveryOptions: line.fastDeliveryOptions,

                // SET Product Tracking
                setProductId: line._setProductId || null,
                isSetComponent: line._isSetComponent || false,
                setBarcode: line._setBarcode || null,
            } as any)) as unknown as OrderItem[];

            if (items.length > 0) {
                await this.orderItemRepository.save(items);
            }

            // Reserve Stock for new active orders (only if we have stock - status is PICKING)
            if (initialStatus !== OrderStatus.CANCELLED && initialStatus !== OrderStatus.SHIPPED && initialStatus !== OrderStatus.RETURNED && initialStatus !== OrderStatus.UNSUPPLIED) {
                await this.updateStockCommitment(savedOrder, 'reserve');
            }
        }
    }


    /**
     * Update committed stock for an order
     * @param order The order to process
     * @param action 'reserve' (increase commitment) or 'release' (decrease commitment)
     */
    private async updateStockCommitment(order: Order, action: 'reserve' | 'release') {
        const factor = action === 'reserve' ? 1 : -1;

        // Find items associated with this order
        const items = await this.orderItemRepository.find({ where: { orderId: order.id } });

        for (const item of items) {
            // Find product store entry (assuming a default store or the order's store)
            // If order doesn't have storeId, we might skip or use a default.
            // Usually orders come with storeId.
            const storeId = order.storeId;
            if (!storeId) continue; // Cannot track stock without store context

            // Resolve actual product ID (handle set components or regular items)
            // OrderItem often has barcode or SKU. We need to map to Product entity to get ID.
            // Optimization: OrderItem should ideally have productId, but if not we look up via barcode/sku

            let productId = null;
            // Check via barcode
            if (item.barcode) {
                const product = await this.productRepository.findOne({ where: { barcode: item.barcode } });
                if (product) productId = product.id;
            }

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
                // Recalculate sellable
                // Sellable = Total Sellable Physical - Committed
                // Note: We don't have the "Total Sellable Physical" here easily without re-querying shelves.
                // BUT, we can assume: committedQuantity affects sellable directly.
                // Actually, syncProductStock calculates: sellable = physical_sellable - committed.
                // So we should re-trigger syncProductStock logic? 
                // Or just update sellable here assuming physical didn't change:
                // New Sellable = Old Sellable - Change

                // Simpler: Just update committed and let the formula work if we were to resync.
                // But for immediate UI update, we update sellable too.
                productStore.sellableQuantity = Math.max(0, productStore.sellableQuantity - change);

                await this.productStoreRepository.save(productStore);
            }
        }
    }

    /**
     * Check stock availability for order items
     * Returns whether all items have sufficient stock and what type
     */
    private async checkStockAvailability(lines: any[], storeId: string): Promise<{
        allItemsHaveStock: boolean;
        insufficientProducts: string[];
    }> {
        const insufficientProducts: string[] = [];

        for (const line of lines) {
            const barcode = line.barcode;
            const requiredQty = line.quantity || 1;

            if (!barcode) continue;

            // Find product by barcode
            const product = await this.productRepository.findOne({ where: { barcode } });
            if (!product) {
                insufficientProducts.push(barcode);
                continue;
            }

            // Check product store for stock quantities
            const productStore = await this.productStoreRepository.findOne({
                where: { productId: product.id, storeId }
            });

            if (!productStore) {
                insufficientProducts.push(barcode);
                continue;
            }

            // Check if sellable + reservable stock is enough
            const availableStock = (productStore.sellableQuantity || 0) + (productStore.reservableQuantity || 0);

            if (availableStock < requiredQty) {
                insufficientProducts.push(barcode);
            }
        }

        return {
            allItemsHaveStock: insufficientProducts.length === 0,
            insufficientProducts
        };
    }

    /**
     * Determine initial order status based on stock availability
     * If stock is available -> PICKING (ready to pick)
     * If no stock -> UNSUPPLIED (waiting for stock)
     */
    private async determineInitialStatus(
        marketplaceStatus: OrderStatus,
        lines: any[],
        storeId: string
    ): Promise<OrderStatus> {
        // Only check stock for CREATED orders (new orders from marketplace)
        if (marketplaceStatus !== OrderStatus.CREATED) {
            return marketplaceStatus;
        }

        const { allItemsHaveStock, insufficientProducts } = await this.checkStockAvailability(lines, storeId);

        if (allItemsHaveStock) {
            this.logger.log(`Order has sufficient stock, setting status to PICKING`);
            return OrderStatus.PICKING;
        } else {
            this.logger.log(`Order missing stock for: ${insufficientProducts.join(', ')}, status: UNSUPPLIED`);
            return OrderStatus.UNSUPPLIED;
        }
    }

    private async syncIkasOrders(clientId: string, clientSecret: string, storeName: string, integrationId: string, storeId: string) {
        this.logger.debug(`Syncing Ikas orders for store: ${storeName}`);
        const authUrl = `https://embeauty.myikas.com/api/admin/oauth/token`;
        // Based on docs, GraphQL might be on the main api domain or v1 path
        const graphQlUrl = `https://api.myikas.com/api/v1/admin/graphql`;

        try {
            // 1. Get Access Token
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

            // 2. Fetch Orders via GraphQL
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
                            await this.processOrderPackage(internalPkg, integrationId, storeId);
                        }
                    } catch (err) {
                        this.logger.error(`Failed to process Ikas order ${order.orderNumber}: ${err.message}`, err);
                    }
                }

                if (hasNext) {
                    page++;
                } else {
                    break; // Just to be safe
                }
            }

        } catch (error) {
            if (axios.isAxiosError(error)) {
                this.logger.error(`Error syncing Ikas orders for ${storeName}: ${error.message}`);
                this.logger.error(`Response Status: ${error.response?.status}`);
                this.logger.error(`Response Data: ${JSON.stringify(error.response?.data)}`);
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

        // Calculate totals for Ikas
        const totalDiscount = (ikasOrder.orderLineItems || []).reduce(
            (sum: number, item: any) => sum + (item.discountPrice || 0), 0
        );
        const grossAmount = (ikasOrder.totalPrice || 0) + totalDiscount;

        // Logic for Ikas ID selection
        const ikasId = ikasOrder.billingAddress?.identityNumber;
        const ikasTax = ikasOrder.billingAddress?.taxNumber;

        // Inline dummy check
        let validIkasId = null;
        const isDummyIkas = (id: string) => !id || id === '11111111111' || id === '2222222222' || id.length < 10;

        if (!isDummyIkas(ikasId)) {
            validIkasId = ikasId;
        } else if (!isDummyIkas(ikasTax)) {
            validIkasId = ikasTax;
        } else {
            validIkasId = ikasId || ikasTax || null;
        }

        // LOG: Verification Log
        const logIdIkas = validIkasId;
        const logOfficeIkas = ikasOrder.billingAddress?.taxOffice;
        const logCompanyIkas = ikasOrder.billingAddress?.company;
        this.logger.debug(`Ikas Mapping - Order ${ikasOrder.orderNumber}: Identity=${logIdIkas} (Raw ID=${ikasId}, Tax=${ikasTax}), TaxOffice=${logOfficeIkas}, Company=${logCompanyIkas}`);

        return {
            orderNumber: ikasOrder.orderNumber,
            orderDate: ikasOrder.orderedAt,
            totalPrice: ikasOrder.totalPrice,
            grossAmount,
            totalDiscount,
            sellerDiscount: 0, // Ikas doesn't distinguish seller vs platform discount
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

    async findAll(page = 1, limit = 10, filters?: {
        orderNumber?: string;
        packageId?: string;
        integrationId?: string;
        storeId?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
        customerName?: string;
        micro?: boolean;
        startDeliveryDate?: string;
        endDeliveryDate?: string;
    }): Promise<{ data: Order[], total: number }> {
        const queryBuilder = this.orderRepository.createQueryBuilder('order')
            .leftJoinAndSelect('order.customer', 'customer')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('order.store', 'store')
            .leftJoinAndSelect('order.integration', 'integration');

        if (filters?.orderNumber) {
            queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${filters.orderNumber}%` });
        }
        if (filters?.packageId) {
            queryBuilder.andWhere('order.packageId LIKE :packageId', { packageId: `%${filters.packageId}%` });
        }
        if (filters?.integrationId) {
            queryBuilder.andWhere('order.integrationId = :integrationId', { integrationId: filters.integrationId });
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
                "(CONCAT(customer.firstName, ' ', customer.lastName) LIKE :customerName OR customer.firstName LIKE :customerName OR customer.lastName LIKE :customerName)",
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

        queryBuilder.orderBy('order.orderDate', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();
        return { data, total };
    }

    async exportOrders(filters?: {
        orderNumber?: string;
        packageId?: string;
        integrationId?: string;
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
            .leftJoinAndSelect('order.store', 'store')
            .leftJoinAndSelect('order.integration', 'integration');

        if (filters?.orderNumber) queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${filters.orderNumber}%` });
        if (filters?.packageId) queryBuilder.andWhere('order.packageId LIKE :packageId', { packageId: `%${filters.packageId}%` });
        if (filters?.integrationId) queryBuilder.andWhere('order.integrationId = :integrationId', { integrationId: filters.integrationId });
        if (filters?.storeId) queryBuilder.andWhere('order.storeId = :storeId', { storeId: filters.storeId });
        if (filters?.status) queryBuilder.andWhere('order.status = :status', { status: filters.status });
        if (filters?.startDate) queryBuilder.andWhere('order.orderDate >= :startDate', { startDate: new Date(filters.startDate) });
        if (filters?.endDate) queryBuilder.andWhere('order.orderDate <= :endDate', { endDate: new Date(filters.endDate) });
        if (filters?.customerName) {
            queryBuilder.andWhere(
                "(CONCAT(customer.firstName, ' ', customer.lastName) LIKE :customerName OR customer.firstName LIKE :customerName OR customer.lastName LIKE :customerName)",
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
            'Entegrasyon': order.integration?.name || '',
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
            .leftJoinAndSelect('faulty.integration', 'integration')
            .leftJoinAndSelect('faulty.store', 'store')
            .orderBy('faulty.createdAt', 'DESC');

        if (filters?.barcode) {
            // Simple text search in the JSON string for now
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

    /**
     * Fetch and save Aras Kargo ZPL Label for an order
     */
    async fetchCargoLabel(orderId: string): Promise<string | null> {
        const order = await this.orderRepository.findOne({ where: { id: orderId } });
        if (!order) throw new Error(`Order #${orderId} not found`);

        if (!order.cargoTrackingNumber) {
            throw new Error(`Order #${order.orderNumber} does not have a cargo tracking number`);
        }

        const zpl = await this.arasKargoService.getBarcode(order.cargoTrackingNumber);

        if (zpl) {
            order.cargoLabelZpl = zpl;
            await this.orderRepository.save(order);
            return zpl;
        }

        return null;
    }

    async updateTrendyolPackageStatus(
        orderId: string,
        status: 'Picking' | 'Invoiced',
        invoiceNumber?: string
    ): Promise<{ success: boolean; message: string }> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items', 'integration'],
        });

        if (!order) {
            return { success: false, message: 'Sipariş bulunamadı.' };
        }

        if (order.integration?.type !== IntegrationType.TRENDYOL) {
            return { success: false, message: 'Bu sipariş Trendyol siparişi değil.' };
        }

        if (status === 'Invoiced' && !invoiceNumber) {
            return { success: false, message: 'Fatura numarası gereklidir.' };
        }

        if (!order.integrationId) {
            return { success: false, message: 'Bu sipariş bir entegrasyona bağlı değil (manuel sipariş).' };
        }

        const integration = await this.integrationsService.findWithStores(order.integrationId);
        if (!integration) {
            return { success: false, message: 'Entegrasyon bulunamadı.' };
        }

        const storeConfig = integration.integrationStores.find(
            (s) => s.storeId === order.storeId && s.isActive
        );

        if (!storeConfig) {
            return { success: false, message: 'Mağaza yapılandırması bulunamadı.' };
        }

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

        const url = `https://apigw.trendyol.com/integration/order/sellers/${storeConfig.sellerId}/shipment-packages/${order.packageId}`;
        const auth = Buffer.from(`${storeConfig.apiKey}:${storeConfig.apiSecret}`).toString('base64');

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
}

