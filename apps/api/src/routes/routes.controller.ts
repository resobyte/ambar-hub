import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    Query,
    ParseUUIDPipe,
} from '@nestjs/common';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { RouteFilterDto } from './dto/route-filter.dto';
import { RouteStatus } from './enums/route-status.enum';

@Controller('routes')
export class RoutesController {
    constructor(private readonly routesService: RoutesService) { }

    @Post()
    async create(@Body() dto: CreateRouteDto) {
        const route = await this.routesService.create(dto);
        return {
            success: true,
            data: route,
        };
    }

    @Get()
    async findAll(@Query('status') status?: string) {
        const statusArray = status
            ? status.split(',').map(s => s.trim() as RouteStatus)
            : undefined;
        const routes = await this.routesService.findAll(statusArray);
        return {
            success: true,
            data: routes,
            meta: {
                total: routes.length,
            },
        };
    }

    @Get('filter-orders')
    async getFilteredOrders(@Query() filter: RouteFilterDto) {
        const orders = await this.routesService.getFilteredOrders(filter);
        return {
            success: true,
            data: orders,
            meta: {
                total: orders.length,
            },
        };
    }

    @Get('suggestions')
    async getRouteSuggestions(
        @Query('storeId') storeId?: string,
        @Query('type') type?: string,
        @Query('productBarcodes') productBarcodes?: string,
    ) {
        const typeFilter = type ? type.split(',').filter(Boolean) : undefined;
        const barcodes = productBarcodes ? productBarcodes.split(',').filter(Boolean) : undefined;

        const suggestions = await this.routesService.getRouteSuggestions(
            storeId,
            typeFilter,
            barcodes,
        );

        return {
            success: true,
            data: suggestions,
            meta: {
                total: suggestions.length,
            },
        };
    }

    @Get(':id')
    async findOne(@Param('id', ParseUUIDPipe) id: string) {
        const route = await this.routesService.findOne(id);
        return {
            success: true,
            data: route,
        };
    }

    @Post(':id/print-label')
    async printLabel(@Param('id', ParseUUIDPipe) id: string) {
        await this.routesService.updateLabelPrinted(id);
        const route = await this.routesService.findOne(id);

        // Generate simple HTML label for now
        const labelHtml = this.generateRouteLabelHtml(route);

        return labelHtml;
    }

    @Delete(':id')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        await this.routesService.remove(id);
        return {
            success: true,
            message: 'Route cancelled successfully',
        };
    }

    private generateRouteLabelHtml(route: any): string {
        const ordersHtml = route.orders?.map((order: any, index: number) => `
            <div style="border: 1px solid #ccc; padding: 10px; margin: 5px 0; page-break-inside: avoid;">
                <div style="font-size: 18px; font-weight: bold;">${index + 1}. ${order.orderNumber}</div>
                <div style="font-size: 14px; color: #666;">Paket: ${order.packageId}</div>
            </div>
        `).join('') || '';

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Rota: ${route.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .route-name { font-size: 24px; font-weight: bold; }
        .route-info { font-size: 14px; color: #666; margin-top: 5px; }
        .orders { margin-top: 20px; }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="route-name">${route.name}</div>
        <div class="route-info">
            ${route.totalOrderCount} Sipariş | ${route.totalItemCount} Adet
        </div>
        <div class="route-info">${route.description || ''}</div>
    </div>
    <div class="orders">
        ${ordersHtml}
    </div>
    <script class="no-print">
        window.onload = function() { window.print(); }
    </script>
</body>
</html>
        `;
    }
}
