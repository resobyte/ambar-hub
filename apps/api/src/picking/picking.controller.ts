import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    ParseUUIDPipe,
    UseGuards,
    Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PickingService, PickingProgress, CurrentPickingState } from './picking.service';
import { ScanPickingBarcodeDto, BulkScanDto, ScanShelfDto, ScanProductWithShelfDto } from './dto/picking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('picking')
@UseGuards(JwtAuthGuard)
export class PickingController {
    constructor(private readonly pickingService: PickingService) { }

    private getUserId(req: Request): string | undefined {
        return (req as Request & { user?: { id: string } }).user?.id;
    }

    @Get('progress/:routeId')
    async getProgress(@Param('routeId', ParseUUIDPipe) routeId: string): Promise<{
        success: boolean;
        data: PickingProgress;
    }> {
        const progress = await this.pickingService.getPickingProgress(routeId);
        return { success: true, data: progress };
    }

    @Get('next/:routeId')
    async getNextItem(@Param('routeId', ParseUUIDPipe) routeId: string) {
        const result = await this.pickingService.getNextPickingItem(routeId);
        return {
            success: true,
            data: result,
        };
    }

    @Get('state/:routeId')
    async getState(@Param('routeId', ParseUUIDPipe) routeId: string): Promise<{
        success: boolean;
        data: CurrentPickingState;
    }> {
        const state = this.pickingService.getPickingState(routeId);
        return { success: true, data: state };
    }

    @Post('scan-shelf')
    async scanShelf(@Body() dto: ScanShelfDto) {
        const result = await this.pickingService.scanShelf(dto.routeId, dto.shelfBarcode);
        return {
            success: result.success,
            message: result.message,
            data: {
                expectedShelf: result.expectedShelf,
                scannedShelf: result.scannedShelf,
                nextItem: result.nextItem,
            },
        };
    }

    @Post('scan-product')
    async scanProductWithShelf(@Body() dto: ScanProductWithShelfDto, @Req() req: Request) {
        const userId = this.getUserId(req);
        const result = await this.pickingService.scanProductWithShelfValidation(
            dto.routeId,
            dto.productBarcode,
            dto.quantity,
            userId,
        );
        return {
            success: result.success,
            message: result.message,
            data: {
                item: result.item,
                progress: result.progress,
                requiresShelfScan: result.requiresShelfScan,
            },
        };
    }

    @Post('scan')
    async scanBarcode(@Body() dto: ScanPickingBarcodeDto, @Req() req: Request) {
        const userId = this.getUserId(req);
        const result = await this.pickingService.scanBarcode(dto.routeId, dto.barcode, dto.quantity, userId);
        return {
            success: result.success,
            message: result.message,
            data: {
                item: result.item,
                progress: result.progress,
            },
        };
    }

    @Post('bulk-scan')
    async bulkScan(@Body() dto: BulkScanDto) {
        const result = await this.pickingService.bulkScan(dto.routeId, dto.barcodes);
        return {
            success: result.success,
            message: result.message,
            data: {
                scanned: result.scanned,
                failed: result.failed,
                progress: result.progress,
            },
        };
    }

    @Post('complete/:routeId')
    async completeManually(@Param('routeId', ParseUUIDPipe) routeId: string) {
        await this.pickingService.completePickingManually(routeId);
        const progress = await this.pickingService.getPickingProgress(routeId);
        return {
            success: true,
            message: 'Toplama manuel olarak tamamlandı',
            data: progress,
        };
    }

    @Post('reset/:routeId')
    async resetPicking(@Param('routeId', ParseUUIDPipe) routeId: string) {
        await this.pickingService.resetPicking(routeId);
        const progress = await this.pickingService.getPickingProgress(routeId);
        return {
            success: true,
            message: 'Toplama sıfırlandı',
            data: progress,
        };
    }
}
