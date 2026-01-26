import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    Query,
    ParseUUIDPipe,
    UseGuards,
    Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PackingService } from './packing.service';
import { StartPackingDto, ScanBarcodeDto, CompleteOrderDto, ProcessShipmentDto } from './dto/packing.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('packing')
@UseGuards(JwtAuthGuard)
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

    @Post('find-order-by-barcode')
    async findOrderByBarcode(@Body() body: { sessionId: string; barcode: string }) {
        const result = await this.packingService.findOrderByProductBarcode(body.sessionId, body.barcode);
        return {
            success: result.success,
            message: result.message,
            data: {
                order: result.order,
                item: result.item,
                allItemsForOrder: result.allItemsForOrder,
            },
        };
    }

    @Post('confirm-product')
    async confirmProduct(@Body() body: { sessionId: string; barcode: string; orderId: string }) {
        const result = await this.packingService.confirmProductScan(body.sessionId, body.barcode, body.orderId);
        return {
            success: result.success,
            message: result.message,
            data: {
                item: result.item,
                orderComplete: result.orderComplete,
                allItemsForOrder: result.allItemsForOrder,
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
                shipment: result.data,
            },
        };
    }

    @Post('process-shipment')
    async processShipment(@Body() dto: ProcessShipmentDto) {
        const result = await this.packingService.processOrderShipment(dto.orderId);
        return {
            success: result.success,
            message: result.message,
            data: {
                invoiceNumber: result.invoiceNumber,
                cargoLabel: result.cargoLabel,
                waybillNumber: result.waybillNumber,
            },
        };
    }

    @Get('cargo-label/:orderId')
    async getCargoLabel(@Param('orderId', ParseUUIDPipe) orderId: string) {
        const order = await this.packingService['orderRepository'].findOne({
            where: { id: orderId },
            relations: ['customer'],
        });

        if (!order) {
            return { success: false, message: 'Order not found' };
        }

        const label = await this.packingService.getOrCreateCargoLabel(order);
        return {
            success: true,
            data: label,
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
