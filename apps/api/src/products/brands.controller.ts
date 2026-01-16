import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@Controller('brands')
export class BrandsController {
    constructor(private readonly brandsService: BrandsService) { }

    @Get()
    findAll() {
        return this.brandsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.brandsService.findOne(id);
    }

    @Post()
    create(@Body() createBrandDto: CreateBrandDto) {
        return this.brandsService.create(createBrandDto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateBrandDto: UpdateBrandDto) {
        return this.brandsService.update(id, updateBrandDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.brandsService.remove(id);
    }
}
