import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ShelvesService } from './shelves.service';
import { CreateShelfDto } from './dto/create-shelf.dto';
import { UpdateShelfDto } from './dto/update-shelf.dto';

@Controller('shelves')
export class ShelvesController {
    constructor(private readonly shelvesService: ShelvesService) { }

    @Post()
    create(@Body() dto: CreateShelfDto) {
        return this.shelvesService.create(dto);
    }

    @Get()
    findAll(@Query('warehouseId') warehouseId?: string) {
        return this.shelvesService.findAll(warehouseId);
    }

    @Get('tree/:warehouseId')
    findTree(@Param('warehouseId') warehouseId: string) {
        return this.shelvesService.findTree(warehouseId);
    }

    @Get('receiving/:warehouseId')
    getReceivingShelves(@Param('warehouseId') warehouseId: string) {
        return this.shelvesService.getReceivingShelves(warehouseId);
    }

    @Get('barcode/:barcode')
    findByBarcode(@Param('barcode') barcode: string) {
        return this.shelvesService.findByBarcode(barcode);
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

    @Post(':id/stock')
    addStock(
        @Param('id') shelfId: string,
        @Body() body: { productId: string; quantity: number },
    ) {
        return this.shelvesService.addStock(shelfId, body.productId, body.quantity);
    }

    @Post('transfer')
    transferStock(
        @Body() body: { fromShelfId: string; toShelfId: string; productId: string; quantity: number },
    ) {
        return this.shelvesService.transferStock(
            body.fromShelfId,
            body.toShelfId,
            body.productId,
            body.quantity,
        );
    }
}
