import {
    Controller,
    Get,
    Post,
    Put,
    Param,
    Query,
    Body,
    DefaultValuePipe,
    ParseIntPipe,
} from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { ReturnShelfType } from './enums/return-status.enum';

@Controller('returns')
export class ReturnsController {
    constructor(private readonly returnsService: ReturnsService) {}

    @Get()
    findAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query('status') status?: string,
        @Query('storeId') storeId?: string,
        @Query('search') search?: string,
    ) {
        return this.returnsService.findAll(page, limit, { status, storeId, search });
    }

    @Get('reject-reasons')
    getRejectReasons() {
        return {
            success: true,
            data: this.returnsService.getRejectReasons(),
        };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const returnEntity = await this.returnsService.findOne(id);
        return {
            success: true,
            data: returnEntity,
        };
    }

    @Post('sync/:storeId')
    async syncFromTrendyol(@Param('storeId') storeId: string) {
        const result = await this.returnsService.syncFromTrendyol(storeId);
        return {
            success: true,
            message: `${result.synced} iade senkronize edildi`,
            data: result,
        };
    }

    @Post(':id/approve')
    async approveClaim(@Param('id') id: string) {
        await this.returnsService.approveClaim(id);
        return {
            success: true,
            message: 'İade Trendyol\'da onaylandı',
        };
    }

    @Post(':id/reject')
    async rejectClaim(
        @Param('id') id: string,
        @Body() body: { reasonId: string; description: string },
    ) {
        await this.returnsService.rejectClaim(id, body);
        return {
            success: true,
            message: 'İade ret talebi oluşturuldu',
        };
    }

    @Post(':id/process')
    async processReturn(
        @Param('id') id: string,
        @Body() body: {
            items: Array<{
                returnItemId: string;
                shelfId: string;
                shelfType: ReturnShelfType;
                quantity: number;
                notes?: string;
            }>;
            userId?: string;
            notes?: string;
        },
    ) {
        const result = await this.returnsService.processReturn(id, body);
        return {
            success: true,
            message: 'İade işlendi ve stok eklendi',
            data: result,
        };
    }
}
