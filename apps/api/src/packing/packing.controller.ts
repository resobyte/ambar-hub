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
import { PackingService } from './packing.service';
import { StartPackingDto, ScanBarcodeDto, CompleteOrderDto } from './dto/packing.dto';

@Controller('packing')
export class PackingController {
    constructor(private readonly packingService: PackingService) { }

    @Post('start')
    async startSession(@Body() dto: StartPackingDto) {
        const session = await this.packingService.startSession(dto);
        return {
            success: true,
            data: session,
        };
    }

    @Get('session/:id')
    async getSession(@Param('id', ParseUUIDPipe) id: string) {
        const session = await this.packingService.getSession(id);
        return {
            success: true,
            data: session,
        };
    }

    @Get('session/:id/current-order')
    async getCurrentOrder(@Param('id', ParseUUIDPipe) id: string) {
        const orderData = await this.packingService.getCurrentOrder(id);
        return {
            success: true,
            data: orderData,
        };
    }

    @Post('scan')
    async scanBarcode(@Body() dto: ScanBarcodeDto) {
        const result = await this.packingService.scanBarcode(dto);
        return {
            success: result.success,
            message: result.message,
            data: {
                item: result.item,
                orderComplete: result.orderComplete,
                nextOrderId: result.nextOrderId,
            },
        };
    }

    @Post('complete-order')
    async completeOrder(@Body() dto: CompleteOrderDto) {
        const result = await this.packingService.completeOrder(dto);
        return {
            success: result.success,
            message: result.message,
            data: {
                sessionComplete: result.sessionComplete,
                nextOrderId: result.nextOrderId,
            },
        };
    }

    @Delete('session/:id')
    async cancelSession(@Param('id', ParseUUIDPipe) id: string) {
        await this.packingService.cancelSession(id);
        return {
            success: true,
            message: 'Session cancelled',
        };
    }
}
