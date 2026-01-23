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
} from '@nestjs/common';
import { Response } from 'express';
import { WaybillsService } from './waybills.service';
import { CreateWaybillDto } from './dto/waybill.dto';
import { WaybillType, WaybillStatus } from './entities/waybill.entity';

@Controller('waybills')
export class WaybillsController {
    constructor(private readonly waybillsService: WaybillsService) { }

    @Post()
    async create(@Body() dto: CreateWaybillDto) {
        const waybill = await this.waybillsService.create(dto);
        return {
            success: true,
            data: waybill,
        };
    }

    @Get()
    async findAll(
        @Query('page') page = '1',
        @Query('limit') limit = '10',
        @Query('storeId') storeId?: string,
        @Query('type') type?: WaybillType,
        @Query('status') status?: WaybillStatus,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('waybillNumber') waybillNumber?: string,
    ) {
        const { data, total } = await this.waybillsService.findAll(
            parseInt(page, 10),
            parseInt(limit, 10),
            { storeId, type, status, startDate, endDate, waybillNumber },
        );

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

    @Get(':id')
    async findOne(@Param('id', ParseUUIDPipe) id: string) {
        const waybill = await this.waybillsService.findOne(id);
        return {
            success: true,
            data: waybill,
        };
    }

    @Get('number/:waybillNumber')
    async findByNumber(@Param('waybillNumber') waybillNumber: string) {
        const waybill = await this.waybillsService.findByNumber(waybillNumber);
        return {
            success: true,
            data: waybill,
        };
    }

    @Get(':id/html')
    async getHtml(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
        const waybill = await this.waybillsService.findOne(id);

        if (!waybill.htmlContent) {
            return res.status(404).json({ success: false, message: 'HTML content not found' });
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(waybill.htmlContent);
    }

    @Post(':id/print')
    async markAsPrinted(@Param('id', ParseUUIDPipe) id: string) {
        const waybill = await this.waybillsService.markAsPrinted(id);
        return {
            success: true,
            data: waybill,
        };
    }

    @Delete(':id')
    async cancel(@Param('id', ParseUUIDPipe) id: string) {
        const waybill = await this.waybillsService.cancel(id);
        return {
            success: true,
            data: waybill,
        };
    }
}
