import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StockSyncService } from './stock-sync.service';
import { ApiLogProvider } from '../orders/entities/order-api-log.entity';
import { SyncStatus } from './enums/stock-sync.enum';

@Controller('stock-sync')
@UseGuards(JwtAuthGuard)
export class StockSyncController {
    constructor(private readonly stockSyncService: StockSyncService) {}

    /**
     * GET /stock-sync/logs
     * Stok senkronizasyon loglarını listele
     */
    @Get('logs')
    async getLogs(
        @Query('storeId') storeId?: string,
        @Query('provider') provider?: ApiLogProvider,
        @Query('status') status?: SyncStatus,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '50',
    ) {
        return this.stockSyncService.getLogs({
            storeId,
            provider,
            status,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
            page: Number(page),
            limit: Number(limit),
        });
    }

    /**
     * GET /stock-sync/logs/:id
     * Log detayını getir
     */
    @Get('logs/:id')
    async getLogDetail(@Param('id') id: string) {
        return this.stockSyncService.getLogDetail(id);
    }

    /**
     * GET /stock-sync/stats
     * İstatistikler
     */
    @Get('stats')
    async getStats(
        @Query('storeId') storeId?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.stockSyncService.getStats({
            storeId,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
        });
    }

    /**
     * GET /stock-sync/queue-status
     * Kuyruk durumu
     */
    @Get('queue-status')
    async getQueueStatus() {
        return this.stockSyncService.getQueueStatus();
    }

    /**
     * POST /stock-sync/retry/:id
     * Başarısız logu tekrar dene
     */
    @Post('retry/:id')
    async retryLog(@Param('id') id: string) {
        return this.stockSyncService.retryFailedLog(id);
    }
}
