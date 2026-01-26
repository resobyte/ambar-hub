import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Route } from './entities/route.entity';
import { RouteOrder } from './entities/route-order.entity';
import { RouteConsumable } from './entities/route-consumable.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ShelfStock } from '../shelves/entities/shelf-stock.entity';
import { Consumable } from '../consumables/entities/consumable.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { RouteStatus } from './enums/route-status.enum';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { CreateRouteDto } from './dto/create-route.dto';
import { RouteFilterDto } from './dto/route-filter.dto';
import { RouteResponseDto } from './dto/route-response.dto';
import { ConsumablesService } from '../consumables/consumables.service';
import { OrderHistoryService } from '../orders/order-history.service';
import { OrderHistoryAction } from '../orders/entities/order-history.entity';
import { InvoicesService } from '../invoices/invoices.service';
import { ArasKargoService } from '../stores/providers/aras-kargo.service';
import { Store } from '../stores/entities/store.entity';

interface ProductInfo {
    barcode: string;
    name: string;
    quantity: number;
}

interface OrderWithProductInfo {
    id: string;
    orderNumber: string;
    store: { id: string; name: string } | null;
    customerFirstName: string | null;
    customerLastName: string | null;
    products: ProductInfo[];
    uniqueProductCount: number;
    totalQuantity: number;
}

interface RouteSuggestionProduct {
    barcode: string;
    name: string;
    orderCount: number;
    totalQuantity: number;
}

export interface RouteSuggestion {
    id: string;
    type: 'single_product' | 'single_product_multi' | 'mixed';
    name: string;
    description: string;
    storeName?: string;
    storeId?: string;
    orderCount: number;
    totalQuantity: number;
    products: RouteSuggestionProduct[];
    orders: OrderWithProductInfo[];
    priority: number;
}

@Injectable()
export class RoutesService {
    private readonly logger = new Logger(RoutesService.name);

    constructor(
        @InjectRepository(Route)
        private readonly routeRepository: Repository<Route>,
        @InjectRepository(RouteOrder)
        private readonly routeOrderRepository: Repository<RouteOrder>,
        @InjectRepository(RouteConsumable)
        private readonly routeConsumableRepository: Repository<RouteConsumable>,
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        @InjectRepository(OrderItem)
        private readonly orderItemRepository: Repository<OrderItem>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @InjectRepository(ShelfStock)
        private readonly shelfStockRepository: Repository<ShelfStock>,
        @InjectRepository(Consumable)
        private readonly consumableRepository: Repository<Consumable>,
        @InjectRepository(Store)
        private readonly storeRepository: Repository<Store>,
        @InjectRepository(Invoice)
        private readonly invoiceRepository: Repository<Invoice>,
        private readonly consumablesService: ConsumablesService,
        @Inject(forwardRef(() => OrderHistoryService))
        private readonly orderHistoryService: OrderHistoryService,
        @Inject(forwardRef(() => InvoicesService))
        private readonly invoicesService: InvoicesService,
        private readonly arasKargoService: ArasKargoService,
    ) { }

