import { Controller, Post, Param, Get, Query, Delete, Res } from '@nestjs/common';
import { Response } from 'express';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

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
}

