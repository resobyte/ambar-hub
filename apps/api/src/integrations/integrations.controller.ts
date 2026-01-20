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
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/interfaces/role.enum';

interface UpdatePriceInventoryDto {
  productIds?: string[];
}

interface PackHepsiburadaOrderDto {
  lineItems: Array<{
    lineItemId: string;
    quantity: number;
  }>;
}

interface FulfillIkasOrderDto {
  orderId: string;
  orderLineItems: Array<{
    orderLineItemId: string;
    quantity: number;
  }>;
  trackingInfo?: {
    barcode?: string;
    cargoCompany?: string;
    trackingNumber?: string;
    trackingLink?: string;
  };
}

interface UpdateIkasPackageStatusDto {
  orderId: string;
  packages: Array<{
    packageId: string;
    status: 'READY_FOR_SHIPMENT' | 'SHIPPED' | 'DELIVERED';
    trackingInfo?: {
      barcode?: string;
      cargoCompany?: string;
      trackingNumber?: string;
      trackingLink?: string;
    };
  }>;
}

interface AddIkasInvoiceDto {
  orderId: string;
  invoiceNumber: string;
  invoicePdfBase64?: string;
}

@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PLATFORM_OWNER)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post()
  create(@Body() createIntegrationDto: CreateIntegrationDto) {
    return this.integrationsService.create(createIntegrationDto);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.integrationsService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.integrationsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateIntegrationDto: UpdateIntegrationDto) {
    return this.integrationsService.update(id, updateIntegrationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.integrationsService.remove(id);
  }

  @Post('stores/:integrationStoreId/trendyol/price-inventory')
  updateTrendyolPriceAndInventory(
    @Param('integrationStoreId') integrationStoreId: string,
    @Body() body: UpdatePriceInventoryDto,
  ) {
    return this.integrationsService.updateTrendyolPriceAndInventory(
      integrationStoreId,
      body.productIds,
    );
  }

  @Get('stores/:integrationStoreId/trendyol/batch-status/:batchRequestId')
  getTrendyolBatchStatus(
    @Param('integrationStoreId') integrationStoreId: string,
    @Param('batchRequestId') batchRequestId: string,
  ) {
    return this.integrationsService.getTrendyolBatchStatus(
      integrationStoreId,
      batchRequestId,
    );
  }

  // =============================================
  // HEPSIBURADA ENDPOINTS
  // =============================================

  @Post('stores/:integrationStoreId/hepsiburada/price-inventory')
  updateHepsiburadaPriceAndInventory(
    @Param('integrationStoreId') integrationStoreId: string,
    @Body() body: UpdatePriceInventoryDto,
  ) {
    return this.integrationsService.updateHepsiburadaPriceAndInventory(
      integrationStoreId,
      body.productIds,
    );
  }

  @Get('stores/:integrationStoreId/hepsiburada/upload-status/:type/:uploadId')
  getHepsiburadaUploadStatus(
    @Param('integrationStoreId') integrationStoreId: string,
    @Param('type') type: 'price' | 'stock',
    @Param('uploadId') uploadId: string,
  ) {
    return this.integrationsService.getHepsiburadaUploadStatus(
      integrationStoreId,
      uploadId,
      type,
    );
  }

  @Post('stores/:integrationStoreId/hepsiburada/pack')
  packHepsiburadaOrder(
    @Param('integrationStoreId') integrationStoreId: string,
    @Body() body: PackHepsiburadaOrderDto,
  ) {
    return this.integrationsService.packHepsiburadaOrder(
      integrationStoreId,
      body.lineItems,
    );
  }

  @Post('stores/:integrationStoreId/hepsiburada/unpack/:packageNumber')
  unpackHepsiburadaOrder(
    @Param('integrationStoreId') integrationStoreId: string,
    @Param('packageNumber') packageNumber: string,
  ) {
    return this.integrationsService.unpackHepsiburadaOrder(
      integrationStoreId,
      packageNumber,
    );
  }

  @Get('stores/:integrationStoreId/hepsiburada/label/:packageNumber')
  getHepsiburadaPackageLabel(
    @Param('integrationStoreId') integrationStoreId: string,
    @Param('packageNumber') packageNumber: string,
  ) {
    return this.integrationsService.getHepsiburadaPackageLabel(
      integrationStoreId,
      packageNumber,
    );
  }

  // =============================================
  // IKAS ENDPOINTS
  // =============================================

  @Post('stores/:integrationStoreId/ikas/price-inventory')
  updateIkasPriceAndInventory(
    @Param('integrationStoreId') integrationStoreId: string,
    @Body() body: UpdatePriceInventoryDto,
  ) {
    return this.integrationsService.updateIkasPriceAndInventory(
      integrationStoreId,
      body.productIds,
    );
  }

  @Post('stores/:integrationStoreId/ikas/fulfill')
  fulfillIkasOrder(
    @Param('integrationStoreId') integrationStoreId: string,
    @Body() body: FulfillIkasOrderDto,
  ) {
    return this.integrationsService.fulfillIkasOrder(
      integrationStoreId,
      body.orderId,
      body.orderLineItems,
      body.trackingInfo,
    );
  }

  @Post('stores/:integrationStoreId/ikas/package-status')
  updateIkasOrderPackageStatus(
    @Param('integrationStoreId') integrationStoreId: string,
    @Body() body: UpdateIkasPackageStatusDto,
  ) {
    return this.integrationsService.updateIkasOrderPackageStatus(
      integrationStoreId,
      body.orderId,
      body.packages,
    );
  }

  @Post('stores/:integrationStoreId/ikas/invoice')
  addIkasOrderInvoice(
    @Param('integrationStoreId') integrationStoreId: string,
    @Body() body: AddIkasInvoiceDto,
  ) {
    return this.integrationsService.addIkasOrderInvoice(
      integrationStoreId,
      body.orderId,
      body.invoiceNumber,
      body.invoicePdfBase64,
    );
  }
}
