import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Route } from '../routes/entities/route.entity';
import { RouteOrder } from '../routes/entities/route-order.entity';
import { RouteStatus } from '../routes/enums/route-status.enum';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { Product } from '../products/entities/product.entity';
import { ShelfStock } from '../shelves/entities/shelf-stock.entity';
import { Shelf } from '../shelves/entities/shelf.entity';
import { OrderHistoryService } from '../orders/order-history.service';
import { OrderHistoryAction } from '../orders/entities/order-history.entity';
import { ShelvesService } from '../shelves/shelves.service';
import { MovementType } from '../shelves/entities/shelf-stock-movement.entity';

export interface PickingItem {
    barcode: string;
    productName: string;
    productColor?: string;
    productSize?: string;
    shelfId?: string;
    shelfBarcode?: string;
    shelfLocation?: string;
    shelfPath?: string;
    shelfGlobalSlot?: number;
    totalQuantity: number;
    pickedQuantity: number;
    isComplete: boolean;
    orders: {
        orderId: string;
        orderNumber: string;
        quantity: number;
    }[];
}

export interface CurrentPickingState {
    currentShelfId?: string;
    currentShelfBarcode?: string;
    shelfValidated: boolean;
}

export interface ProductNeedingTransfer {
    barcode: string;
    productName: string;
    requiredQuantity: number;
    availableInNonSellable: number;
    sourceShelfIds?: string[];
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
    productsNeedingTransfer?: ProductNeedingTransfer[];
}

@Injectable()
export class PickingService {
    private readonly logger = new Logger(PickingService.name);

    // In-memory store for picking progress (could be Redis in production)
    private pickingProgress = new Map<string, Map<string, number>>();

    // In-memory store for current picking state per route (validated shelf, etc.)
    private pickingState = new Map<string, CurrentPickingState>();

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
        @InjectRepository(Shelf)
        private readonly shelfRepository: Repository<Shelf>,
        @Inject(forwardRef(() => OrderHistoryService))
        private readonly orderHistoryService: OrderHistoryService,
        private readonly shelvesService: ShelvesService,
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
                const itemQty = item.quantity || 1;
                pickingItem.totalQuantity += itemQty;

