import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { GoodsReceiptItem } from './entities/goods-receipt-item.entity';
import { PurchaseOrderStatus } from './enums/purchase-order-status.enum';
import { GoodsReceiptStatus } from './enums/goods-receipt-status.enum';
import { ShelvesService } from '../shelves/shelves.service';

@Injectable()
export class PurchasesService {
    constructor(
        @InjectRepository(PurchaseOrder)
        private readonly poRepository: Repository<PurchaseOrder>,
        @InjectRepository(PurchaseOrderItem)
        private readonly poItemRepository: Repository<PurchaseOrderItem>,
        @InjectRepository(GoodsReceipt)
        private readonly grRepository: Repository<GoodsReceipt>,
        @InjectRepository(GoodsReceiptItem)
        private readonly grItemRepository: Repository<GoodsReceiptItem>,
        private readonly shelvesService: ShelvesService,
    ) { }

    // Generate unique order number
    private async generateOrderNumber(): Promise<string> {
        const date = new Date();
        const prefix = `PO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
        const count = await this.poRepository.count();
        return `${prefix}-${String(count + 1).padStart(5, '0')}`;
    }

    private async generateReceiptNumber(): Promise<string> {
        const date = new Date();
        const prefix = `GR-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
        const count = await this.grRepository.count();
        return `${prefix}-${String(count + 1).padStart(5, '0')}`;
    }

    // Purchase Order CRUD
    async createPurchaseOrder(data: {
        supplierId: string;
        orderDate: Date;
        expectedDate?: Date;
        notes?: string;
        items: { productId: string; orderedQuantity: number; unitPrice: number }[];
    }): Promise<PurchaseOrder> {
        const orderNumber = await this.generateOrderNumber();
        const totalAmount = data.items.reduce((sum, item) => sum + item.orderedQuantity * item.unitPrice, 0);

        const po = this.poRepository.create({
            orderNumber,
            supplierId: data.supplierId,
            orderDate: data.orderDate,
            expectedDate: data.expectedDate,
            notes: data.notes,
            totalAmount,
            status: PurchaseOrderStatus.ORDERED,
        });

        const savedPo = await this.poRepository.save(po);

        // Create items
        const items = data.items.map(item =>
            this.poItemRepository.create({
                purchaseOrderId: savedPo.id,
                productId: item.productId,
                orderedQuantity: item.orderedQuantity,
                unitPrice: item.unitPrice,
            })
        );

        await this.poItemRepository.save(items);

        return this.findPurchaseOrder(savedPo.id);
    }

    async findAllPurchaseOrders(page = 1, limit = 10, status?: PurchaseOrderStatus): Promise<{ data: PurchaseOrder[]; total: number }> {
        const where: any = {};
        if (status) where.status = status;

        const [data, total] = await this.poRepository.findAndCount({
            where,
            relations: ['supplier', 'items', 'items.product'],
            order: { orderDate: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return { data, total };
    }

    async findPurchaseOrder(id: string): Promise<PurchaseOrder> {
        const po = await this.poRepository.findOne({
            where: { id },
            relations: ['supplier', 'items', 'items.product', 'goodsReceipts', 'goodsReceipts.items'],
        });
        if (!po) throw new NotFoundException(`Purchase Order #${id} not found`);
        return po;
    }

    async updatePurchaseOrder(id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
        const po = await this.findPurchaseOrder(id);
        Object.assign(po, data);
        await this.poRepository.save(po);
        return this.findPurchaseOrder(id);
    }

    async deletePurchaseOrder(id: string): Promise<void> {
        const po = await this.findPurchaseOrder(id);
        if (po.status !== PurchaseOrderStatus.DRAFT) {
            throw new BadRequestException('Only DRAFT orders can be deleted');
        }
        await this.poRepository.remove(po);
    }

    // Goods Receipt
    async receiveGoods(
        purchaseOrderId: string,
        data: {
            receivedByUserId?: string;
            notes?: string;
            items: { productId: string; shelfId: string; quantity: number; unitCost: number }[];
        },
    ): Promise<GoodsReceipt> {
        const po = await this.findPurchaseOrder(purchaseOrderId);

        if (po.status === PurchaseOrderStatus.COMPLETED) {
            throw new BadRequestException('Order already completed');
        }

        const receiptNumber = await this.generateReceiptNumber();

        const gr = this.grRepository.create({
            receiptNumber,
            purchaseOrderId,
            receivedByUserId: data.receivedByUserId,
            receiptDate: new Date(),
            notes: data.notes,
            status: GoodsReceiptStatus.COMPLETED,
        });

        const savedGr = await this.grRepository.save(gr);

        // Create receipt items and update shelf stock
        for (const item of data.items) {
            const grItem = this.grItemRepository.create({
                goodsReceiptId: savedGr.id,
                productId: item.productId,
                shelfId: item.shelfId,
                quantity: item.quantity,
                unitCost: item.unitCost,
            });
            await this.grItemRepository.save(grItem);

            // Add to shelf stock
            await this.shelvesService.addStock(item.shelfId, item.productId, item.quantity);

            // Update PO item received quantity
            const poItem = po.items.find(i => i.productId === item.productId);
            if (poItem) {
                poItem.receivedQuantity += item.quantity;
                await this.poItemRepository.save(poItem);
            }
        }

        // Update PO status
        await this.updatePurchaseOrderStatus(purchaseOrderId);

        return this.findGoodsReceipt(savedGr.id);
    }

    private async updatePurchaseOrderStatus(purchaseOrderId: string): Promise<void> {
        const po = await this.findPurchaseOrder(purchaseOrderId);
        const allReceived = po.items.every(item => item.receivedQuantity >= item.orderedQuantity);
        const anyReceived = po.items.some(item => item.receivedQuantity > 0);

        if (allReceived) {
            po.status = PurchaseOrderStatus.COMPLETED;
        } else if (anyReceived) {
            po.status = PurchaseOrderStatus.PARTIAL;
        }

        await this.poRepository.save(po);
    }

    async findGoodsReceipt(id: string): Promise<GoodsReceipt> {
        const gr = await this.grRepository.findOne({
            where: { id },
            relations: ['purchaseOrder', 'items', 'items.product', 'items.shelf', 'receivedByUser'],
        });
        if (!gr) throw new NotFoundException(`Goods Receipt #${id} not found`);
        return gr;
    }

    // Reverse goods receipt
    async reverseGoodsReceipt(id: string): Promise<GoodsReceipt> {
        const gr = await this.findGoodsReceipt(id);

        if (gr.status === GoodsReceiptStatus.REVERSED) {
            throw new BadRequestException('Already reversed');
        }

        // Remove stock from shelves
        for (const item of gr.items) {
            if (item.shelfId) {
                await this.shelvesService.removeStock(item.shelfId, item.productId, item.quantity);
            }

            // Update PO item received quantity
            const poItem = await this.poItemRepository.findOne({
                where: { purchaseOrderId: gr.purchaseOrderId, productId: item.productId },
            });
            if (poItem) {
                poItem.receivedQuantity = Math.max(0, poItem.receivedQuantity - item.quantity);
                await this.poItemRepository.save(poItem);
            }
        }

        gr.status = GoodsReceiptStatus.REVERSED;
        await this.grRepository.save(gr);

        // Update PO status
        await this.updatePurchaseOrderStatus(gr.purchaseOrderId);

        return gr;
    }
}