    async create(dto: CreateRouteDto, userId?: string): Promise<RouteResponseDto> {
        // Validate orders exist and are in valid status
        const orders = await this.orderRepository.find({
            where: { id: In(dto.orderIds) },
            relations: ['items', 'store'],
        });

        if (orders.length !== dto.orderIds.length) {
            throw new BadRequestException('Some orders not found');
        }

        // Check orders are not already in an active route
        const existingRouteOrders = await this.routeOrderRepository.find({
            where: {
                orderId: In(dto.orderIds),
            },
            relations: ['route'],
        });

        const activeRouteOrders = existingRouteOrders.filter(
            ro => ro.route && ro.route.status !== RouteStatus.COMPLETED && ro.route.status !== RouteStatus.CANCELLED
        );

        if (activeRouteOrders.length > 0) {
            throw new BadRequestException('Some orders are already in an active route');
        }

        // Check if all orders belong to the same store
        const storeIds = new Set(orders.map(o => o.store?.id || 'no-store'));
        if (storeIds.size > 1) {
            const storeNames = orders
                .map(o => o.store?.name || 'Mağazasız')
                .filter((v, i, a) => a.indexOf(v) === i);
            throw new BadRequestException(
                `Farklı mağazalardaki siparişler aynı rotaya eklenemez. Seçilen mağazalar: ${storeNames.join(', ')}`
            );
        }

        // Check if all products are on sellable shelves
        const allProductBarcodes: string[] = [];
        for (const order of orders) {
            if (order.items) {
                order.items.forEach(item => {
                    if (item.barcode) allProductBarcodes.push(item.barcode);
                });
            }
        }

        if (allProductBarcodes.length > 0) {
            // Get products by barcodes
            const products = await this.productRepository.find({
                where: { barcode: In(allProductBarcodes) },
            });

            const productIds = products.map(p => p.id);

            if (productIds.length > 0) {
                // Check shelf stocks for these products - only on sellable shelves
                const shelfStocks = await this.shelfStockRepository
                    .createQueryBuilder('ss')
                    .innerJoin('ss.shelf', 'shelf')
                    .where('ss.productId IN (:...productIds)', { productIds })
                    .andWhere('ss.quantity > 0')
                    .andWhere('shelf.isSellable = :isSellable', { isSellable: true })
                    .select(['ss.productId', 'SUM(ss.quantity) as totalQty'])
                    .groupBy('ss.productId')
                    .getRawMany();

                const sellableProductIds = new Set(shelfStocks.map(s => s.ss_product_id || s.productId));

                // Find products that are NOT on sellable shelves
                const unsellableProducts: string[] = [];
                for (const product of products) {
                    if (!sellableProductIds.has(product.id)) {
                        unsellableProducts.push(product.name || product.barcode);
                    }
                }

                if (unsellableProducts.length > 0) {
                    throw new BadRequestException(
                        `Şu ürünler satılabilir rafta değil: ${unsellableProducts.slice(0, 3).join(', ')}${unsellableProducts.length > 3 ? ` ve ${unsellableProducts.length - 3} ürün daha` : ''}`
                    );
                }
            }
        }

        // Calculate totals and unique products
        let totalItemCount = 0;
        const allBarcodes = new Set<string>();
        let orderStartDate: Date | null = null;
        let orderEndDate: Date | null = null;

        for (const order of orders) {
            if (order.items) {
                totalItemCount += order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
                order.items.forEach(item => {
                    if (item.barcode) allBarcodes.add(item.barcode);
                });
            }
            if (order.orderDate) {
                const oDate = new Date(order.orderDate);
                if (!orderStartDate || oDate < orderStartDate) orderStartDate = oDate;
                if (!orderEndDate || oDate > orderEndDate) orderEndDate = oDate;
            }
        }

        // Generate route code (R000001, R000002, etc.)
        const lastRoute = await this.routeRepository
            .createQueryBuilder('route')
            .orderBy('route.createdAt', 'DESC')
            .getOne();

        let nextNumber = 1;
        if (lastRoute && lastRoute.name && lastRoute.name.startsWith('R')) {
            // Handle both R000001 and R_001 formats for backward compatibility
            const numPart = lastRoute.name.replace(/^R_?/, '');
            const parsed = parseInt(numPart, 10);
            if (!isNaN(parsed)) {
                nextNumber = parsed + 1;
            }
        }
        const routeCode = `R${String(nextNumber).padStart(6, '0')}`;

        // Create route
        const route = this.routeRepository.create({
            name: routeCode,
            description: dto.description || null,
            status: RouteStatus.COLLECTING,
            totalOrderCount: orders.length,
            totalItemCount,
            uniqueProductCount: allBarcodes.size,
            pickedItemCount: 0,
            packedOrderCount: 0,
            createdById: userId || null,
            orderStartDate,
            orderEndDate,
            isActive: true,
        });

        const savedRoute = await this.routeRepository.save(route);


        // Create route orders
        const routeOrders = orders.map((order, index) =>
            this.routeOrderRepository.create({
                routeId: savedRoute.id,
                orderId: order.id,
                sequence: index + 1,
                isPicked: false,
                isPacked: false,
            })
        );

        await this.routeOrderRepository.save(routeOrders);

        // Handle consumables if provided
        if (dto.consumables && dto.consumables.length > 0) {
            for (const consumableDto of dto.consumables) {
                const consumable = await this.consumableRepository.findOne({
                    where: { id: consumableDto.consumableId }
                });

                if (!consumable) {
                    this.logger.warn(`Consumable ${consumableDto.consumableId} not found, skipping`);
                    continue;
                }

                // Create route consumable record
                const routeConsumable = this.routeConsumableRepository.create({
                    routeId: savedRoute.id,
                    consumableId: consumableDto.consumableId,
                    quantity: consumableDto.quantity,
                    unitCost: Number(consumable.averageCost) || 0,
                });
                await this.routeConsumableRepository.save(routeConsumable);

                // Deduct from consumable stock (don't go below 0)
                const currentStock = Number(consumable.stockQuantity) || 0;
                const deductAmount = Math.min(consumableDto.quantity, currentStock);
                if (deductAmount > 0) {
                    consumable.stockQuantity = currentStock - deductAmount;
                    await this.consumableRepository.save(consumable);
                }
            }
        }

        // Update order statuses to PICKING
        await this.orderRepository.update(
            { id: In(dto.orderIds) },
            { status: OrderStatus.PICKING }
        );

        // Log order history for each order
        for (const order of orders) {
            await this.orderHistoryService.logEvent({
                orderId: order.id,
                action: OrderHistoryAction.ROUTE_ASSIGNED,
                userId,
                previousStatus: order.status,
                newStatus: OrderStatus.PICKING,
                routeId: savedRoute.id,
                routeName: routeCode,
                description: `Sipariş ${routeCode} rotasına eklendi`,
            });
        }

        return this.findOne(savedRoute.id);
    }

    async findAll(status?: RouteStatus[]): Promise<RouteResponseDto[]> {
        const queryBuilder = this.routeRepository
            .createQueryBuilder('route')
            .leftJoinAndSelect('route.routeOrders', 'routeOrders')
            .leftJoinAndSelect('routeOrders.order', 'order')
            .where('route.isActive = :isActive', { isActive: true });

        if (status && status.length > 0) {
            queryBuilder.andWhere('route.status IN (:...status)', { status });
        }

        queryBuilder.orderBy('route.createdAt', 'DESC');

        const routes = await queryBuilder.getMany();
        return routes.map(route => RouteResponseDto.fromEntity(route));
    }

    async findOne(id: string): Promise<RouteResponseDto> {
        const route = await this.routeRepository.findOne({
            where: { id },
            relations: ['routeOrders', 'routeOrders.order', 'routeOrders.order.items', 'routeOrders.order.store', 'routeOrders.order.customer', 'createdBy'],
        });

        if (!route) {
            throw new NotFoundException(`Route ${id} not found`);
        }

        return RouteResponseDto.fromEntity(route);
    }

