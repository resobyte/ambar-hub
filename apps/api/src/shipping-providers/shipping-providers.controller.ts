import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ShippingProvidersService } from './shipping-providers.service';
import { CreateShippingProviderDto } from './dto/create-shipping-provider.dto';
import { UpdateShippingProviderDto } from './dto/update-shipping-provider.dto';
import { ShippingProviderResponseDto } from './dto/shipping-provider-response.dto';
import { ShippingProvider } from './entities/shipping-provider.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/interfaces/role.enum';

@Controller('shipping-providers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingProvidersController {
  constructor(private readonly shippingProvidersService: ShippingProvidersService) {}

  @Get()
  @Roles(Role.PLATFORM_OWNER)
  findAll(): Promise<ShippingProviderResponseDto[]> {
    return this.shippingProvidersService.findAll();
  }

  @Get('active')
  @Roles(Role.PLATFORM_OWNER)
  findActive(): Promise<ShippingProvider[]> {
    return this.shippingProvidersService.findActive();
  }

  @Get(':id')
  @Roles(Role.PLATFORM_OWNER)
  findOne(@Param('id') id: string): Promise<ShippingProviderResponseDto> {
    return this.shippingProvidersService.findOne(id);
  }

  @Post()
  @Roles(Role.PLATFORM_OWNER)
  create(@Body() createShippingProviderDto: CreateShippingProviderDto): Promise<ShippingProviderResponseDto> {
    return this.shippingProvidersService.create(createShippingProviderDto);
  }

  @Patch(':id')
  @Roles(Role.PLATFORM_OWNER)
  update(@Param('id') id: string, @Body() updateShippingProviderDto: UpdateShippingProviderDto): Promise<ShippingProviderResponseDto> {
    return this.shippingProvidersService.update(id, updateShippingProviderDto);
  }

  @Delete(':id')
  @Roles(Role.PLATFORM_OWNER)
  remove(@Param('id') id: string): Promise<void> {
    return this.shippingProvidersService.remove(id);
  }
}
