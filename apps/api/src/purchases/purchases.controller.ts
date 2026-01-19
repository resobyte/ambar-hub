import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchaseOrderStatus } from './enums/purchase-order-status.enum';

@Controller('purchases')
export class PurchasesController {
    constructor(private readonly purchasesService: PurchasesService) { }

    @Post()
    createPurchaseOrder(@Body() data: any) {
        return this.purchasesService.createPurchaseOrder(data);
    }

    @Get()
    async findAllPurchaseOrders(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('status') status?: PurchaseOrderStatus,
        @Query('search') search?: string,
        @Query('supplierId') supplierId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const { data, total } = await this.purchasesService.findAllPurchaseOrders(
            Number(page),
            Number(limit),
            status,
            search,
            supplierId,
            startDate,
            endDate,
        );
        return {
            success: true,
            data,
            meta: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        };
    }

    @Get(':id')
    findPurchaseOrder(@Param('id') id: string) {
        return this.purchasesService.findPurchaseOrder(id);
    }

    @Patch(':id')
    updatePurchaseOrder(@Param('id') id: string, @Body() data: any) {
        return this.purchasesService.updatePurchaseOrder(id, data);
    }

    @Delete(':id')
    deletePurchaseOrder(@Param('id') id: string) {
        return this.purchasesService.deletePurchaseOrder(id);
    }

    // Goods Receipt
    @Post(':id/receive')
    receiveGoods(@Param('id') purchaseOrderId: string, @Body() data: any) {
        return this.purchasesService.receiveGoods(purchaseOrderId, data);
    }

    @Get('receipts/:id')
    findGoodsReceipt(@Param('id') id: string) {
        return this.purchasesService.findGoodsReceipt(id);
    }

    @Post('receipts/:id/reverse')
    reverseGoodsReceipt(@Param('id') id: string) {
        return this.purchasesService.reverseGoodsReceipt(id);
    }
}
