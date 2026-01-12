import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
    constructor(private readonly suppliersService: SuppliersService) { }

    @Post()
    create(@Body() data: any) {
        return this.suppliersService.create(data);
    }

    @Get()
    async findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
        const { data, total } = await this.suppliersService.findAll(Number(page), Number(limit));
        return {
            success: true,
            data,
            meta: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        };
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.suppliersService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() data: any) {
        return this.suppliersService.update(id, data);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.suppliersService.remove(id);
    }
}
