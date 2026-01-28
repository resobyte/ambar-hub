import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseInterceptors, UploadedFile, Res, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ShelvesService } from './shelves.service';
import { CreateShelfDto } from './dto/create-shelf.dto';
import { UpdateShelfDto } from './dto/update-shelf.dto';
import { MovementType } from './entities/shelf-stock-movement.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('shelves')
@UseGuards(JwtAuthGuard)
export class ShelvesController {
    constructor(private readonly shelvesService: ShelvesService) { }

    @Post()
    create(@Body() dto: CreateShelfDto) {
        return this.shelvesService.create(dto);
    }

    @Post('import')
    @UseInterceptors(FileInterceptor('file'))
    async importExcel(
        @UploadedFile() file: Express.Multer.File,
        @Body('warehouseId') warehouseId: string,
    ) {
        return this.shelvesService.importExcel(file.buffer, warehouseId);
    }

    @Get('import/template')
    async downloadTemplate(@Res() res: Response) {
        const buffer = await this.shelvesService.generateExcelTemplate();
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=raf_sablonu.xlsx',
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }

    @Get()
    findAll(@Query('warehouseId') warehouseId?: string, @Query('type') type?: string) {
        return this.shelvesService.findAll(warehouseId, type);
    }

    @Get('tree/:warehouseId')
    findTree(@Param('warehouseId') warehouseId: string) {
        return this.shelvesService.findTree(warehouseId);
    }

    @Post('tree/:warehouseId/rebuild')
    rebuildTree(@Param('warehouseId') warehouseId: string) {
        return this.shelvesService.rebuildTreePaths(warehouseId);
    }

    @Get('receiving/:warehouseId')
    getReceivingShelves(@Param('warehouseId') warehouseId: string) {
        return this.shelvesService.getReceivingShelves(warehouseId);
    }

    @Get('barcode/:barcode')
    async findByBarcode(@Param('barcode') barcode: string) {
        const shelf = await this.shelvesService.findByBarcode(barcode);
        if (!shelf) {
            throw new NotFoundException('Raf bulunamadı');
        }
        return shelf;
    }

    @Get('search-product')
    searchProduct(@Query('query') query: string) {
        return this.shelvesService.searchProductInShelves(query);
    }

    @Post('search-product-by-ids')
    searchProductByIds(@Body() body: { productIds: string[] }) {
        return this.shelvesService.searchProductsByIds(body.productIds);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.shelvesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateShelfDto) {
        return this.shelvesService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.shelvesService.remove(id);
    }

    @Get(':id/stock')
    getStock(@Param('id') id: string) {
        return this.shelvesService.getStock(id);
    }

    @Get(':id/stock-with-orders')
    getStockWithOrders(@Param('id') id: string) {
        return this.shelvesService.getStockWithOrders(id);
    }

    @Post(':id/stock')
    addStock(
        @Param('id') shelfId: string,
        @Body() body: { productId: string; quantity: number; notes?: string },
        @Req() req: Request,
    ) {
        const userId = (req as Request & { user?: { id: string } }).user?.id;
        return this.shelvesService.addStockWithHistory(shelfId, body.productId, body.quantity, {
            userId,
            notes: body.notes,
        });
    }

    @Post('transfer')
    transferStock(
        @Body() body: { fromShelfId: string; toShelfId: string; productId: string; quantity: number },
        @Req() req: Request,
    ) {
        const userId = (req as Request & { user?: { id: string } }).user?.id;
        return this.shelvesService.transferWithHistory(
            body.fromShelfId,
            body.toShelfId,
            body.productId,
            body.quantity,
            { userId },
        );
    }

    @Get('movements/history')
    async getMovementHistory(
        @Query('shelfId') shelfId?: string,
        @Query('productId') productId?: string,
        @Query('orderId') orderId?: string,
        @Query('routeId') routeId?: string,
        @Query('type') type?: MovementType,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('page') page = '1',
        @Query('limit') limit = '50',
    ) {
        const { data, total } = await this.shelvesService.getMovementHistory({
            shelfId,
            productId,
            orderId,
            routeId,
            type,
            startDate,
            endDate,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
        });

        return {
            success: true,
            data,
            meta: {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                total,
                totalPages: Math.ceil(total / parseInt(limit, 10)),
            },
        };
    }

    @Get(':shelfId/movements')
    async getShelfMovements(
        @Param('shelfId') shelfId: string,
        @Query('page') page = '1',
        @Query('limit') limit = '50',
    ) {
        const { data, total } = await this.shelvesService.getMovementHistory({
            shelfId,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
        });

        return {
            success: true,
            data,
            meta: {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                total,
                totalPages: Math.ceil(total / parseInt(limit, 10)),
            },
        };
    }

    @Post('sync-all-stocks')
    async syncAllStocks(@Query('warehouseId') warehouseId?: string) {
        return this.shelvesService.syncAllProductStocks(warehouseId);
    }
}
