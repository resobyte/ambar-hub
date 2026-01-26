import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Return } from './entities/return.entity';
import { ReturnItem } from './entities/return-item.entity';
import { ReturnStatus, ReturnShelfType } from './enums/return-status.enum';
import { Store, StoreType } from '../stores/entities/store.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { ShelvesService } from '../shelves/shelves.service';
import { OrdersService } from '../orders/orders.service';
import { InvoicesService } from '../invoices/invoices.service';

@Injectable()
export class ReturnsService {
    private readonly logger = new Logger(ReturnsService.name);

    constructor(
        @InjectRepository(Return)
        private readonly returnRepository: Repository<Return>,
        @InjectRepository(ReturnItem)
        private readonly returnItemRepository: Repository<ReturnItem>,
        @InjectRepository(Store)
        private readonly storeRepository: Repository<Store>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        private readonly shelvesService: ShelvesService,
        @Inject(forwardRef(() => OrdersService))
        private readonly ordersService: OrdersService,
        @Inject(forwardRef(() => InvoicesService))
        private readonly invoicesService: InvoicesService,
    ) {}

    async findAll(
        page: number = 1,
        limit: number = 10,
        filters?: { status?: string; storeId?: string; search?: string }
    ) {
        const queryBuilder = this.returnRepository
            .createQueryBuilder('return')
            .leftJoinAndSelect('return.items', 'items')
            .leftJoinAndSelect('return.store', 'store')
            .leftJoinAndSelect('items.product', 'product');

        if (filters?.status) {
            queryBuilder.andWhere('return.status = :status', { status: filters.status });
        }

        if (filters?.storeId) {
            queryBuilder.andWhere('return.storeId = :storeId', { storeId: filters.storeId });
        }

        if (filters?.search) {
            queryBuilder.andWhere(
                '(return.orderNumber LIKE :search OR return.customerFirstName LIKE :search OR return.customerLastName LIKE :search)',
                { search: `%${filters.search}%` }
            );
        }

        queryBuilder
            .orderBy('return.claimDate', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

        const [returns, total] = await queryBuilder.getManyAndCount();

        return {
            success: true,
            data: returns,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string): Promise<Return> {
        const returnEntity = await this.returnRepository.findOne({
            where: { id },
            relations: ['items', 'items.product', 'store', 'order'],
        });

        if (!returnEntity) {
            throw new NotFoundException(`Return ${id} not found`);
        }

        return returnEntity;
    }

    /**
     * Trendyol'dan iadeleri senkronize et
     */
    async syncFromTrendyol(storeId: string): Promise<{ synced: number; created: number; updated: number }> {
        const store = await this.storeRepository.findOne({ where: { id: storeId } });
        if (!store || store.type !== StoreType.TRENDYOL) {
            throw new BadRequestException('Geçerli bir Trendyol mağazası bulunamadı');
        }

        const result = { synced: 0, created: 0, updated: 0 };

        try {
            const apiKey = store.apiKey;
            const apiSecret = store.apiSecret;
            const sellerId = store.sellerId;

            if (!apiKey || !apiSecret || !sellerId) {
                throw new BadRequestException('Mağaza API bilgileri eksik');
            }

            const authHeader = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
            
            // Son 30 günün iadelerini çek
            const endDate = Date.now();
            const startDate = endDate - (30 * 24 * 60 * 60 * 1000);

            let page = 0;
            let hasMore = true;

            while (hasMore) {
                const url = `https://apigw.trendyol.com/integration/order/sellers/${sellerId}/claims?startDate=${startDate}&endDate=${endDate}&page=${page}&size=50`;
                
                const response = await axios.get(url, {
                    headers: {
                        'Authorization': `Basic ${authHeader}`,
                        'Content-Type': 'application/json',
                    },
                });

                const claims = response.data?.content || [];
                
                if (claims.length === 0) {
                    hasMore = false;
                    break;
                }

                for (const claim of claims) {
                    await this.processClaimFromTrendyol(claim, storeId);
                    result.synced++;
                }

                if (page >= (response.data?.totalPages || 0) - 1) {
                    hasMore = false;
                } else {
                    page++;
                }
            }

            this.logger.log(`[Trendyol Returns] Synced ${result.synced} claims for store ${store.name}`);
        } catch (error) {
            this.logger.error(`[Trendyol Returns] Sync error for store ${storeId}:`, error.message);
            throw error;
        }

        return result;
    }

    private async processClaimFromTrendyol(claim: any, storeId: string): Promise<void> {
        const claimId = claim.claimId || claim.id;

        // Mevcut iade var mı kontrol et
        let returnEntity = await this.returnRepository.findOne({
            where: { claimId },
            relations: ['items'],
        });

        // Siparişi bul
        const order = await this.orderRepository.findOne({
            where: { orderNumber: claim.orderNumber },
        });

        const claimDate = claim.claimDate ? new Date(claim.claimDate) : new Date();
        const orderDate = claim.orderDate ? new Date(claim.orderDate) : null;
        const lastModifiedDate = claim.lastModifiedDate ? new Date(claim.lastModifiedDate) : null;

        // İlk claim item'ın statusunu al (genel status için)
        let integrationStatus = 'Created';
        if (claim.items?.[0]?.claimItems?.[0]?.claimItemStatus?.name) {
            integrationStatus = claim.items[0].claimItems[0].claimItemStatus.name;
        }

        if (!returnEntity) {
            // Yeni iade oluştur
            returnEntity = this.returnRepository.create({
                claimId,
                orderNumber: claim.orderNumber,
                orderDate,
                claimDate,
                customerFirstName: claim.customerFirstName,
                customerLastName: claim.customerLastName,
                cargoTrackingNumber: claim.cargoTrackingNumber?.toString(),
                cargoTrackingLink: claim.cargoTrackingLink,
                cargoSenderNumber: claim.cargoSenderNumber,
                cargoProviderName: claim.cargoProviderName,
                orderShipmentPackageId: claim.orderShipmentPackageId?.toString(),
                orderOutboundPackageId: claim.orderOutboundPackageId?.toString(),
                status: this.mapTrendyolStatus(integrationStatus),
                integrationStatus,
                rejectedPackageInfo: claim.rejectedpackageinfo || null,
                replacementOutboundPackageInfo: claim.replacementOutboundpackageinfo || null,
                lastModifiedDate,
                storeId,
                orderId: order?.id || null,
            });

            await this.returnRepository.save(returnEntity);

            // İade itemlarını ekle
            await this.processClaimItems(returnEntity.id, claim.items || []);
        } else {
            // Güncelle
            returnEntity.integrationStatus = integrationStatus;
            returnEntity.status = this.mapTrendyolStatus(integrationStatus);
            returnEntity.cargoTrackingNumber = claim.cargoTrackingNumber?.toString() || returnEntity.cargoTrackingNumber;
            returnEntity.cargoTrackingLink = claim.cargoTrackingLink || returnEntity.cargoTrackingLink;
            returnEntity.rejectedPackageInfo = claim.rejectedpackageinfo || returnEntity.rejectedPackageInfo;
            if (lastModifiedDate) returnEntity.lastModifiedDate = lastModifiedDate;

            await this.returnRepository.save(returnEntity);

            // Itemları güncelle
            await this.processClaimItems(returnEntity.id, claim.items || []);
        }
    }

    private async processClaimItems(returnId: string, items: any[]): Promise<void> {
        for (const item of items) {
            const orderLine = item.orderLine || {};
            const claimItems = item.claimItems || [];

            for (const claimItem of claimItems) {
                const claimItemId = claimItem.id;

                let returnItem = await this.returnItemRepository.findOne({
                    where: { claimItemId },
                });

                // Ürünü barkod ile bul
                const product = await this.productRepository.findOne({
                    where: { barcode: orderLine.barcode },
                });

                const customerReason = claimItem.customerClaimItemReason || {};
                const trendyolReason = claimItem.trendyolClaimItemReason || {};

                if (!returnItem) {
                    returnItem = this.returnItemRepository.create({
                        returnId,
                        claimItemId,
                        orderLineItemId: claimItem.orderLineItemId?.toString(),
                        productName: orderLine.productName,
                        barcode: orderLine.barcode,
                        merchantSku: orderLine.merchantSku,
                        productColor: orderLine.productColor,
                        productSize: orderLine.productSize,
                        productCategory: orderLine.productCategory,
                        price: orderLine.price || 0,
                        quantity: 1,
                        customerReasonId: customerReason.id,
                        customerReasonName: customerReason.name,
                        customerReasonCode: customerReason.code,
                        trendyolReasonId: trendyolReason.id,
                        trendyolReasonName: trendyolReason.name,
                        customerNote: claimItem.customerNote,
                        claimItemStatus: claimItem.claimItemStatus?.name,
                        resolved: claimItem.resolved || false,
                        autoAccepted: claimItem.autoAccepted || false,
                        acceptedBySeller: claimItem.acceptedBySeller || false,
                        acceptDetail: claimItem.acceptDetail,
                        productId: product?.id || null,
                    });
                } else {
                    returnItem.claimItemStatus = claimItem.claimItemStatus?.name;
                    returnItem.resolved = claimItem.resolved || false;
                    returnItem.autoAccepted = claimItem.autoAccepted || false;
                    returnItem.acceptedBySeller = claimItem.acceptedBySeller || false;
                    returnItem.acceptDetail = claimItem.acceptDetail;
                }

                await this.returnItemRepository.save(returnItem);
            }
        }
    }

    private mapTrendyolStatus(status: string): ReturnStatus {
        switch (status) {
            case 'Created': return ReturnStatus.CREATED;
            case 'WaitingInAction': return ReturnStatus.WAITING_IN_ACTION;
            case 'WaitingFraudCheck': return ReturnStatus.WAITING_FRAUD_CHECK;
            case 'Accepted': return ReturnStatus.ACCEPTED;
            case 'Rejected': return ReturnStatus.REJECTED;
            case 'Cancelled': return ReturnStatus.CANCELLED;
            case 'Unresolved': return ReturnStatus.UNRESOLVED;
            case 'InAnalysis': return ReturnStatus.IN_ANALYSIS;
            default: return ReturnStatus.CREATED;
        }
    }

    /**
     * İade işleme - Rafa yerleştir ve stok ekle
     */
    async processReturn(
        id: string,
        data: {
            items: Array<{
                returnItemId: string;
                shelfId: string;
                shelfType: ReturnShelfType;
                quantity: number;
                notes?: string;
            }>;
            userId?: string;
            notes?: string;
        }
    ): Promise<Return> {
        const returnEntity = await this.findOne(id);

        for (const itemData of data.items) {
            const returnItem = returnEntity.items.find(i => i.id === itemData.returnItemId);
            if (!returnItem) {
                throw new NotFoundException(`Return item ${itemData.returnItemId} not found`);
            }

            if (!returnItem.productId) {
                // Ürünü barkodla bulmaya çalış
                const product = await this.productRepository.findOne({
                    where: { barcode: returnItem.barcode },
                });
                if (product) {
                    returnItem.productId = product.id;
                } else {
                    throw new BadRequestException(`Ürün bulunamadı: ${returnItem.barcode}`);
                }
            }

            // Stok ekle
            await this.shelvesService.addStockWithHistory(
                itemData.shelfId,
                returnItem.productId,
                itemData.quantity,
                {
                    referenceNumber: returnEntity.claimId,
                    notes: `İade - ${itemData.shelfType === ReturnShelfType.DAMAGED ? 'Hasarlı' : 'Normal'} - ${itemData.notes || ''}`,
                    userId: data.userId,
                }
            );

            // Item'ı güncelle
            returnItem.shelfType = itemData.shelfType;
            returnItem.processedShelfId = itemData.shelfId;
            returnItem.processedQuantity = itemData.quantity;
            await this.returnItemRepository.save(returnItem);
        }

        // Return'ü güncelle
        returnEntity.status = ReturnStatus.COMPLETED;
        returnEntity.processedAt = new Date();
        if (data.userId) returnEntity.processedByUserId = data.userId;
        if (data.notes) returnEntity.processNotes = data.notes;

        await this.returnRepository.save(returnEntity);

        // WAITING_STOCK siparişleri kontrol et
        for (const item of returnEntity.items) {
            if (item.productId) {
                await this.ordersService.processWaitingStockOrders(item.productId);
            }
        }

        // İade Faturası (Gider Pusulası) kes - Uyumsoft'a gönder
        try {
            const totalAmount = returnEntity.items.reduce((sum, item) => {
                return sum + (Number(item.price) || 0) * (item.processedQuantity || item.quantity || 1);
            }, 0);

            // Müşteri adresi oluştur
            let customerAddress = '';
            if (returnEntity.order?.shippingAddress) {
                const addr = returnEntity.order.shippingAddress as any;
                customerAddress = [
                    addr.address1 || addr.addressLine1,
                    addr.address2 || addr.addressLine2,
                    addr.district,
                    addr.city,
                ].filter(Boolean).join(' ');
            }

            await this.invoicesService.createRefundInvoiceForReturn({
                returnId: returnEntity.id,
                storeId: returnEntity.storeId,
                orderId: returnEntity.orderId || undefined, // Orijinal sipariş ID - cardCode kuralı için
                orderNumber: returnEntity.orderNumber,
                customerFirstName: returnEntity.customerFirstName,
                customerLastName: returnEntity.customerLastName,
                customerAddress,
                cargoTrackingNumber: returnEntity.cargoTrackingNumber,
                cargoProviderName: returnEntity.cargoProviderName,
                totalAmount,
                items: returnEntity.items.map(item => ({
                    productName: item.productName,
                    barcode: item.barcode,
                    quantity: item.processedQuantity || item.quantity || 1,
                    price: Number(item.price) || 0,
                    vatRate: 20,
                    shelfType: item.shelfType as 'NORMAL' | 'DAMAGED', // Sağlam veya Hasarlı
                })),
            });
            this.logger.log(`Refund invoice created for return ${returnEntity.id}`);
        } catch (error) {
            this.logger.error(`Failed to create refund invoice for return ${returnEntity.id}:`, error.message);
        }

        return this.findOne(id);
    }

    /**
     * Trendyol'da iadeyi onayla
     */
    async approveClaim(id: string): Promise<void> {
        const returnEntity = await this.findOne(id);
        const store = await this.storeRepository.findOne({ where: { id: returnEntity.storeId } });

        if (!store || store.type !== StoreType.TRENDYOL) {
            throw new BadRequestException('Geçerli bir Trendyol mağazası bulunamadı');
        }

        const authHeader = Buffer.from(`${store.apiKey}:${store.apiSecret}`).toString('base64');
        const claimItemIds = returnEntity.items.map(i => i.claimItemId);

        const url = `https://apigw.trendyol.com/integration/order/sellers/${store.sellerId}/claims/${returnEntity.claimId}/items/approve`;

        try {
            await axios.put(url, {
                claimLineItemIdList: claimItemIds,
                params: {},
            }, {
                headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'Content-Type': 'application/json',
                },
            });

            // Status güncelle
            returnEntity.status = ReturnStatus.PENDING_SHELF;
            returnEntity.integrationStatus = 'Accepted';
            await this.returnRepository.save(returnEntity);

            this.logger.log(`Claim ${returnEntity.claimId} approved on Trendyol`);
        } catch (error) {
            this.logger.error(`Failed to approve claim ${returnEntity.claimId}:`, error.message);
            throw new BadRequestException(`Trendyol onay hatası: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Trendyol'da iadeyi reddet
     */
    async rejectClaim(
        id: string,
        data: {
            reasonId: string;
            description: string;
        }
    ): Promise<void> {
        const returnEntity = await this.findOne(id);
        const store = await this.storeRepository.findOne({ where: { id: returnEntity.storeId } });

        if (!store || store.type !== StoreType.TRENDYOL) {
            throw new BadRequestException('Geçerli bir Trendyol mağazası bulunamadı');
        }

        const authHeader = Buffer.from(`${store.apiKey}:${store.apiSecret}`).toString('base64');
        const claimItemIds = returnEntity.items.map(i => i.claimItemId).join(',');

        const url = `https://apigw.trendyol.com/integration/order/sellers/${store.sellerId}/claims/${returnEntity.claimId}/issue?claimIssueReasonId=${data.reasonId}&claimItemIdList=${claimItemIds}&description=${encodeURIComponent(data.description)}`;

        try {
            await axios.post(url, {}, {
                headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'Content-Type': 'application/json',
                },
            });

            // Status güncelle - red sonrası da rafa ekleme gerekebilir
            returnEntity.status = ReturnStatus.PENDING_SHELF;
            returnEntity.integrationStatus = 'Rejected';
            await this.returnRepository.save(returnEntity);

            this.logger.log(`Claim ${returnEntity.claimId} rejected on Trendyol`);
        } catch (error) {
            this.logger.error(`Failed to reject claim ${returnEntity.claimId}:`, error.message);
            throw new BadRequestException(`Trendyol red hatası: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * İade red sebeplerini getir
     */
    getRejectReasons(): Array<{ id: string; name: string }> {
        return [
            { id: '1651', name: 'Müşterinin yolladığı iade paketi elime ulaşmadı' },
            { id: '451', name: 'Müşteriden gelen ürünü analize göndereceğim' },
            { id: '2101', name: 'Sipariş sorusundan gelen değişim talebi' },
            { id: '2003', name: 'Kullanılmış Ürün Sebepli Red' },
            { id: '2004', name: 'Hijyenik Sebepli Red' },
            { id: '2008', name: 'Üründe adet/aksesuar eksiği' },
            { id: '2009', name: 'Firmaya ait olmayan ürün' },
        ];
    }
}
