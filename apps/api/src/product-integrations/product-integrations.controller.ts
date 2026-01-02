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
import { ProductIntegrationsService } from './product-integrations.service';
import { CreateProductIntegrationDto } from './dto/create-product-integration.dto';
import { UpdateProductIntegrationDto } from './dto/update-product-integration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/interfaces/role.enum';

@Controller('product-integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PLATFORM_OWNER)
export class ProductIntegrationsController {
  constructor(private readonly productIntegrationsService: ProductIntegrationsService) {}

  @Post()
  create(@Body() createProductIntegrationDto: CreateProductIntegrationDto) {
    return this.productIntegrationsService.create(createProductIntegrationDto);
  }

  @Get()
  findAll(@Query('productStoreId') productStoreId?: string) {
    return this.productIntegrationsService.findAll(productStoreId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productIntegrationsService.findOne(id, id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductIntegrationDto: UpdateProductIntegrationDto,
  ) {
    return this.productIntegrationsService.update(id, updateProductIntegrationDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productIntegrationsService.remove(id);
  }
}
