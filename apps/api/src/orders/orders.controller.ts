import { Controller, Post, Param, Get, Query, Delete } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post('sync/:integrationId')
    async syncOrders(@Param('integrationId') integrationId: string) {
        await this.ordersService.syncOrders(integrationId);
        return { success: true, message: 'Sync started' };
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
        @Query('status') status?: string,
    ) {
        const filters = { orderNumber, packageId, integrationId, status };
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
    ) {
        return this.ordersService.findFaultyOrders(Number(page), Number(limit));
    }

    @Delete('faulty/:id')
    async deleteFaultyOrder(@Param('id') id: string) {
        await this.ordersService.deleteFaultyOrder(id);
        return { success: true };
    }
}

