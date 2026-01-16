import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Route } from '../routes/entities/route.entity';
import { RouteOrder } from '../routes/entities/route-order.entity';
import { RouteStatus } from '../routes/enums/route-status.enum';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ShelfStock } from '../shelves/entities/shelf-stock.entity';

export interface PickingItem {
    barcode: string;
    productName: string;
    productColor?: string;
    productSize?: string;
    shelfLocation?: string;
    shelfPath?: string;
    totalQuantity: number;
    pickedQuantity: number;
    isComplete: boolean;
    orders: {
        orderId: string;
        orderNumber: string;
        quantity: number;
    }[];
}

export interface PickingProgress {
    routeId: string;
    routeName: string;
    status: RouteStatus;
    totalItems: number;
    pickedItems: number;
    totalOrders: number;
    items: PickingItem[];
    isComplete: boolean;
}

@Injectable()
export class PickingService {
    private readonly logger = new Logger(PickingService.name);

    // In-memory store for picking progress (could be Redis in production)
    private pickingProgress = new Map<string, Map<string, number>>();

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
        @InjectRepository(ShelfStock)
        private readonly shelfStockRepository: Repository<ShelfStock>,
    ) { }

    async getPickingProgress(routeId: string): Promise<PickingProgress> {
        const route = await this.routeRepository.findOne({
            where: { id: routeId },
        });

        if (!route) {
            throw new NotFoundException('Route not found');
        }

        // Get all orders in route with items
        const routeOrders = await this.routeOrderRepository.find({
            where: { routeId },
            relations: ['order', 'order.items'],
            order: { sequence: 'ASC' },
        });

        // Aggregate items by barcode
        const itemMap = new Map<string, PickingItem>();

        for (const ro of routeOrders) {
            if (!ro.order?.items) continue;

            for (const item of ro.order.items) {
                if (!item.barcode) continue;

                if (!itemMap.has(item.barcode)) {
                    itemMap.set(item.barcode, {
                        barcode: item.barcode,
                        productName: item.productName || 'Bilinmeyen Ürün',
                        productColor: item.productColor || undefined,
                        productSize: item.productSize || undefined,
                        totalQuantity: 0,
                        pickedQuantity: 0,
                        isComplete: false,
                        orders: [],
                    });
                }

                const pickingItem = itemMap.get(item.barcode)!;
                pickingItem.totalQuantity += item.quantity || 1;
                pickingItem.orders.push({
                    orderId: ro.orderId,
                    orderNumber: ro.order.orderNumber,
                    quantity: item.quantity || 1,
                });
            }
        }

        // Fetch shelf locations for all items
        const barcodes = Array.from(itemMap.keys());
        if (barcodes.length > 0) {
            // Find products by barcode first to get IDs
            const products = await this.productRepository.find({
                where: [
                    { barcode: In(barcodes) },
                    // We might need to handle variants if barcode is on variant level
                ],
                select: ['id', 'barcode', 'name']
            });

            const productMap = new Map(products.map(p => [p.barcode, p]));
            const productIds = products.map(p => p.id);

            if (productIds.length > 0) {
                // Find shelf stocks for these products
                const shelfStocks = await this.shelfStockRepository.find({
                    where: { productId: In(productIds) },
                    relations: [
                        'shelf',
                        'shelf.parent',
                        'shelf.parent.parent',
                        'shelf.parent.parent.parent',
                        'shelf.parent.parent.parent.parent'
                    ],
                });

                // Map product ID to shelf location (taking the one with most stock or first found)
                const productShelfMap = new Map<string, string>();

                // Group stocks by product
                const stocksByProduct = new Map<string, typeof shelfStocks>();
                for (const stock of shelfStocks) {
                    if (!stocksByProduct.has(stock.productId)) {
                        stocksByProduct.set(stock.productId, []);
                    }
                    stocksByProduct.get(stock.productId)?.push(stock);
                }

                // Determine best shelf for each product
                for (const [productId, stocks] of stocksByProduct) {
                    // Sort by quantity desc to pick shelf with most stock
                    stocks.sort((a, b) => b.quantity - a.quantity);
                    if (stocks.length > 0 && stocks[0].shelf) {
                        const shelf = stocks[0].shelf;

                        // Build full path: Root > Child > Leaf
                        const parts: string[] = [];
                        let current: any = shelf;
                        while (current) {
                            parts.unshift(current.name);
                            current = current.parent;
                        }

                        productShelfMap.set(productId, parts.join(' > '));
                    }
                }

                // Update items with shelf info
                for (const [barcode, item] of itemMap) {
                    const product = productMap.get(barcode);
                    if (product) {
                        const shelfLoc = productShelfMap.get(product.id);
                        if (shelfLoc) {
                            item.shelfLocation = shelfLoc;
                        }
                    }
                }
            }
        }

        // Apply picked quantities from in-memory store
        const routePickedItems = this.pickingProgress.get(routeId) || new Map();
        for (const [barcode, pickedQty] of routePickedItems) {
            const item = itemMap.get(barcode);
            if (item) {
                item.pickedQuantity = pickedQty;
                item.isComplete = item.pickedQuantity >= item.totalQuantity;
            }
        }

        const items = Array.from(itemMap.values());
        const totalItems = items.reduce((sum, i) => sum + i.totalQuantity, 0);
        const pickedItems = items.reduce((sum, i) => sum + Math.min(i.pickedQuantity, i.totalQuantity), 0);
        const isComplete = pickedItems >= totalItems;

        return {
            routeId,
            routeName: route.name,
            status: route.status,
            totalItems,
            pickedItems,
            totalOrders: routeOrders.length,
            items,
            isComplete,
        };
    }

    async scanBarcode(routeId: string, barcode: string, quantity: number = 1): Promise<{
        success: boolean;
        message: string;
        item?: PickingItem;
        progress?: PickingProgress;
    }> {
        const route = await this.routeRepository.findOne({
            where: { id: routeId },
        });

        if (!route) {
            throw new NotFoundException('Route not found');
        }

        if (route.status !== RouteStatus.COLLECTING) {
            throw new BadRequestException('Route is not in collecting status');
        }

        // Check if barcode exists in route
        const progress = await this.getPickingProgress(routeId);
        const item = progress.items.find(i => i.barcode === barcode);

        if (!item) {
            return {
                success: false,
                message: `Barkod bu rotada bulunamadı: ${barcode}`,
            };
        }

        if (item.isComplete) {
            return {
                success: false,
                message: `Bu ürün zaten tamamlandı: ${item.productName}`,
                item,
            };
        }

        // Update picked quantity
        if (!this.pickingProgress.has(routeId)) {
            this.pickingProgress.set(routeId, new Map());
        }
        const routePickedItems = this.pickingProgress.get(routeId)!;
        const currentQty = routePickedItems.get(barcode) || 0;

        const newQty = Math.min(currentQty + quantity, item.totalQuantity);
        if (newQty === currentQty && quantity > 0) {
            return {
                success: false,
                message: `Daha fazla ürün toplanamaz. (İstenen: ${currentQty + quantity}, Toplam: ${item.totalQuantity})`,
                item,
            };
        }

        routePickedItems.set(barcode, newQty);

        // Get updated progress
        const updatedProgress = await this.getPickingProgress(routeId);
        const updatedItem = updatedProgress.items.find(i => i.barcode === barcode)!;

        // Check if all items complete - update route status
        if (updatedProgress.isComplete) {
            await this.routeRepository.update(routeId, {
                status: RouteStatus.READY,
                pickedItemCount: updatedProgress.pickedItems,
            });
            updatedProgress.status = RouteStatus.READY;
        } else {
            // Just update picked count
            await this.routeRepository.update(routeId, {
                pickedItemCount: updatedProgress.pickedItems,
            });
        }

        return {
            success: true,
            message: updatedItem.isComplete
                ? `✓ ${updatedItem.productName} tamamlandı!`
                : `${updatedItem.productName} (${updatedItem.pickedQuantity}/${updatedItem.totalQuantity})`,
            item: updatedItem,
            progress: updatedProgress,
        };
    }

    async bulkScan(routeId: string, barcodes: string[]): Promise<{
        success: boolean;
        message: string;
        scanned: number;
        failed: string[];
        progress: PickingProgress;
    }> {
        const route = await this.routeRepository.findOne({
            where: { id: routeId },
        });

        if (!route) {
            throw new NotFoundException('Route not found');
        }

        if (route.status !== RouteStatus.COLLECTING) {
            throw new BadRequestException('Route is not in collecting status');
        }

        let scanned = 0;
        const failed: string[] = [];

        for (const barcode of barcodes) {
            const result = await this.scanBarcode(routeId, barcode);
            if (result.success) {
                scanned++;
            } else {
                failed.push(barcode);
            }
        }

        const progress = await this.getPickingProgress(routeId);

        return {
            success: scanned > 0,
            message: `${scanned} ürün okutuldu${failed.length > 0 ? `, ${failed.length} başarısız` : ''}`,
            scanned,
            failed,
            progress,
        };
    }

    async completePickingManually(routeId: string): Promise<void> {
        const route = await this.routeRepository.findOne({
            where: { id: routeId },
        });

        if (!route) {
            throw new NotFoundException('Route not found');
        }

        const progress = await this.getPickingProgress(routeId);

        await this.routeRepository.update(routeId, {
            status: RouteStatus.READY,
            pickedItemCount: progress.totalItems,
        });

        // Mark all items as picked in memory
        const routePickedItems = new Map<string, number>();
        for (const item of progress.items) {
            routePickedItems.set(item.barcode, item.totalQuantity);
        }
        this.pickingProgress.set(routeId, routePickedItems);
    }

    async resetPicking(routeId: string): Promise<void> {
        const route = await this.routeRepository.findOne({
            where: { id: routeId },
        });

        if (!route) {
            throw new NotFoundException('Route not found');
        }

        // Clear picked items
        this.pickingProgress.delete(routeId);

        // Reset route status if needed
        if (route.status === RouteStatus.READY) {
            await this.routeRepository.update(routeId, {
                status: RouteStatus.COLLECTING,
                pickedItemCount: 0,
            });
        }
    }
}
