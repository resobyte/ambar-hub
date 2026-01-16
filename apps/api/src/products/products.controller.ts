import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/interfaces/role.enum';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PLATFORM_OWNER)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    return this.productsService.importExcel(file.buffer);
  }

  @Get('import/template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.productsService.generateExcelTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=urun_sablonu.xlsx',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.productsService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // ─────────────────────────────────────────────────────────────
  // SET Item Endpoints
  // ─────────────────────────────────────────────────────────────

  @Get(':id/set-items')
  getSetItems(@Param('id') id: string) {
    return this.productsService.getSetItems(id);
  }

  @Put(':id/set-items')
  updateSetItems(
    @Param('id') id: string,
    @Body() items: {
      componentProductId: string;
      quantity: number;
      priceShare: number;
      sortOrder: number;
    }[],
  ) {
    return this.productsService.updateSetItems(id, items);
  }

  @Post(':id/set-items')
  addSetItem(
    @Param('id') setProductId: string,
    @Body() data: {
      componentProductId: string;
      quantity?: number;
      priceShare?: number;
      sortOrder?: number;
    },
  ) {
    return this.productsService.addSetItem({ setProductId, ...data });
  }

  @Delete('set-items/:itemId')
  removeSetItem(@Param('itemId') itemId: string) {
    return this.productsService.removeSetItem(itemId);
  }
}

