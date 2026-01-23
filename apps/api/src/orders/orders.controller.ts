import { Controller, Post, Param, Get, Query, Delete, Res, Put, Body } from '@nestjs/common';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { OrderHistoryService } from './order-history.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
    constructor(
        private readonly ordersService: OrdersService,
        private readonly orderHistoryService: OrderHistoryService,
    ) { }

    @Post()
    async create(@Body() createOrderDto: CreateOrderDto) {
        return this.ordersService.create(createOrderDto);
    }

    @Post('sync/:integrationId')
    async syncOrders(@Param('integrationId') integrationId: string) {
        await this.ordersService.syncOrders(integrationId);
        return { success: true, message: 'Sync started' };
    }

    @Post('fetch-trendyol')
    async fetchTrendyolOrder(@Query('orderNumber') orderNumber: string) {
        if (!orderNumber) {
            return { success: false, message: 'Order number is required' };
        }
        return this.ordersService.fetchSingleTrendyolOrder(orderNumber);
    }

    @Post(':id/label')
    async getLabel(@Param('id') id: string) {
        return this.ordersService.fetchCargoLabel(id);
    }

    @Put(':id/trendyol-status/picking')
    async updateTrendyolPicking(@Param('id') id: string) {
        return this.ordersService.updateTrendyolPackageStatus(id, 'Picking');
    }

    @Put(':id/trendyol-status/invoiced')
    async updateTrendyolInvoiced(
        @Param('id') id: string,
        @Query('invoiceNumber') invoiceNumber: string
    ) {
        if (!invoiceNumber) {
            return { success: false, message: 'Fatura numarası gereklidir.' };
        }
        return this.ordersService.updateTrendyolPackageStatus(id, 'Invoiced', invoiceNumber);
    }

    @Put('trendyol-status/bulk')
    async bulkUpdateTrendyolStatus(
        @Body() body: {
            orderIds: string[];
            status: 'Picking' | 'Invoiced';
            invoiceNumbers?: Record<string, string>;
        }
    ) {
        const { orderIds, status, invoiceNumbers } = body;
        if (!orderIds || orderIds.length === 0) {
            return { success: false, message: 'Sipariş seçilmedi.' };
        }
        if (status !== 'Picking' && status !== 'Invoiced') {
            return { success: false, message: 'Geçersiz durum.' };
        }
        return this.ordersService.bulkUpdateTrendyolStatus(orderIds, status, invoiceNumbers);
    }

    @Get()
    async findAll(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('orderNumber') orderNumber?: string,
        @Query('packageId') packageId?: string,
        @Query('integrationId') integrationId?: string,
        @Query('storeId') storeId?: string,
        @Query('status') status?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('customerName') customerName?: string,
        @Query('micro') micro?: string,
        @Query('startDeliveryDate') startDeliveryDate?: string,
        @Query('endDeliveryDate') endDeliveryDate?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    ) {
        const filters = {
            orderNumber,
            packageId,
            integrationId,
            storeId,
            status,
            startDate,
            endDate,
            customerName,
            micro: micro === 'true' ? true : micro === 'false' ? false : undefined,
            startDeliveryDate,
            endDeliveryDate,
            sortBy,
            sortOrder,
        };
        const { data, total } = await this.ordersService.findAll(Number(page), Number(limit), filters);
        return {
            success: true,
            data,
            meta: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            }
        };
    }

    @Get('faulty')
    async findFaultyOrders(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
        @Query('barcode') barcode?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('customerName') customerName?: string,
        @Query('orderNumber') orderNumber?: string,
    ) {
        return this.ordersService.findFaultyOrders(Number(page), Number(limit), {
            barcode,
            startDate,
            endDate,
            customerName,
            orderNumber
        });
    }

    @Delete('faulty/:id')
    async deleteFaultyOrder(@Param('id') id: string) {
        await this.ordersService.deleteFaultyOrder(id);
        return { success: true };
    }
    @Get('export')
    async exportOrders(
        @Res() res: Response,
        @Query('orderNumber') orderNumber?: string,
        @Query('packageId') packageId?: string,
        @Query('integrationId') integrationId?: string,
        @Query('storeId') storeId?: string,
        @Query('status') status?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('customerName') customerName?: string,
        @Query('micro') micro?: string,
        @Query('startDeliveryDate') startDeliveryDate?: string,
        @Query('endDeliveryDate') endDeliveryDate?: string,
    ) {
        const filters = {
            orderNumber,
            packageId,
            integrationId,
            storeId,
            status,
            startDate,
            endDate,
            customerName,
            micro: micro === 'true' ? true : micro === 'false' ? false : undefined,
            startDeliveryDate,
            endDeliveryDate
        };
        const buffer = await this.ordersService.exportOrders(filters);

        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=siparisler.xlsx',
            'Content-Length': buffer.length,
        });

        res.end(buffer);
    }
    @Post(':id/create-shipment')
    async createShipment(@Param('id') id: string, @Body() shipmentDetails: any) {
        return this.ordersService.createShipmentForOrder(id, shipmentDetails);
    }

    @Post(':id/cancel')
    async cancelOrder(@Param('id') id: string) {
        const result = await this.ordersService.cancelOrder(id);
        return {
            success: result.success,
            message: result.message,
            data: {
                refundInvoiceNumber: result.refundInvoiceNumber,
                cargoReverted: result.cargoReverted,
                stockReleased: result.stockReleased,
            },
        };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const order = await this.ordersService.findOne(id);
        return {
            success: true,
            data: order,
        };
    }

    @Get(':id/history')
    async getOrderHistory(@Param('id') id: string) {
        const history = await this.orderHistoryService.getOrderHistory(id);
        return {
            success: true,
            data: history,
        };
    }

    @Get(':id/timeline')
    async getOrderTimeline(@Param('id') id: string) {
        const history = await this.orderHistoryService.getOrderHistory(id);
        return {
            success: true,
            data: history,
        };
    }
}

