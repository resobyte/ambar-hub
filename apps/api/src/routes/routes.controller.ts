import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    Query,
    ParseUUIDPipe,
    Res,
    Header,
} from '@nestjs/common';
import { Response } from 'express';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { RouteFilterDto } from './dto/route-filter.dto';
import { RouteStatus } from './enums/route-status.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/request.interface';

@Controller('routes')
export class RoutesController {
    constructor(private readonly routesService: RoutesService) { }

    @Post()
    async create(@Body() dto: CreateRouteDto, @CurrentUser() user: JwtPayload) {
        const route = await this.routesService.create(dto, user?.sub);
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
        @Query('limit') limit?: string,
    ) {
        const typeFilter = type ? type.split(',').filter(Boolean) : undefined;
        const barcodes = productBarcodes ? productBarcodes.split(',').filter(Boolean) : undefined;
        const orderLimit = limit ? parseInt(limit, 10) : undefined;

        const suggestions = await this.routesService.getRouteSuggestions(
            storeId,
            typeFilter,
            barcodes,
            orderLimit,
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
    @Header('Content-Type', 'text/html; charset=utf-8')
    async printLabel(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
        await this.routesService.updateLabelPrinted(id);
        const route = await this.routesService.findOne(id);

        const labelHtml = this.generateRouteLabelHtml(route);

        return res.send(labelHtml);
    }

    @Delete(':id')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        await this.routesService.remove(id);
        return {
            success: true,
            message: 'Route cancelled successfully',
        };
    }

    @Post(':id/bulk-process')
    async bulkProcess(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtPayload,
    ) {
        const result = await this.routesService.bulkProcessOrders(id, user?.sub);
        return {
            success: true,
            data: result,
        };
    }

    @Get(':id/labels/print')
    async printAllLabels(@Param('id', ParseUUIDPipe) id: string) {
        const labels = await this.routesService.getAllLabelsZpl(id);
        return {
            success: true,
            data: labels,
        };
    }

    @Post(':id/mark-packed')
    async markOrdersAsPacked(@Param('id', ParseUUIDPipe) id: string) {
        const result = await this.routesService.markOrdersAsPacked(id);
        return {
            success: true,
            data: result,
        };
    }

    private generateRouteLabelHtml(route: any): string {
        const now = new Date();
        const formatDate = (date: Date | string | null) => {
            if (!date) return '-';
            const d = new Date(date);
            return d.toLocaleDateString('tr-TR', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const createdByName = route.createdByName || '-';
        const orderStartDate = formatDate(route.orderStartDate);
        const orderEndDate = formatDate(route.orderEndDate);
        const createdAt = formatDate(route.createdAt);
        const printedAt = formatDate(now);

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Rota: ${route.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { 
            height: 100%;
            width: 100%;
        }
        body { 
            font-family: Arial, sans-serif; 
            padding: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            width: 100%;
            max-width: 600px;
        }
        .route-name {
            font-size: 64px;
            font-weight: bold;
            margin-bottom: 20px;
            letter-spacing: 3px;
        }
        .barcode {
            margin: 25px 0;
        }
        .barcode svg {
            width: 100%;
            max-width: 450px;
            height: auto;
        }
        .stats {
            font-size: 28px;
            font-weight: bold;
            margin: 25px 0;
            padding: 18px 25px;
            background: #f0f0f0;
            border-radius: 10px;
            display: inline-block;
        }
        .info-row {
            font-size: 22px;
            font-weight: bold;
            margin: 12px 0;
            padding: 6px 0;
        }
        @media print {
            @page {
                size: A4;
                margin: 15mm;
            }
            body { 
                padding: 20px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .no-print { display: none !important; }
            .stats {
                background: #f0f0f0 !important;
            }
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
</head>
<body>
    <div class="container">
        <div class="route-name">${route.name}</div>
        
        <div class="barcode">
            <svg id="barcode"></svg>
        </div>
        
        <div class="stats">
            Sipariş: ${route.totalOrderCount} &nbsp;|&nbsp; Ürün: ${route.uniqueProductCount || route.totalOrderCount} &nbsp;|&nbsp; Toplam: ${route.totalItemCount}
        </div>
        
        <div class="info-row">Atanan : ${createdByName}</div>
        
        <div class="info-row">Oluşma Zamanı : ${createdAt}</div>
        <div class="info-row">Çıktı Zamanı : ${printedAt}</div>
        <div class="info-row">Başlangıç Tar. : ${orderStartDate}</div>
        <div class="info-row">Bitiş Tar. : ${orderEndDate}</div>
    </div>
    
    <script>
        JsBarcode("#barcode", "${route.name}", {
            format: "CODE128",
            width: 3,
            height: 100,
            displayValue: true,
            fontSize: 22,
            margin: 15
        });
        window.onload = function() { 
            setTimeout(function() {
                window.print();
            }, 300);
        };
    </script>
</body>
</html>
        `;
    }
}
