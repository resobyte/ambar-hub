import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProductStoresService } from './product-stores.service';
import { CreateProductStoreDto } from './dto/create-product-store.dto';
import { UpdateProductStoreDto } from './dto/update-product-store.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/interfaces/role.enum';

@Controller('product-stores')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PLATFORM_OWNER)
export class ProductStoresController {
  constructor(private readonly productStoresService: ProductStoresService) {}

  @Post()
  create(@Body() createProductStoreDto: CreateProductStoreDto) {
    return this.productStoresService.create(createProductStoreDto);
  }

  @Get()
  findAll(
    @Query('productId') productId?: string,
    @Query('storeId') storeId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.productStoresService.findAll({
      productId,
      storeId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productStoresService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductStoreDto: UpdateProductStoreDto,
  ) {
    return this.productStoresService.update(id, updateProductStoreDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productStoresService.remove(id);
  }

  @Post('bulk-upsert')
  bulkUpsert(@Body() data: { storeId: string; items: Array<{
    productId: string;
    storeBarcode?: string;
    storeSku?: string;
    storeSalePrice?: number;
    isActive?: boolean;
  }> }) {
    return this.productStoresService.bulkUpsert(data.storeId, data.items);
  }
}
