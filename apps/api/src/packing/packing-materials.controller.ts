import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PackingMaterialsService } from './packing-materials.service';
import { CreatePackingMaterialDto, UpdatePackingMaterialDto } from './dto/packing-material.dto';

@Controller('packing-materials')
export class PackingMaterialsController {
    constructor(private readonly materialsService: PackingMaterialsService) { }

    @Get()
    findAll() {
        return this.materialsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.materialsService.findOne(id);
    }

    @Post()
    create(@Body() createDto: CreatePackingMaterialDto) {
        return this.materialsService.create(createDto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdatePackingMaterialDto) {
        return this.materialsService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.materialsService.remove(id);
    }
}
