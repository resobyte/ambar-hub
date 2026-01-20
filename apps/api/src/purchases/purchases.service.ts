import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between, FindOperator } from 'typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { GoodsReceiptItem } from './entities/goods-receipt-item.entity';
import { PurchaseOrderStatus } from './enums/purchase-order-status.enum';
import { PurchaseOrderType } from './enums/purchase-order-type.enum';
import { GoodsReceiptStatus } from './enums/goods-receipt-status.enum';
import { ShelvesService } from '../shelves/shelves.service';
import { InvoicesService } from '../invoices/invoices.service';
import { Product } from '../products/entities/product.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { ConsumablesService } from '../consumables/consumables.service';

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
        private readonly invoicesService: InvoicesService,
        @InjectRepository(Supplier)
        private readonly supplierRepository: Repository<Supplier>, // We'll need to inject Supplier Repo effectively, or use SupplierService. For now, assuming direct repo access is fine if module imports it, or we need to add SupplierModule. Let's check imports.
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        private readonly consumablesService: ConsumablesService,
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

    async importInvoice(docNo: string) {
        // Pre-check if invoice already exists
        const existingPo = await this.poRepository.findOne({ where: { invoiceNumber: docNo } });
        if (existingPo) {
            throw new BadRequestException(`Fatura numarası (${docNo}) zaten sistemde mevcut!`);
        }

        // 1. Fetch from Uyumsoft
        const invoice = await this.invoicesService.getInvoiceFromUyumsoft(docNo);

        // 2. Identify Supplier
        // Normalized invoice object has `taxNumber` and `supplierName`

        let supplier: Supplier | null = null;
        let supplierTaxId = invoice.taxNumber;

        if (supplierTaxId) {
            supplier = await this.supplierRepository.findOne({ where: { taxNumber: supplierTaxId } });
        }

        // If not found by VKN/TCKN, try Name
        if (!supplier && invoice.supplierName) {
            supplier = await this.supplierRepository.findOne({ where: { name: ILike(invoice.supplierName) } });
        }

        // If still not found, CREATE NEW SUPPLIER
        if (!supplier && invoice.supplierName) {
            const newSupplier = this.supplierRepository.create({
                name: invoice.supplierName,
                taxNumber: invoice.taxNumber,
                address: invoice.supplierAddress,
                isActive: true,
            });
            supplier = await this.supplierRepository.save(newSupplier);
        }

        // 3. Map Items
        // Invoice items are already normalized in invoice.items
        const mappedItems = [];

        for (const line of invoice.items) {
            // Find product by Barcode (line.barcode) or Code (line.itemCode)
            const code = (line.productCode || line.itemCode || '').trim();
            const barcode = (line.barcode || '').trim();

            let product: Product | null = null;

            // 1. Try matching 'barcode' field against DB barcode AND sku
            if (barcode) {
                product = await this.productRepository.findOne({ where: { barcode: ILike(barcode) } });

                // If not found as barcode, maybe it is a SKU?
                if (!product) {
                    product = await this.productRepository.findOne({ where: { sku: ILike(barcode) } });
                }
            }

            // 2. Try matching 'code' field against DB barcode AND sku
            if (!product && code) {
                product = await this.productRepository.findOne({ where: [{ barcode: ILike(code) }, { sku: ILike(code) }] });
            }

            mappedItems.push({
                productId: product?.id || '',
                productCode: code,
                productName: line.name,
                orderedQuantity: line.quantity || 0,
                unitPrice: line.unitPrice || 0,
                barcode: product?.barcode || barcode || '',
            });
        }


        return {
            invoiceNumber: invoice.docNo || docNo,

            orderDate: invoice.date || invoice.docDate,
            supplierId: supplier?.id || '',
            supplierName: supplier?.name || invoice.supplierName || '',
            items: mappedItems
        };
    }

    // Purchase Order CRUD
    async createPurchaseOrder(data: {
        supplierId: string;
        orderDate: Date;
        expectedDate?: Date;
        notes?: string;
        type?: PurchaseOrderType;
        invoiceNumber?: string;

        items: { productId?: string; consumableId?: string; orderedQuantity: number; unitPrice: number }[];
    }): Promise<PurchaseOrder> {
        // Validation: If INVOICE type, check duplicates
        if (data.type === PurchaseOrderType.INVOICE && data.invoiceNumber) {
            const existing = await this.poRepository.findOne({ where: { invoiceNumber: data.invoiceNumber } });
            if (existing) {
                throw new BadRequestException(`Fatura numarası (${data.invoiceNumber}) zaten sistemde mevcut!`);
            }
        }

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
            type: data.type || PurchaseOrderType.MANUAL,
            invoiceNumber: data.invoiceNumber || '',

        });

        const savedPo = await this.poRepository.save(po);

        // Create items
        const items = data.items.map(item =>
            this.poItemRepository.create({
                purchaseOrderId: savedPo.id,
                productId: item.productId,
                consumableId: item.consumableId,
                orderedQuantity: item.orderedQuantity,
                unitPrice: item.unitPrice,
            })
        );

        await this.poItemRepository.save(items);

        return this.findPurchaseOrder(savedPo.id);
    }

    async findAllPurchaseOrders(
        page = 1,
        limit = 10,
        status?: PurchaseOrderStatus,
        search?: string,
        supplierId?: string,
        startDate?: string,
        endDate?: string,
    ): Promise<{ data: PurchaseOrder[]; total: number }> {
        const where: any = {};

        if (status) where.status = status;
        if (supplierId) where.supplierId = supplierId;

        if (search) {
            where.orderNumber = ILike(`%${search}%`);
            // Note: If we want to search notes OR orderNumber, we'd need an array of where objects (OR condition), 
            // but combining with other AND filters (status, supplierId) is tricky in simple TypeORM syntax without QueryBuilder.
            // For simplicity, let's search orderNumber. If user wants notes search, we might need QueryBuilder.
            // Let's stick to orderNumber for now as it's the primary ID.
        }

        if (startDate && endDate) {
            where.orderDate = Between(new Date(startDate), new Date(endDate));
        }

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
            relations: ['supplier', 'items', 'items.product', 'items.consumable', 'goodsReceipts', 'goodsReceipts.items', 'goodsReceipts.items.product', 'goodsReceipts.items.consumable', 'goodsReceipts.items.shelf'],
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
            items: { productId?: string; consumableId?: string; shelfId: string; quantity: number; unitCost: number }[];
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
                consumableId: item.consumableId,
                shelfId: item.shelfId,
                quantity: item.quantity,
                unitCost: item.unitCost,
            });
            await this.grItemRepository.save(grItem);

            // Add to shelf stock
            if (item.productId) {
                await this.shelvesService.addStock(item.shelfId, item.productId, item.quantity);
            } else if (item.consumableId) {
                await this.shelvesService.addConsumableStock(item.shelfId, item.consumableId, item.quantity);
                // Also update weighted average cost/stock in ConsumablesService
                await this.consumablesService.addStockWithCost(item.consumableId, item.quantity, item.unitCost);
            }

            // Update PO item received quantity
            const poItem = po.items.find(i =>
                (item.productId && i.productId === item.productId) ||
                (item.consumableId && i.consumableId === item.consumableId)
            );
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
        } else {
            po.status = PurchaseOrderStatus.ORDERED;
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
        // Remove stock from shelves
        for (const item of gr.items) {
            if (item.shelfId) {
                if (item.productId) {
                    await this.shelvesService.removeStock(item.shelfId, item.productId, item.quantity);
                } else if (item.consumableId) {
                    // For reverse, we might want to just reduce stock, but WAC calculation is tricky on reverse.
                    // For now, let's just reverse shelf stock. Updating average cost on reverse is complex and often skipped or simplified.
                    await this.shelvesService.removeConsumableStock(item.shelfId, item.consumableId, item.quantity);
                }
            }

            // Update PO item received quantity
            let poItem: PurchaseOrderItem | null = null;
            if (item.productId) {
                poItem = await this.poItemRepository.findOne({
                    where: { purchaseOrderId: gr.purchaseOrderId, productId: item.productId },
                });
            } else if (item.consumableId) {
                poItem = await this.poItemRepository.findOne({
                    where: { purchaseOrderId: gr.purchaseOrderId, consumableId: item.consumableId },
                });
            }

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
