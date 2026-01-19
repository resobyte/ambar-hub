import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Route } from './entities/route.entity';
import { RouteOrder } from './entities/route-order.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { RouteStatus } from './enums/route-status.enum';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { CreateRouteDto } from './dto/create-route.dto';
import { RouteFilterDto } from './dto/route-filter.dto';
import { RouteResponseDto } from './dto/route-response.dto';

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
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        @InjectRepository(OrderItem)
        private readonly orderItemRepository: Repository<OrderItem>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) { }

    async create(dto: CreateRouteDto): Promise<RouteResponseDto> {
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

        // Calculate totals
        let totalItemCount = 0;
        for (const order of orders) {
            if (order.items) {
                totalItemCount += order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
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
            pickedItemCount: 0,
            packedOrderCount: 0,
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

        // Update order statuses to PICKING
        await this.orderRepository.update(
            { id: In(dto.orderIds) },
            { status: OrderStatus.PICKING }
        );

        return this.findOne(savedRoute.id);
    }

    async findAll(status?: RouteStatus[]): Promise<RouteResponseDto[]> {
        const queryBuilder = this.routeRepository
            .createQueryBuilder('route')
            .leftJoinAndSelect('route.orders', 'orders')
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
            relations: ['orders', 'orders.items', 'orders.store', 'orders.customer'],
        });

        if (!route) {
            throw new NotFoundException(`Route ${id} not found`);
        }

        return RouteResponseDto.fromEntity(route);
    }

    async getFilteredOrders(filter: RouteFilterDto): Promise<any[]> {
        // Get orders that are ready for picking (PICKING status, not in active route)
        const queryBuilder = this.orderRepository
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.store', 'store')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('order.customer', 'customer')
            .where('order.status IN (:...validStatuses)', {
                validStatuses: [OrderStatus.CREATED, OrderStatus.PICKING],
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

        return filteredOrders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            packageId: order.packageId,
            status: order.status,
            totalPrice: order.totalPrice,
            orderDate: order.orderDate,
            agreedDeliveryDate: order.agreedDeliveryDate,
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
            throw new BadRequestException('Cannot delete a completed route');
        }

        // Get order IDs to reset their status
        const orderIds = route.routeOrders?.map(ro => ro.orderId) || [];

        // Delete route orders
        await this.routeOrderRepository.delete({ routeId: id });

        // Mark route as cancelled
        route.status = RouteStatus.CANCELLED;
        route.isActive = false;
        await this.routeRepository.save(route);

        // Reset order statuses back to PICKING or CREATED
        if (orderIds.length > 0) {
            await this.orderRepository.update(
                { id: In(orderIds) },
                { status: OrderStatus.PICKING }
            );
        }
    }

    async updateLabelPrinted(id: string): Promise<void> {
        await this.routeRepository.update(id, {
            labelPrintedAt: new Date(),
        });
    }
}
