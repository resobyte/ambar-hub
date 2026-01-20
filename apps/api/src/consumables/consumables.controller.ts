import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ConsumablesService } from './consumables.service';
import { CreateConsumableDto, UpdateConsumableDto } from './dto/create-consumable.dto';

@Controller('consumables')
export class ConsumablesController {
    constructor(private readonly consumablesService: ConsumablesService) { }

    @Post()
    create(@Body() createConsumableDto: CreateConsumableDto) {
        return this.consumablesService.create(createConsumableDto);
    }

    @Get()
    findAll() {
        return this.consumablesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.consumablesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateConsumableDto: UpdateConsumableDto) {
        return this.consumablesService.update(id, updateConsumableDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.consumablesService.remove(id);
    }
}