                // Check if this order already has this product (merge quantities)
                const existingOrderEntry = pickingItem.orders.find(o => o.orderId === ro.orderId);
                if (existingOrderEntry) {
                    existingOrderEntry.quantity += itemQty;
                } else {
                    pickingItem.orders.push({
                        orderId: ro.orderId,
                        orderNumber: ro.order.orderNumber,
                        quantity: itemQty,
                    });
                }
            }
        }

        // Fetch shelf locations for all items
        const barcodes = Array.from(itemMap.keys());
        let productMap = new Map<string, any>();
        let productIds: string[] = [];
        let nonSellableStocks: any[] = [];
        
        if (barcodes.length > 0) {
            // Find products by barcode first to get IDs
            const products = await this.productRepository.find({
                where: [
                    { barcode: In(barcodes) },
                    // We might need to handle variants if barcode is on variant level
                ],
                select: ['id', 'barcode', 'name']
            });

            productMap = new Map(products.map(p => [p.barcode, p]));
            productIds = products.map(p => p.id);

            if (productIds.length > 0) {
                // Find shelf stocks for these products - ONLY from pickable shelves
                const shelfStocks = await this.shelfStockRepository
                    .createQueryBuilder('ss')
                    .innerJoinAndSelect('ss.shelf', 'shelf')
                    .leftJoinAndSelect('shelf.parent', 'parent1')
                    .leftJoinAndSelect('parent1.parent', 'parent2')
                    .leftJoinAndSelect('parent2.parent', 'parent3')
                    .leftJoinAndSelect('parent3.parent', 'parent4')
                    .where('ss.productId IN (:...productIds)', { productIds })
                    .andWhere('ss.quantity > 0')
                    .andWhere('shelf.isPickable = :isPickable', { isPickable: true })
                    .getMany();

                // Also check for stocks in NON-sellable shelves to identify products needing transfer
                nonSellableStocks = await this.shelfStockRepository
                    .createQueryBuilder('ss')
                    .innerJoinAndSelect('ss.shelf', 'shelf')
                    .where('ss.productId IN (:...productIds)', { productIds })
                    .andWhere('ss.quantity > 0')
                    .andWhere('shelf.isSellable = :isSellable', { isSellable: false })
                    .select(['ss.productId', 'ss.quantity', 'ss.shelfId', 'shelf.name'])
                    .getMany();

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

                // Determine best shelf for each product (only from sellable shelves)
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
                const productShelfIdMap = new Map<string, string>();
                const productShelfBarcodeMap = new Map<string, string>();
                const productShelfNameMap = new Map<string, string>(); // Just the shelf name (e.g., "A9-2-1")
                const productShelfGlobalSlotMap = new Map<string, number>(); // Global slot for sorting

                for (const [productId, stocks] of stocksByProduct) {
                    if (stocks.length > 0 && stocks[0].shelf) {
                        productShelfIdMap.set(productId, stocks[0].shelfId);
                        productShelfBarcodeMap.set(productId, stocks[0].shelf.barcode);
                        productShelfNameMap.set(productId, stocks[0].shelf.name);
                        if (stocks[0].shelf.globalSlot) {
                            productShelfGlobalSlotMap.set(productId, stocks[0].shelf.globalSlot);
                        }
                    }
                }

                for (const [barcode, item] of itemMap) {
                    const product = productMap.get(barcode);
                    if (product) {
                        const shelfLoc = productShelfMap.get(product.id);
                        if (shelfLoc) {
                            item.shelfLocation = shelfLoc;
                            item.shelfPath = productShelfNameMap.get(product.id); // Just the leaf shelf name
                            item.shelfId = productShelfIdMap.get(product.id);
                            item.shelfBarcode = productShelfBarcodeMap.get(product.id);
                            item.shelfGlobalSlot = productShelfGlobalSlotMap.get(product.id);
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

        // Convert to array and sort for optimal picking
        // 1. Incomplete items first
        // 2. Sort by globalSlot ASC (smallest first)
        // 3. Items without globalSlot go to the end
        // 4. Complete items at the very end
        const items = Array.from(itemMap.values()).sort((a, b) => {
            // Complete items go to the end
            if (a.isComplete !== b.isComplete) {
                return a.isComplete ? 1 : -1;
            }

            // Sort by globalSlot ASC (smaller slot first)
            const aSlot = a.shelfGlobalSlot ?? Infinity;
            const bSlot = b.shelfGlobalSlot ?? Infinity;

            // Items without globalSlot go to the end (among incomplete)
            if (aSlot === Infinity && bSlot !== Infinity) return 1;
            if (aSlot !== Infinity && bSlot === Infinity) return -1;

            // Both have globalSlot - sort ASC (smaller first)
            if (aSlot !== bSlot) {
                return aSlot - bSlot; // ASC
            }

            // Same globalSlot - sort by product name
            return (a.productName || '').localeCompare(b.productName || '', 'tr');
        });

        const totalItems = items.reduce((sum, i) => sum + i.totalQuantity, 0);
        const pickedItems = items.reduce((sum, i) => sum + Math.min(i.pickedQuantity, i.totalQuantity), 0);
        const isComplete = pickedItems >= totalItems;

        // Check for products needing transfer (products not in sellable/pickable shelves)
        const productsNeedingTransfer: ProductNeedingTransfer[] = [];
        
        // Re-query non-sellable stocks if needed (outside the if block scope)
        if (productIds.length > 0 && nonSellableStocks && nonSellableStocks.length > 0) {
            for (const [barcode, item] of itemMap) {
                // If product has no shelf location, check if it exists in non-sellable shelves
                if (!item.shelfLocation) {
                    const product = Array.from(productMap.values()).find(p => p.barcode === barcode);
                    if (product && productIds.includes(product.id)) {
                        // Check if this product exists in non-sellable shelves
                        const nonSellableStock = nonSellableStocks.filter((s: any) => s.productId === product.id);
                        if (nonSellableStock && nonSellableStock.length > 0) {
                            const totalAvailable = nonSellableStock.reduce((sum: number, s: any) => sum + s.quantity, 0);
                            productsNeedingTransfer.push({
                                barcode,
                                productName: item.productName,
                                requiredQuantity: item.totalQuantity,
                                availableInNonSellable: totalAvailable,
                                sourceShelfIds: nonSellableStock.map((s: any) => s.shelfId),
                            });
                        }
                    }
                }
            }
        }

        return {
            routeId,
            routeName: route.name,
            status: route.status,
            totalItems,
            pickedItems,
            totalOrders: routeOrders.length,
            items,
            isComplete,
            productsNeedingTransfer: productsNeedingTransfer.length > 0 ? productsNeedingTransfer : undefined,
        };
    }

    async scanBarcode(routeId: string, barcode: string, quantity: number = 1, userId?: string): Promise<{
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
        const remainingQty = item.totalQuantity - currentQty;

        // Check if requested quantity exceeds remaining
        if (quantity > remainingQty) {
            return {
                success: false,
                message: `Fazla adet girdiniz! Kalan: ${remainingQty}, Girilen: ${quantity}`,
                item,
            };
        }

        const newQty = currentQty + quantity;
        routePickedItems.set(barcode, newQty);

        // Transfer stock from source shelf to picking pool
        const product = await this.productRepository.findOne({
            where: { barcode },
        });

        if (!product) {
            this.logger.warn(`Product not found for barcode: ${barcode}`);
        } else {
            const pickingShelf = await this.shelvesService.getPickingShelf();
            
            if (!pickingShelf) {
                this.logger.warn(`No picking shelf found in system`);
            } else {
                if (item.shelfId) {
                    const sourceShelf = await this.shelfRepository.findOne({
                        where: { id: item.shelfId },
                    });

                    if (sourceShelf) {
                        try {
                            await this.shelvesService.transferWithHistory(
                                item.shelfId,
                                pickingShelf.id,
                                product.id,
                                quantity,
                                {
                                    type: MovementType.PICKING,
                                    routeId,
                                    userId,
                                }
                            );
                            this.logger.log(`Transferred ${quantity} of ${barcode} from shelf ${sourceShelf.barcode} to picking pool`);
                        } catch (error) {
                            this.logger.warn(`Failed to transfer stock for ${barcode}: ${error.message}`);
                        }
                    }
                } else {
                    this.logger.warn(`No source shelf found for product ${barcode} - searching for any stock...`);
                    const anyStock = await this.shelfStockRepository.findOne({
                        where: { productId: product.id },
                        relations: ['shelf'],
                        order: { quantity: 'DESC' },
                    });
                    
                    if (anyStock && anyStock.quantity >= quantity) {
                        try {
                            await this.shelvesService.transferWithHistory(
                                anyStock.shelfId,
                                pickingShelf.id,
                                product.id,
                                quantity,
                                {
                                    type: MovementType.PICKING,
                                    routeId,
                                    userId,
                                }
                            );
                            this.logger.log(`Transferred ${quantity} of ${barcode} from shelf ${anyStock.shelf?.barcode || anyStock.shelfId} to picking pool (fallback)`);
                        } catch (error) {
                            this.logger.warn(`Failed to transfer stock for ${barcode} (fallback): ${error.message}`);
                        }
                    } else {
                        this.logger.warn(`No stock found for product ${barcode} to transfer to picking pool`);
                    }
                }
            }
        }

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

            // Log picking completed for all orders in route
            await this.logPickingCompleted(routeId);
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

        // Clear picked items and state
        this.pickingProgress.delete(routeId);
        this.pickingState.delete(routeId);

        // Reset route status if needed
        if (route.status === RouteStatus.READY) {
            await this.routeRepository.update(routeId, {
                status: RouteStatus.COLLECTING,
                pickedItemCount: 0,
            });
        }
    }

    async getNextPickingItem(routeId: string): Promise<{
        item: PickingItem | null;
        state: CurrentPickingState;
        isComplete: boolean;
    }> {
        const progress = await this.getPickingProgress(routeId);
        const state = this.pickingState.get(routeId) || { shelfValidated: false };

        // Find first incomplete item
        const nextItem = progress.items.find(item => !item.isComplete);

        return {
            item: nextItem || null,
            state,
            isComplete: progress.isComplete,
        };
    }

    async scanShelf(routeId: string, shelfBarcode: string): Promise<{
        success: boolean;
        message: string;
        expectedShelf?: string;
        scannedShelf?: string;
        nextItem?: PickingItem;
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

        const shelf = await this.shelvesService.findByBarcode(shelfBarcode);

        if (!shelf) {
            return {
                success: false,
                message: `Raf bulunamadı: ${shelfBarcode}`,
            };
        }

        // Get next item to pick
        const { item: nextItem } = await this.getNextPickingItem(routeId);

        if (!nextItem) {
            return {
                success: false,
                message: 'Tüm ürünler toplandı, toplanacak ürün kalmadı.',
            };
        }

        // Check if this is the expected shelf
        if (nextItem.shelfId && nextItem.shelfId !== shelf.id) {
            return {
                success: false,
                message: `Yanlış raf! Beklenen: ${nextItem.shelfLocation || nextItem.shelfBarcode}`,
                expectedShelf: nextItem.shelfBarcode,
                scannedShelf: shelfBarcode,
            };
        }

        // Update state - shelf validated
        this.pickingState.set(routeId, {
            currentShelfId: shelf.id,
            currentShelfBarcode: shelf.barcode,
            shelfValidated: true,
        });

        return {
            success: true,
            message: `Raf doğrulandı: ${shelf.name}. Şimdi ürünü okutun.`,
            scannedShelf: shelfBarcode,
            nextItem,
        };
    }

    async scanProductWithShelfValidation(
        routeId: string,
        productBarcode: string,
        quantity: number = 1,
        userId?: string
    ): Promise<{
        success: boolean;
        message: string;
        item?: PickingItem;
        progress?: PickingProgress;
        requiresShelfScan?: boolean;
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

        // Get current state
        const state = this.pickingState.get(routeId) || { shelfValidated: false };

        // Get progress and find the item
        const progress = await this.getPickingProgress(routeId);
        const item = progress.items.find(i => i.barcode === productBarcode);

        if (!item) {
            return {
                success: false,
                message: `Barkod bu rotada bulunamadı: ${productBarcode}`,
            };
        }

        if (item.isComplete) {
            return {
                success: false,
                message: `Bu ürün zaten tamamlandı: ${item.productName}`,
                item,
            };
        }

        // Check if shelf needs to be scanned first
        if (item.shelfId && !state.shelfValidated) {
            return {
                success: false,
                message: `Önce rafı okutun: ${item.shelfLocation || item.shelfBarcode}`,
                requiresShelfScan: true,
                item,
            };
        }

        // If shelf was validated, check it matches the item's shelf
        if (state.shelfValidated && item.shelfId && state.currentShelfId !== item.shelfId) {
            return {
                success: false,
                message: `Bu ürün farklı bir rafta. Önce doğru rafı okutun: ${item.shelfLocation}`,
                requiresShelfScan: true,
                item,
            };
        }

        // Proceed with picking - update quantity
        if (!this.pickingProgress.has(routeId)) {
            this.pickingProgress.set(routeId, new Map());
        }
        const routePickedItems = this.pickingProgress.get(routeId)!;
        const currentQty = routePickedItems.get(productBarcode) || 0;

        const newQty = Math.min(currentQty + quantity, item.totalQuantity);
        if (newQty === currentQty && quantity > 0) {
            return {
                success: false,
                message: `Daha fazla ürün toplanamaz. (İstenen: ${currentQty + quantity}, Toplam: ${item.totalQuantity})`,
                item,
            };
        }

        routePickedItems.set(productBarcode, newQty);

        // Transfer stock from source shelf to picking pool
        if (state.currentShelfId) {
            const product = await this.productRepository.findOne({
                where: { barcode: productBarcode },
            });

            if (product) {
                const sourceShelf = await this.shelfRepository.findOne({
                    where: { id: state.currentShelfId },
                });

                if (sourceShelf) {
                    const pickingShelf = await this.shelvesService.getPickingShelf();

                    if (pickingShelf) {
                        try {
                            await this.shelvesService.transferWithHistory(
                                state.currentShelfId,
                                pickingShelf.id,
                                product.id,
                                quantity,
                                {
                                    type: MovementType.PICKING,
                                    routeId,
                                    userId,
                                }
                            );
                            this.logger.log(`Transferred ${quantity} of ${productBarcode} from shelf ${state.currentShelfBarcode} to picking pool`);
                        } catch (error) {
                            this.logger.warn(`Failed to transfer stock for ${productBarcode}: ${error.message}`);
                        }
                    } else {
                        this.logger.warn(`No picking shelf found in system`);
                    }
                }
            }
        }

        // Get updated progress
        const updatedProgress = await this.getPickingProgress(routeId);
        const updatedItem = updatedProgress.items.find(i => i.barcode === productBarcode)!;

        // If this item is complete, reset shelf validation for next item
        if (updatedItem.isComplete) {
            this.pickingState.set(routeId, { shelfValidated: false });
        }

        // Check if all items complete - update route status
        if (updatedProgress.isComplete) {
            await this.routeRepository.update(routeId, {
                status: RouteStatus.READY,
                pickedItemCount: updatedProgress.pickedItems,
            });
            updatedProgress.status = RouteStatus.READY;
        } else {
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

    getPickingState(routeId: string): CurrentPickingState {
        return this.pickingState.get(routeId) || { shelfValidated: false };
    }

    private async logPickingCompleted(routeId: string, userId?: string): Promise<void> {
        try {
            const route = await this.routeRepository.findOne({
                where: { id: routeId },
            });

            const routeOrders = await this.routeOrderRepository.find({
                where: { routeId },
                relations: ['order'],
            });

            for (const ro of routeOrders) {
                // Update order status to PICKED
                const previousStatus = ro.order?.status;
                await this.orderRepository.update(ro.orderId, { status: OrderStatus.PICKED });

                await this.orderHistoryService.logEvent({
                    orderId: ro.orderId,
                    action: OrderHistoryAction.PICKING_COMPLETED,
                    userId: userId || route?.createdById,
                    routeId,
                    routeName: route?.name,
                    previousStatus,
                    newStatus: OrderStatus.PICKED,
                    description: `Sipariş toplama tamamlandı - Rota: ${route?.name}`,
                });
            }
        } catch (error) {
            this.logger.error(`Failed to log picking completed: ${error.message}`);
        }
    }
}