    async findByName(name: string, requiredStatus?: RouteStatus | RouteStatus[]): Promise<RouteResponseDto> {
        const route = await this.routeRepository.findOne({
            where: { name },
            relations: ['routeOrders', 'routeOrders.order', 'routeOrders.order.items', 'routeOrders.order.store', 'routeOrders.order.customer', 'createdBy'],
        });

        if (!route) {
            throw new NotFoundException(`Route with name ${name} not found`);
        }

        if (requiredStatus) {
            const allowedStatuses = Array.isArray(requiredStatus) ? requiredStatus : [requiredStatus];
            if (!allowedStatuses.includes(route.status)) {
                const statusNames = allowedStatuses.join(' or ');
                throw new BadRequestException(`Route ${name} is not in ${statusNames} status`);
            }
        }

        return RouteResponseDto.fromEntity(route);
    }

    async getFilteredOrders(filter: RouteFilterDto): Promise<any[]> {
        // Get orders that are ready for picking (WAITING_PICKING status, not in active route)
        const queryBuilder = this.orderRepository
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.store', 'store')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('order.customer', 'customer')
            .where('order.status IN (:...validStatuses)', {
                validStatuses: [OrderStatus.WAITING_PICKING, OrderStatus.PICKING],
            });

        // Exclude orders already in active routes
        const activeRouteOrderIds = await this.routeOrderRepository
            .createQueryBuilder('ro')
            .innerJoin('ro.route', 'route')
            .where('route.status NOT IN (:...excludedStatuses)', {
                excludedStatuses: [RouteStatus.COMPLETED, RouteStatus.CANCELLED],
            })
            .select('ro.orderId')
            .getRawMany();

        const excludedOrderIds = activeRouteOrderIds.map(ro => ro.ro_order_id);
        if (excludedOrderIds.length > 0) {
            queryBuilder.andWhere('order.id NOT IN (:...excludedOrderIds)', { excludedOrderIds });
        }

        if (filter.storeId) {
            queryBuilder.andWhere('order.storeId = :storeId', { storeId: filter.storeId });
        }

        if (filter.integrationId) {
            queryBuilder.andWhere('order.integrationId = :integrationId', { integrationId: filter.integrationId });
        }

        if (filter.search && filter.search.trim()) {
            const searchTerm = `%${filter.search.trim().toLowerCase()}%`;
            queryBuilder.andWhere(
                '(LOWER(order.orderNumber) LIKE :search OR LOWER(order.packageId) LIKE :search)',
                { search: searchTerm }
            );
        }

        if (filter.overdue) {
            const now = new Date();
            queryBuilder
                .andWhere('order.agreedDeliveryDate IS NOT NULL')
                .andWhere('order.agreedDeliveryDate < :now', { now });
        }

        if (filter.micro !== undefined) {
            queryBuilder.andWhere('order.micro = :micro', { micro: filter.micro });
        }

        if (filter.orderDateStart) {
            queryBuilder.andWhere('order.orderDate >= :orderDateStart', {
                orderDateStart: new Date(filter.orderDateStart)
            });
        }

        if (filter.orderDateEnd) {
            const endDate = new Date(filter.orderDateEnd);
            endDate.setHours(23, 59, 59, 999);
            queryBuilder.andWhere('order.orderDate <= :orderDateEnd', {
                orderDateEnd: endDate
            });
        }

        if (filter.agreedDeliveryDateStart) {
            queryBuilder.andWhere('order.agreedDeliveryDate >= :agreedDeliveryDateStart', {
                agreedDeliveryDateStart: new Date(filter.agreedDeliveryDateStart)
            });
        }

        if (filter.agreedDeliveryDateEnd) {
            const endDate = new Date(filter.agreedDeliveryDateEnd);
            endDate.setHours(23, 59, 59, 999);
            queryBuilder.andWhere('order.agreedDeliveryDate <= :agreedDeliveryDateEnd', {
                agreedDeliveryDateEnd: endDate
            });
        }

        const orders = await queryBuilder.orderBy('order.orderDate', 'ASC').getMany();

        let filteredOrders = orders;

        // Filter by product barcodes
        if (filter.productBarcodes && filter.productBarcodes.length > 0) {
            filteredOrders = filteredOrders.filter(order => {
                if (!order.items || order.items.length === 0) return false;
                const orderBarcodes = order.items.map(item => item.barcode).filter(Boolean);
                return filter.productBarcodes!.some(barcode => orderBarcodes.includes(barcode));
            });
        }

        // Filter by order type
        if (filter.type) {
            filteredOrders = filteredOrders.filter(order => {
                if (!order.items || order.items.length === 0) return false;
                const uniqueProducts = new Set(order.items.map(item => item.barcode).filter(Boolean));
                const totalQty = order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);

                if (filter.type === 'single_product') {
                    return uniqueProducts.size === 1 && totalQty === 1;
                } else if (filter.type === 'single_product_multi') {
                    return uniqueProducts.size === 1 && totalQty > 1;
                } else if (filter.type === 'mixed') {
                    return uniqueProducts.size > 1;
                }
                return true;
            });
        }

