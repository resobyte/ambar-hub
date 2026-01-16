import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    ParseUUIDPipe,
} from '@nestjs/common';
import { PickingService, PickingProgress } from './picking.service';
import { ScanPickingBarcodeDto, BulkScanDto } from './dto/picking.dto';

@Controller('picking')
export class PickingController {
    constructor(private readonly pickingService: PickingService) { }

    @Get('progress/:routeId')
    async getProgress(@Param('routeId', ParseUUIDPipe) routeId: string): Promise<{
        success: boolean;
        data: PickingProgress;
    }> {
        const progress = await this.pickingService.getPickingProgress(routeId);
        return { success: true, data: progress };
    }

    @Post('scan')
    async scanBarcode(@Body() dto: ScanPickingBarcodeDto) {
        const result = await this.pickingService.scanBarcode(dto.routeId, dto.barcode, dto.quantity);
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
