import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { IntegrationStoresService } from './integration-stores.service';
import { CreateIntegrationStoreDto } from './dto/create-integration-store.dto';
import { UpdateIntegrationStoreDto } from './dto/update-integration-store.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/interfaces/role.enum';

@Controller('integration-stores')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PLATFORM_OWNER)
export class IntegrationStoresController {
  constructor(
    private readonly integrationStoresService: IntegrationStoresService,
  ) {}

  @Post()
  create(@Body() createIntegrationStoreDto: CreateIntegrationStoreDto) {
    return this.integrationStoresService.create(createIntegrationStoreDto);
  }

  @Get()
  findAll(@Query('integrationId') integrationId?: string) {
    return this.integrationStoresService.findAll(integrationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.integrationStoresService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateIntegrationStoreDto: UpdateIntegrationStoreDto) {
    return this.integrationStoresService.update(id, updateIntegrationStoreDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.integrationStoresService.remove(id);
  }
}