        // Filter by quantity range
        if (filter.minTotalQuantity !== undefined || filter.maxTotalQuantity !== undefined) {
            filteredOrders = filteredOrders.filter(order => {
                const totalQty = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
                if (filter.minTotalQuantity !== undefined && totalQty < filter.minTotalQuantity) return false;
                if (filter.maxTotalQuantity !== undefined && totalQty > filter.maxTotalQuantity) return false;
                return true;
            });
        }

        // Filter by brand (product name contains brand)
        if (filter.brand && filter.brand.trim()) {
            const brandLower = filter.brand.trim().toLowerCase();
            filteredOrders = filteredOrders.filter(order => {
                if (!order.items || order.items.length === 0) return false;
                return order.items.some(item =>
                    item.productName?.toLowerCase().includes(brandLower)
                );
            });
        }

        return filteredOrders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            packageId: order.packageId,
            status: order.status,
            totalPrice: order.totalPrice,
            orderDate: order.orderDate,
            agreedDeliveryDate: order.agreedDeliveryDate,
            micro: order.micro,
            store: order.store ? { id: order.store.id, name: order.store.name } : null,
            customer: order.customer ? {
                firstName: order.customer.firstName,
                lastName: order.customer.lastName,
            } : null,
            items: order.items?.map(item => ({
                barcode: item.barcode,
                productName: item.productName,
                quantity: item.quantity,
                sku: item.sku,
                productColor: item.productColor,
                productSize: item.productSize,
            })) || [],
            uniqueProductCount: new Set(order.items?.map(i => i.barcode).filter(Boolean)).size,
            totalQuantity: order.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0,
        }));
    }

    async getRouteSuggestions(
        storeId?: string,
        typeFilter?: string[],
        productBarcodes?: string[],
        orderLimit?: number,
    ): Promise<RouteSuggestion[]> {
        // Get all available orders
        const filter: RouteFilterDto = { storeId, productBarcodes };
        const orders = await this.getFilteredOrders(filter);

        if (orders.length === 0) return [];

        const suggestions: RouteSuggestion[] = [];

        // Group by store
        const ordersByStore = new Map<string, { storeName: string; orders: any[] }>();
        for (const order of orders) {
            const storeKey = order.store?.id || 'no-store';
            const storeName = order.store?.name || 'Mağazasız';
            if (!ordersByStore.has(storeKey)) {
                ordersByStore.set(storeKey, { storeName, orders: [] });
            }
            ordersByStore.get(storeKey)!.orders.push(order);
        }

        let suggestionId = 0;

        for (const [storeKey, storeData] of ordersByStore) {
            const { storeName, orders: storeOrders } = storeData;

            // Group single product orders by barcode
            const singleProductOrders = new Map<string, any[]>();
            const multiProductOrders: any[] = [];

            for (const order of storeOrders) {
                if (order.uniqueProductCount === 1) {
                    const barcode = order.items[0]?.barcode || 'unknown';
                    if (!singleProductOrders.has(barcode)) {
                        singleProductOrders.set(barcode, []);
                    }
                    singleProductOrders.get(barcode)!.push(order);
                } else {
                    multiProductOrders.push(order);
                }
            }

            // Create suggestions for single product groups
            for (const [barcode, groupOrders] of singleProductOrders) {
                if (groupOrders.length === 0) continue;

                const productName = groupOrders[0].items[0]?.productName || 'Ürün';
                const totalQty = groupOrders.reduce((sum, o) => sum + o.totalQuantity, 0);
                const hasSingleQty = groupOrders.every(o => o.totalQuantity === 1);

                suggestions.push({
                    id: `suggestion-${++suggestionId}`,
                    type: hasSingleQty ? 'single_product' : 'single_product_multi',
                    name: `${productName} (${groupOrders.length} sipariş)`,
                    description: `${barcode} - Toplam ${totalQty} adet`,
                    storeName,
                    storeId: storeKey !== 'no-store' ? storeKey : undefined,
                    orderCount: groupOrders.length,
                    totalQuantity: totalQty,
                    products: [{
                        barcode,
                        name: productName,
                        orderCount: groupOrders.length,
                        totalQuantity: totalQty,
                    }],
                    orders: groupOrders,
                    priority: hasSingleQty ? 100 : 80, // Single qty has higher priority
                });
            }

            // Create suggestion for mixed orders if any
            if (multiProductOrders.length > 0) {
                const totalQty = multiProductOrders.reduce((sum, o) => sum + o.totalQuantity, 0);

                // Aggregate products
                const productMap = new Map<string, { name: string; orderCount: number; totalQty: number }>();
                for (const order of multiProductOrders) {
                    for (const item of order.items || []) {
                        if (!item.barcode) continue;
                        if (!productMap.has(item.barcode)) {
                            productMap.set(item.barcode, { name: item.productName, orderCount: 0, totalQty: 0 });
                        }
                        const p = productMap.get(item.barcode)!;
                        p.orderCount++;
                        p.totalQty += item.quantity || 1;
                    }
                }

                suggestions.push({
                    id: `suggestion-${++suggestionId}`,
                    type: 'mixed',
                    name: `Karma Siparişler (${multiProductOrders.length} sipariş)`,
                    description: `Her siparişte birden fazla farklı ürün var`,
                    storeName,
                    storeId: storeKey !== 'no-store' ? storeKey : undefined,
                    orderCount: multiProductOrders.length,
                    totalQuantity: totalQty,
                    products: Array.from(productMap.entries()).map(([barcode, p]) => ({
                        barcode,
                        name: p.name,
                        orderCount: p.orderCount,
                        totalQuantity: p.totalQty,
                    })),
                    orders: multiProductOrders,
                    priority: 50, // Lower priority for mixed
                });

            }
        }

        // Apply FIFO limit to each suggestion's orders
        if (orderLimit && orderLimit > 0) {
            for (const suggestion of suggestions) {
                if (suggestion.orders.length > orderLimit) {
                    suggestion.orders = suggestion.orders.slice(0, orderLimit);
                    suggestion.orderCount = suggestion.orders.length;
                    suggestion.totalQuantity = suggestion.orders.reduce(
                        (sum, o) => sum + o.totalQuantity, 0
                    );
                }
            }
        }

        // Filter by type if provided
        if (typeFilter && typeFilter.length > 0) {
            return suggestions
                .filter(s => typeFilter.includes(s.type))
                .sort((a, b) => b.priority - a.priority);
        }

        return suggestions.sort((a, b) => b.priority - a.priority);
    }


    async remove(id: string): Promise<void> {
        const route = await this.routeRepository.findOne({
            where: { id },
            relations: ['routeOrders'],
        });

        if (!route) {
            throw new NotFoundException(`Route ${id} not found`);
        }

        if (route.status === RouteStatus.COMPLETED) {
            throw new BadRequestException('Tamamlanmış bir rota iptal edilemez');
        }

        // Cannot cancel a route that is READY (Rotada Toplanmış)
        if (route.status === RouteStatus.READY) {
            throw new BadRequestException('Rotada Toplanmış bir rota iptal edilemez');
        }

        // Check if picking has started (any items have been picked)
        if (route.pickedItemCount > 0) {
            throw new BadRequestException('Toplanmaya başlanmış bir rota iptal edilemez');
        }

        // Also check if any route order has been marked as picked
        const hasPickedOrders = route.routeOrders?.some(ro => ro.isPicked) || false;
        if (hasPickedOrders) {
            throw new BadRequestException('Toplanmaya başlanmış bir rota iptal edilemez');
        }

        // Get order IDs to reset their status
        const orderIds = route.routeOrders?.map(ro => ro.orderId) || [];

        // Delete route orders
        await this.routeOrderRepository.delete({ routeId: id });

        // Mark route as cancelled
        route.status = RouteStatus.CANCELLED;
        route.isActive = false;
        await this.routeRepository.save(route);

        // Reset order statuses back to WAITING_PICKING
        if (orderIds.length > 0) {
            await this.orderRepository.update(
                { id: In(orderIds) },
                { status: OrderStatus.WAITING_PICKING }
            );
        }
    }

    async updateLabelPrinted(id: string): Promise<void> {
        await this.routeRepository.update(id, {
            labelPrintedAt: new Date(),
        });
    }

    /**
     * Toplu İşlem: Rotadaki tüm siparişler için fatura kes + etiket çek
     */
    async bulkProcessOrders(routeId: string, userId?: string): Promise<{
        processed: number;
        total: number;
        errors: string[];
        results: Array<{
            orderId: string;
            orderNumber: string;
            invoiceCreated: boolean;
            invoiceNumber?: string;
            labelFetched: boolean;
            labelType?: 'aras' | 'dummy';
            error?: string;
        }>;
    }> {
        // 1. Rotayı ve siparişlerini getir
        const route = await this.routeRepository.findOne({
            where: { id: routeId },
            relations: ['routeOrders', 'routeOrders.order', 'routeOrders.order.store', 'routeOrders.order.customer', 'routeOrders.order.items'],
        });

        if (!route) {
            throw new NotFoundException(`Rota bulunamadı: ${routeId}`);
        }

        const orders = route.routeOrders
            .map(ro => ro.order)
            .filter(order => order !== null && order !== undefined);
        const results: Array<{
            orderId: string;
            orderNumber: string;
            invoiceCreated: boolean;
            invoiceNumber?: string;
            labelFetched: boolean;
            labelType?: 'aras' | 'dummy';
            error?: string;
        }> = [];

        const errors: string[] = [];
        let processed = 0;

        // 2. Toplu fatura kuyruğa ekle
        const ordersToInvoice = orders.filter(order => order.documentType !== 'WAYBILL');
        const orderIdsToInvoice = ordersToInvoice.map(o => o.id);

        // Fatura sonuçlarını tut
        const invoiceResults: Map<string, { success: boolean; invoiceNumber?: string; error?: string }> = new Map();

        if (orderIdsToInvoice.length > 0) {
            try {
                this.logger.log(`Queueing bulk invoices for ${orderIdsToInvoice.length} orders in route ${routeId}`);
                // sendImmediately: false -> sadece kuyruğa ekle, job işlesin
                const bulkResult = await this.invoicesService.createBulkInvoices(orderIdsToInvoice, { sendImmediately: false });

                // Sonuçları map'e ekle
                for (const s of bulkResult.success) {
                    invoiceResults.set(s.orderId, { success: true, invoiceNumber: s.invoiceNumber });
                }
                for (const f of bulkResult.failed) {
                    invoiceResults.set(f.orderId, { success: false, error: f.error });
                    errors.push(`Fatura kuyruğa eklenemedi (${orders.find(o => o.id === f.orderId)?.orderNumber}): ${f.error}`);
                }

                this.logger.log(`Bulk invoice queue completed: ${bulkResult.success.length} queued, ${bulkResult.failed.length} failed`);
            } catch (error: any) {
                this.logger.error(`Bulk invoice queue failed for route ${routeId}: ${error.message}`);
                errors.push(`Toplu fatura kuyruğa ekleme hatası: ${error.message}`);
            }
        }

        // 3. Her sipariş için etiket oluştur ve sonuçları derle
        for (const order of orders) {
            const orderResult: {
                orderId: string;
                orderNumber: string;
                invoiceCreated: boolean;
                invoiceNumber?: string;
                labelFetched: boolean;
                labelType?: 'aras' | 'dummy';
                error?: string;
            } = {
                orderId: order.id,
                orderNumber: order.orderNumber,
                invoiceCreated: false,
                labelFetched: false,
            };

            try {
                // A. Fatura sonucunu kontrol et
                const invoiceResult = invoiceResults.get(order.id);
                if (invoiceResult) {
                    if (invoiceResult.success) {
                        orderResult.invoiceCreated = true;
                        orderResult.invoiceNumber = invoiceResult.invoiceNumber;
                    }
                    // Error zaten yukarıda errors'a eklendi
                }

                // B. Etiket oluştur - Önce Aras'tan ZPL çek, başarısızsa dummy oluştur
                if (!order.cargoLabelZpl) {
                    let labelType: 'aras' | 'dummy' = 'dummy';

                    // Önce Aras'tan deneyim
                    const arasZpl = await this.fetchArasLabel(order);

                    if (arasZpl) {
                        // Aras başarılı
                        await this.orderRepository.update(order.id, {
                            cargoLabelZpl: arasZpl,
                        });
                        labelType = 'aras';
                        this.logger.log(`Aras label fetched for order ${order.orderNumber}`);
                    } else {
                        // Aras başarısız, dummy oluştur
                        const invoiceNum = await this.getInvoiceNumberForOrder(order.id);
                        const dummyZpl = this.generateDummyZplWithInvoice(order, invoiceNum);
                        await this.orderRepository.update(order.id, {
                            cargoLabelZpl: dummyZpl,
                        });
                        this.logger.warn(`Aras label failed for ${order.orderNumber}, using dummy label`);
                    }

                    orderResult.labelType = labelType;
                }
                orderResult.labelFetched = true;
                this.logger.log(`Label generated for order ${order.orderNumber}`);

                processed++;
                results.push(orderResult);

            } catch (error: any) {
                const message = `Sipariş işlenemedi (${order.orderNumber}): ${error.message}`;
                this.logger.error(message);
                errors.push(message);
                orderResult.error = error.message;
                results.push(orderResult);
            }
        }

        this.logger.log(`Bulk process completed for route ${routeId}: ${processed}/${orders.length} orders processed`);

        return {
            processed,
            total: orders.length,
            errors,
            results,
        };
    }

    /**
     * Aras Kargo'dan ZPL etiket çek
     */
    private async fetchArasLabel(order: Order): Promise<string | null> {
        try {
            const integrationCode = order.cargoTrackingNumber || order.orderNumber;
            return await this.arasKargoService.getBarcode(integrationCode);
        } catch (error) {
            this.logger.warn(`Aras label fetch failed for ${order.orderNumber}: ${error.message}`);
            return null;
        }
    }

    /**
     * Sipariş için fatura numarasını getir
     */
    private async getInvoiceNumberForOrder(orderId: string): Promise<string | null> {
        const invoice = await this.invoiceRepository.findOne({
            where: { orderId },
            order: { createdAt: 'DESC' },
        });
        return invoice?.invoiceNumber || null;
    }

    /**
     * Dummy ZPL etiket oluştur (fatura numarasıyla, ürünler ve gönderici bilgileriyle)
     */
    private generateDummyZplWithInvoice(order: Order, invoiceNum: string | null): string {
        const trackingNum = order.cargoTrackingNumber || 'N/A';
        const orderNum = order.orderNumber;
        const customerName = order.customer
            ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
            : 'N/A';
        const invoiceDisplay = invoiceNum || 'N/A';

        // Get store sender info
        const senderCompanyName = order.store?.senderCompanyName || order.store?.brandName || 'Farmakozmetika Sağlık Ürünleri ve Kozmetik Tic. Ltd. Şti.';
        const senderAddress = order.store?.senderAddress || 'Cihangir Mahallesi Güvercin Sokak No:4 193 Numara Avcılar İstanbul';
        const senderTaxOffice = order.store?.senderTaxOffice || 'Avcılar';
        const senderTaxNumber = order.store?.senderTaxNumber || order.store?.companyCode || '3851513350';

        // Build products list with SKUs
        let productsText = '';
        if (order.items && order.items.length > 0) {
            const productLines = order.items.slice(0, 5).map(item => {
                const sku = item.sku || item.barcode || 'N/A';
                const name = item.productName || 'Ürün';
                const qty = item.quantity || 1;
                return `${sku} x${qty} ${name}`;
            });
            productsText = productLines.join(' | ');
        }

        return `^XA
^FO50,50^A0N,40,30^FDSiparis: ${orderNum}^FS
^FO50,100^A0N,30,20^FDFatura: ${invoiceDisplay}^FS
^FO50,140^A0N,30,20^FDTakip: ${trackingNum}^FS
^FO50,180^A0N,30,20^FDMusteri: ${customerName}^FS
^FO50,220^A0N,25,20^FDGonderici: ${senderCompanyName}^FS
^FO50,260^A0N,20,15^FD${senderAddress}^FS
^FO50,290^A0N,20,15^FDVD: ${senderTaxOffice} VKN/TC: ${senderTaxNumber}^FS
^FO50,340^A0N,20,15^FDUrunler: ${productsText}^FS
^FO50,400^BCN,100,Y,N,N^FD${trackingNum}^FS
^XZ`;
    }

    /**
     * Rotadaki tüm ZPL etiketlerini birleştir (yazdırma için)
     */
    async getAllLabelsZpl(routeId: string): Promise<{ zplContent: string; htmlContent: string; orderCount: number }> {
        const route = await this.routeRepository.findOne({
            where: { id: routeId },
            relations: ['routeOrders', 'routeOrders.order', 'routeOrders.order.customer', 'routeOrders.order.store', 'routeOrders.order.items'],
        });

        if (!route) {
            throw new NotFoundException(`Rota bulunamadı: ${routeId}`);
        }

        const zplContents: string[] = [];
        const ordersWithLabels: any[] = [];

        for (const routeOrder of route.routeOrders) {
            const order = routeOrder.order;
            if (order.cargoLabelZpl) {
                zplContents.push(order.cargoLabelZpl);
                // Invoice numarasını al
                const invoiceNumber = await this.getInvoiceNumberForOrder(order.id);
                ordersWithLabels.push({
                    ...order,
                    invoiceNumber,
                });
            }
        }

        if (zplContents.length === 0) {
            throw new BadRequestException('Bu rotada hiç etiket bulunamadı. Önce toplu işlemi başlatın.');
        }

        // Tüm ZPL'leri birleştir
        const combinedZpl = zplContents.join('\n');

        // HTML etiketlerini oluştur
        const htmlContent = this.generateCargoLabelsHtml(ordersWithLabels, route);

        return {
            zplContent: combinedZpl,
            htmlContent,
            orderCount: zplContents.length,
        };
    }

    /**
     * Rotadaki siparişleri paketlendi olarak işaretle
     */
    async markOrdersAsPacked(routeId: string): Promise<{ updated: number; errors: string[] }> {
        const route = await this.routeRepository.findOne({
            where: { id: routeId },
            relations: ['routeOrders', 'routeOrders.order'],
        });

        if (!route) {
            throw new NotFoundException(`Rota bulunamadı: ${routeId}`);
        }

        const errors: string[] = [];
        let updated = 0;

        // Etiket oluşturulmuş tüm siparişleri PACKED statüsüne çek
        for (const routeOrder of route.routeOrders) {
            const order = routeOrder.order;

            // Sadece etiket oluşturulmuş ve henüz paketlenmemiş siparişleri güncelle
            if (order && order.cargoLabelZpl && order.status !== OrderStatus.PACKED) {
                try {
                    await this.orderRepository.update(order.id, {
                        status: OrderStatus.PACKED,
                    });

                    // Route order'ı da güncelle (composite key kullanarak)
                    await this.routeOrderRepository.update(
                        { routeId: routeId, orderId: order.id },
                        { isPacked: true, packedAt: new Date() }
                    );

                    updated++;

                    // Log history
                    await this.orderHistoryService.logEvent({
                        orderId: order.id,
                        action: OrderHistoryAction.STATUS_CHANGED,
                        previousStatus: order.status,
                        newStatus: OrderStatus.PACKED,
                        description: `Rota etiketleri yazdırıldıktan sonra otomatik olarak paketlendi`,
                    });
                } catch (error: any) {
                    this.logger.error(`Failed to mark order ${order.orderNumber} as packed: ${error.message}`);
                    errors.push(`${order.orderNumber}: ${error.message}`);
                }
            }
        }

        // Route istatistiklerini güncelle - DB'den güncel sayıyı al
        const freshPackedCount = await this.routeOrderRepository.count({
            where: { routeId, isPacked: true },
        });
        await this.routeRepository.update(routeId, {
            packedOrderCount: freshPackedCount,
        });

        return { updated, errors };
    }

    /**
     * Kargo etiketleri için HTML oluştur (yazdırma için)
     */
    private generateCargoLabelsHtml(orders: any[], route: any): string {
        const labelsHtml = orders.map((order, index) => {
            const shippingAddress = order.shippingAddress || {};
            const invoiceAddress = order.invoiceAddress || {};
            const customer = order.customer || {};
            const store = order.store || {};

            const receiverName = [
                shippingAddress.firstName || customer.firstName || '',
                shippingAddress.lastName || customer.lastName || ''
            ].filter(Boolean).join(' ') || 'Alıcı';

            const receiverAddress = [
                shippingAddress.fullAddress || shippingAddress.addressDetail || shippingAddress.address || '',
                shippingAddress.neighborhood || '',
                shippingAddress.district || '',
                shippingAddress.city || '',
                'Türkiye'
            ].filter(Boolean).join(' / ');

            const senderName = store.senderCompanyName || store.brandName || 'Farmakozmetika Sağlık Ürünleri ve Kozmetik Tic. Ltd. Şti.';
            const senderAddress = store.senderAddress || 'Cihangir Mahallesi Güvercin Sokak No:4 193 Numara Avcılar İstanbul';
            const senderTaxOffice = store.senderTaxOffice || 'Avcılar';
            const senderTaxNumber = store.senderTaxNumber || store.companyCode || '3851513350';
            const senderVat = `VD: ${senderTaxOffice} VKN/TC: ${senderTaxNumber}`;

            const invoiceNumber = order.invoiceNumber || order.orderNumber || 'N/A';
            const invoiceDate = order.orderDate ? new Date(order.orderDate).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
            const packageId = order.packageId || order.orderNumber;
            const barcode = order.cargoTrackingNumber || packageId || order.orderNumber;

            const sourceMap: Record<string, string> = {
                'TRENDYOL': 'Trendyol',
                'HEPSIBURADA': 'Hepsiburada',
                'IKAS': 'IKAS',
                'MANUAL': 'Manuel'
            };
            const source = sourceMap[store.type] || store.name || 'Mağaza';
            const carrier = order.cargoProviderName || 'Aras Kargo';

            const items = (order.items || []).map((item: any, i: number) => ({
                lineNo: i + 1,
                sku: item.sku || 'N/A',
                name: item.productName || 'Ürün',
                quantity: item.quantity || 1
            }));

            return `
<div class="label-container" style="page-break-after: ${index < orders.length - 1 ? 'always' : 'auto'};">
    <div class="label" style="width: 100mm; height: 100mm; border: 1px solid #000; padding: 2mm; box-sizing: border-box; font-family: Arial, sans-serif; font-size: 10px;">
        <!-- Barcode Section -->
        <div style="text-align: center; margin-bottom: 3mm;">
            <svg class="barcode-${index}" style="width: 60mm; height: 18mm;"></svg>
        </div>
        
        <!-- Receiver and Sender -->
        <div style="display: flex; border: 1px solid #000; height: 25mm; margin-bottom: 2mm;">
            <div style="flex: 0 0 55%; border-right: 1px solid #000; padding: 2mm; font-size: 10px;">
                <b>ALICI:</b><br>
                ${this.escapeHtml(receiverName)}<br>
                ${this.escapeHtml(receiverAddress)}
            </div>
            <div style="flex: 1; padding: 2mm; font-size: 9px;">
                <b>GÖNDEREN:</b><br>
                ${this.escapeHtml(senderName)}<br>
                ${this.escapeHtml(senderAddress)}<br>
                ${this.escapeHtml(senderVat)}
            </div>
        </div>
        
        <!-- Order Details -->
        <div style="border: 1px solid #000; height: 12mm; margin-bottom: 2mm;">
            <div style="display: flex; height: 100%;">
                <div style="flex: 1; border-right: 1px solid #000; padding: 1mm; font-size: 9px;">
                    <b>FATURA NO:</b><br>${this.escapeHtml(invoiceNumber)}
                </div>
                <div style="flex: 1; border-right: 1px solid #000; padding: 1mm; font-size: 9px;">
                    <b>FATURA TARİHİ:</b><br>${invoiceDate}
                </div>
                <div style="flex: 1; border-right: 1px solid #000; padding: 1mm; font-size: 9px;">
                    <b>SİPARİŞ NO:</b><br>${this.escapeHtml(packageId)}
                </div>
                <div style="flex: 1; border-right: 1px solid #000; padding: 1mm; font-size: 9px;">
                    <b>KAYNAK</b><br>${this.escapeHtml(source)}
                </div>
                <div style="flex: 1; padding: 1mm; font-size: 9px;">
                    <b>TAŞIYICI</b><br>${this.escapeHtml(carrier)}
                </div>
            </div>
        </div>
        
        <!-- Info Notice -->
        <div style="border: 1px solid #000; padding: 1mm; font-size: 7px; margin-bottom: 2mm; height: 4mm;">
            Bilgilendirme: Firmamız E-fatura Mükellefidir. Faturanız kayıtlı e-posta adresinize gönderilmiştir.
        </div>
        
        <!-- Items Table -->
        <div style="border: 1px solid #000; padding: 1mm;">
            <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
                <tr style="border-bottom: 1px solid #000;">
                    <th style="border-right: 1px solid #000; padding: 1mm; text-align: left;">Malzeme/Hizmet Kodu (SKU)</th>
                    <th style="border-right: 1px solid #000; padding: 1mm; text-align: left;">Malzeme/Hizmet Açıklaması</th>
                    <th style="padding: 1mm; text-align: right;">Miktar</th>
                </tr>
                ${items.slice(0, 5).map((item: any) => `
                <tr style="border-bottom: 1px solid #000;">
                    <td style="border-right: 1px solid #000; padding: 1mm;">${this.escapeHtml(item.sku || 'N/A')}</td>
                    <td style="border-right: 1px solid #000; padding: 1mm;">${this.escapeHtml(item.name)}</td>
                    <td style="padding: 1mm; text-align: right;">${item.quantity}</td>
                </tr>
                `).join('')}
            </table>
        </div>
    </div>
</div>
<script>
(function() {
    JsBarcode(".barcode-${index}", "${barcode}", {width: 2, height: 50, fontSize: 16, marginTop: 3, margin: 1, fontOptions: "bold" });
})();
</script>
            `;
        }).join('\n');

        return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Kargo Etiketleri - ${route.name}</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
    <style>
        @media print {
            @page {
                size: 100mm 100mm;
                margin: 0;
            }
            body {
                margin: 0;
                padding: 0;
            }
            .label-container {
                page-break-after: always;
            }
        }
        @media screen {
            body {
                padding: 20px;
                background: #f0f0f0;
            }
            .label-container {
                margin-bottom: 20px;
                background: white;
            }
        }
    </style>
</head>
<body>
    ${labelsHtml}
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>
        `;
    }

    private escapeHtml(text: string): string {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
