import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration, IntegrationType } from './entities/integration.entity';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationResponse } from '../common/interfaces/api-response.interface';
import { IntegrationResponseDto } from './dto/integration-response.dto';
import { IntegrationStore } from '../integration-stores/entities/integration-store.entity';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { ProductIntegration } from '../product-integrations/entities/product-integration.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepository: Repository<Integration>,
    @InjectRepository(IntegrationStore)
    private readonly integrationStoreRepository: Repository<IntegrationStore>,
    @InjectRepository(ProductStore)
    private readonly productStoreRepository: Repository<ProductStore>,
    @InjectRepository(ProductIntegration)
    private readonly productIntegrationRepository: Repository<ProductIntegration>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) { }

  async create(createIntegrationDto: CreateIntegrationDto): Promise<IntegrationResponseDto> {
    const integration = this.integrationRepository.create(createIntegrationDto);
    const savedIntegration = await this.integrationRepository.save(integration);
    return IntegrationResponseDto.fromEntity(savedIntegration, 0);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginationResponse<IntegrationResponseDto>> {
    const { page, limit, sortBy, sortOrder } = paginationDto;
    const skip = (page - 1) * limit;

    const [integrations, total] = await this.integrationRepository.findAndCount({
      order: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'DESC' as const },
      skip,
      take: limit,
    });

    // Get store counts for each integration using findAndCount
    const integrationIds = integrations.map((i) => i.id);
    const countMap = new Map<string, number>();

    for (const integrationId of integrationIds) {
      const count = await this.integrationStoreRepository.count({
        where: { integrationId },
      });
      countMap.set(integrationId, count);
    }

    const response = integrations.map((integration) => {
      return IntegrationResponseDto.fromEntity(
        integration,
        countMap.get(integration.id) || 0,
      );
    });

    return {
      success: true,
      data: response,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<IntegrationResponseDto> {
    const integration = await this.integrationRepository.findOne({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    const storeCount = await this.integrationStoreRepository.count({
      where: { integrationId: id },
    });

    return IntegrationResponseDto.fromEntity(integration, storeCount);
  }

  async update(
    id: string,
    updateIntegrationDto: UpdateIntegrationDto,
  ): Promise<IntegrationResponseDto> {
    const integration = await this.integrationRepository.findOne({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    Object.assign(integration, updateIntegrationDto);
    const updatedIntegration = await this.integrationRepository.save(integration);

    const storeCount = await this.integrationStoreRepository.count({
      where: { integrationId: id },
    });

    return IntegrationResponseDto.fromEntity(updatedIntegration, storeCount);
  }

  async findActiveByType(type: import('./entities/integration.entity').IntegrationType): Promise<Integration[]> {
    return this.integrationRepository.find({
      where: { type, isActive: true },
      relations: ['integrationStores', 'integrationStores.store'],
    });
  }

  async findWithStores(id: string): Promise<Integration | null> {
    return this.integrationRepository.findOne({
      where: { id },
      relations: ['integrationStores', 'integrationStores.store'],
    });
  }

  async remove(id: string): Promise<void> {
    const integration = await this.integrationRepository.findOne({
      where: { id },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    await this.integrationRepository.softDelete(id);
  }

  async updateTrendyolPriceAndInventory(
    integrationStoreId: string,
    productIds?: string[],
  ): Promise<{
    success: boolean;
    message: string;
    batchRequestId?: string;
    sentItems?: number;
    skippedItems?: number;
  }> {
    const integrationStore = await this.integrationStoreRepository.findOne({
      where: { id: integrationStoreId },
      relations: ['integration', 'store'],
    });

    if (!integrationStore) {
      throw new NotFoundException('Entegrasyon mağazası bulunamadı.');
    }

    if (!integrationStore.isActive) {
      throw new BadRequestException('Bu entegrasyon mağazası aktif değil.');
    }

    if (integrationStore.integration?.type !== IntegrationType.TRENDYOL) {
      throw new BadRequestException('Bu işlem sadece Trendyol entegrasyonları için geçerlidir.');
    }

    if (!integrationStore.sendStock && !integrationStore.sendPrice) {
      throw new BadRequestException('Bu mağaza için stok ve fiyat gönderimi kapalı.');
    }

    const query = this.productStoreRepository
      .createQueryBuilder('ps')
      .leftJoinAndSelect('ps.product', 'product')
      .leftJoinAndSelect('ps.productIntegrations', 'pi', 'pi.integrationId = :integrationId', {
        integrationId: integrationStore.integrationId,
      })
      .where('ps.storeId = :storeId', { storeId: integrationStore.storeId })
      .andWhere('ps.isActive = :isActive', { isActive: true })
      .andWhere('product.isActive = :productActive', { productActive: true })
      .andWhere('product.barcode IS NOT NULL')
      .andWhere('product.barcode != :emptyBarcode', { emptyBarcode: '' });

    if (productIds && productIds.length > 0) {
      query.andWhere('ps.productId IN (:...productIds)', { productIds });
    }

    const productStores = await query.getMany();

    if (productStores.length === 0) {
      return {
        success: false,
        message: 'Güncellenecek ürün bulunamadı.',
        sentItems: 0,
        skippedItems: 0,
      };
    }

    const items: Array<{
      barcode: string;
      quantity?: number;
      salePrice?: number;
      listPrice?: number;
    }> = [];

    let skippedItems = 0;

    for (const ps of productStores) {
      const product = ps.product;
      if (!product?.barcode) {
        skippedItems++;
        continue;
      }

      const productIntegration = ps.productIntegrations?.find(
        (pi) => pi.integrationId === integrationStore.integrationId && pi.isActive,
      );

      const salePrice =
        productIntegration?.integrationSalePrice ??
        ps.storeSalePrice ??
        product.salePrice;

      const listPrice = salePrice;

      const quantity = ps.sellableQuantity ?? 0;

      const item: {
        barcode: string;
        quantity?: number;
        salePrice?: number;
        listPrice?: number;
      } = {
        barcode: product.barcode,

      if (integrationStore.sendStock) {
        item.quantity = Math.max(0, Math.min(quantity, 20000));
      }

      if (integrationStore.sendPrice && salePrice !== null && salePrice !== undefined) {
        item.salePrice = Number(salePrice);
        item.listPrice = Number(listPrice);
      }

      if (item.quantity !== undefined || item.salePrice !== undefined) {
        items.push(item);
      } else {
        skippedItems++;
      }
    }

    if (items.length === 0) {
      return {
        success: false,
        message: 'Gönderilecek geçerli ürün bulunamadı.',
        sentItems: 0,
        skippedItems,
      };
    }

    const batchSize = 1000;
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    const url = `https://apigw.trendyol.com/integration/inventory/sellers/${integrationStore.sellerId}/products/price-and-inventory`;
    const auth = Buffer.from(`${integrationStore.apiKey}:${integrationStore.apiSecret}`).toString('base64');

    let lastBatchRequestId: string | undefined;
    let totalSent = 0;

    for (const batch of batches) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items: batch }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.error(`Trendyol API error: ${response.status} - ${errorText}`);

          if (errorText.includes('15 dakika boyunca aynı isteği')) {
            return {
              success: false,
              message: '15 dakika boyunca aynı isteği tekrarlı olarak atamazsınız. Sadece değişen stok-fiyatları gönderin.',
              sentItems: totalSent,
              skippedItems,
            };
          }

          return {
            success: false,
            message: `Trendyol API hatası: ${response.status} - ${errorText}`,
            sentItems: totalSent,
            skippedItems,
          };
        }

        const result = await response.json();
        lastBatchRequestId = result.batchRequestId;
        totalSent += batch.length;

        this.logger.log(`Trendyol batch sent: ${batch.length} items, batchRequestId: ${lastBatchRequestId}`);
      } catch (error) {
        this.logger.error(`Error sending to Trendyol: ${error.message}`, error);
        return {
          success: false,
          message: `Bağlantı hatası: ${error.message}`,
          sentItems: totalSent,
          skippedItems,
        };
      }
    }

    return {
      success: true,
      message: `${totalSent} ürün başarıyla gönderildi.`,
      batchRequestId: lastBatchRequestId,
      sentItems: totalSent,
      skippedItems,
    };
  }

  async getTrendyolBatchStatus(
    integrationStoreId: string,
    batchRequestId: string,
  ): Promise<{
    success: boolean;
    message: string;
    status?: string;
    failedItems?: Array<{ barcode: string; reason: string }>;
  }> {
    const integrationStore = await this.integrationStoreRepository.findOne({
      where: { id: integrationStoreId },
      relations: ['integration'],
    });

    if (!integrationStore) {
      throw new NotFoundException('Entegrasyon mağazası bulunamadı.');
    }

    if (integrationStore.integration?.type !== IntegrationType.TRENDYOL) {
      throw new BadRequestException('Bu işlem sadece Trendyol entegrasyonları için geçerlidir.');
    }

    const url = `https://apigw.trendyol.com/integration/product/sellers/${integrationStore.sellerId}/products/batch-requests/${batchRequestId}`;
    const auth = Buffer.from(`${integrationStore.apiKey}:${integrationStore.apiSecret}`).toString('base64');

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Trendyol API hatası: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();

      return {
        success: true,
        message: 'Batch durumu alındı.',
        status: result.status,
        failedItems: result.failedItems?.map((item: { barcode: string; failureReasons?: string[] }) => ({
          barcode: item.barcode,
          reason: item.failureReasons?.join(', ') || 'Bilinmeyen hata',
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching batch status: ${error.message}`, error);
      return {
        success: false,
        message: `Bağlantı hatası: ${error.message}`,
      };
    }
  }

  // =============================================
  // HEPSIBURADA METHODS
  // =============================================

  async updateHepsiburadaPriceAndInventory(
    integrationStoreId: string,
    productIds?: string[],
  ): Promise<{
    success: boolean;
    message: string;
    priceUploadId?: string;
    stockUploadId?: string;
    sentItems?: number;
    skippedItems?: number;
  }> {
    const integrationStore = await this.integrationStoreRepository.findOne({
      where: { id: integrationStoreId },
      relations: ['integration', 'store'],
    });

    if (!integrationStore) {
      throw new NotFoundException('Entegrasyon mağazası bulunamadı.');
    }

    if (!integrationStore.isActive) {
      throw new BadRequestException('Bu entegrasyon mağazası aktif değil.');
    }

    if (integrationStore.integration?.type !== IntegrationType.HEPSIBURADA) {
      throw new BadRequestException('Bu işlem sadece Hepsiburada entegrasyonları için geçerlidir.');
    }

    if (!integrationStore.sendStock && !integrationStore.sendPrice) {
      throw new BadRequestException('Bu mağaza için stok ve fiyat gönderimi kapalı.');
    }

    const query = this.productStoreRepository
      .createQueryBuilder('ps')
      .leftJoinAndSelect('ps.product', 'product')
      .leftJoinAndSelect('ps.productIntegrations', 'pi', 'pi.integrationId = :integrationId', {
        integrationId: integrationStore.integrationId,
      })
      .where('ps.storeId = :storeId', { storeId: integrationStore.storeId })
      .andWhere('ps.isActive = :isActive', { isActive: true })
      .andWhere('product.isActive = :productActive', { productActive: true })
      .andWhere('product.barcode IS NOT NULL')
      .andWhere('product.barcode != :emptyBarcode', { emptyBarcode: '' });

    if (productIds && productIds.length > 0) {
      query.andWhere('ps.productId IN (:...productIds)', { productIds });
    }

    const productStores = await query.getMany();

    if (productStores.length === 0) {
      return {
        success: false,
        message: 'Güncellenecek ürün bulunamadı.',
        sentItems: 0,
        skippedItems: 0,
      };
    }

    const priceItems: Array<{
      merchantSku: string;
      price: number;
    }> = [];

    const stockItems: Array<{
      merchantSku: string;
      availableStock: number;
    }> = [];

    let skippedItems = 0;

    for (const ps of productStores) {
      const product = ps.product;
      if (!product?.barcode && !product?.sku && !ps.storeSku) {
        skippedItems++;
        continue;
      }

      const merchantSku = ps.storeSku || product.sku || product.barcode;
      if (!merchantSku) {
        skippedItems++;
        continue;
      }

      const productIntegration = ps.productIntegrations?.find(
        (pi) => pi.integrationId === integrationStore.integrationId && pi.isActive,
      );

      const salePrice =
        productIntegration?.integrationSalePrice ??
        ps.storeSalePrice ??
        product.salePrice;

      const quantity = ps.sellableQuantity ?? 0;

      if (integrationStore.sendPrice && salePrice !== null && salePrice !== undefined) {
        priceItems.push({
          merchantSku,
          price: Number(salePrice),
        });
      }

      if (integrationStore.sendStock) {
        stockItems.push({
          merchantSku,
          availableStock: Math.max(0, quantity),
        });
      }
    }

    if (priceItems.length === 0 && stockItems.length === 0) {
      return {
        success: false,
        message: 'Gönderilecek geçerli ürün bulunamadı.',
        sentItems: 0,
        skippedItems,
      };
    }

    const auth = Buffer.from(`${integrationStore.sellerId}:${integrationStore.apiSecret}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ambar-hub',
    };

    let priceUploadId: string | undefined;
    let stockUploadId: string | undefined;
    let totalSent = 0;

    // Send price updates
    if (priceItems.length > 0 && integrationStore.sendPrice) {
      try {
        const priceUrl = `https://listing-external.hepsiburada.com/listings/merchantid/${integrationStore.sellerId}/price-uploads`;
        
        const response = await fetch(priceUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(priceItems),
        });

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.error(`Hepsiburada Price API error: ${response.status} - ${errorText}`);
          return {
            success: false,
            message: `Hepsiburada Fiyat API hatası: ${response.status} - ${errorText}`,
            sentItems: totalSent,
            skippedItems,
          };
        }

        const result = await response.json();
        priceUploadId = result.id;
        totalSent += priceItems.length;
        this.logger.log(`Hepsiburada price upload sent: ${priceItems.length} items, uploadId: ${priceUploadId}`);
      } catch (error) {
        this.logger.error(`Error sending price to Hepsiburada: ${error.message}`, error);
        return {
          success: false,
          message: `Fiyat gönderiminde bağlantı hatası: ${error.message}`,
          sentItems: totalSent,
          skippedItems,
        };
      }
    }

    // Send stock updates
    if (stockItems.length > 0 && integrationStore.sendStock) {
      try {
        const stockUrl = `https://listing-external.hepsiburada.com/listings/merchantid/${integrationStore.sellerId}/stock-uploads`;
        
        const response = await fetch(stockUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(stockItems),
        });

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.error(`Hepsiburada Stock API error: ${response.status} - ${errorText}`);
          return {
            success: false,
            message: `Hepsiburada Stok API hatası: ${response.status} - ${errorText}`,
            priceUploadId,
            sentItems: totalSent,
            skippedItems,
          };
        }

        const result = await response.json();
        stockUploadId = result.id;
        totalSent += stockItems.length;
        this.logger.log(`Hepsiburada stock upload sent: ${stockItems.length} items, uploadId: ${stockUploadId}`);
      } catch (error) {
        this.logger.error(`Error sending stock to Hepsiburada: ${error.message}`, error);
        return {
          success: false,
          message: `Stok gönderiminde bağlantı hatası: ${error.message}`,
          priceUploadId,
          sentItems: totalSent,
          skippedItems,
        };
      }
    }

    return {
      success: true,
      message: `${totalSent} ürün başarıyla gönderildi.`,
      priceUploadId,
      stockUploadId,
      sentItems: totalSent,
      skippedItems,
    };
  }

  async getHepsiburadaUploadStatus(
    integrationStoreId: string,
    uploadId: string,
    type: 'price' | 'stock',
  ): Promise<{
    success: boolean;
    message: string;
    status?: string;
    errors?: Array<{ sku: string; reason: string }>;
  }> {
    const integrationStore = await this.integrationStoreRepository.findOne({
      where: { id: integrationStoreId },
      relations: ['integration'],
    });

    if (!integrationStore) {
      throw new NotFoundException('Entegrasyon mağazası bulunamadı.');
    }

    if (integrationStore.integration?.type !== IntegrationType.HEPSIBURADA) {
      throw new BadRequestException('Bu işlem sadece Hepsiburada entegrasyonları için geçerlidir.');
    }

    const uploadType = type === 'price' ? 'price-uploads' : 'stock-uploads';
    const url = `https://listing-external.hepsiburada.com/listings/merchantid/${integrationStore.sellerId}/${uploadType}/id/${uploadId}`;
    const auth = Buffer.from(`${integrationStore.sellerId}:${integrationStore.apiSecret}`).toString('base64');

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'User-Agent': 'ambar-hub',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Hepsiburada API hatası: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();

      return {
        success: true,
        message: 'Upload durumu alındı.',
        status: result.status || result.state,
        errors: result.errors?.map((err: { merchantSku?: string; sku?: string; message?: string; reason?: string }) => ({
          sku: err.merchantSku || err.sku || 'Bilinmeyen',
          reason: err.message || err.reason || 'Bilinmeyen hata',
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching Hepsiburada upload status: ${error.message}`, error);
      return {
        success: false,
        message: `Bağlantı hatası: ${error.message}`,
      };
    }
  }

  async packHepsiburadaOrder(
    integrationStoreId: string,
    lineItems: Array<{
      lineItemId: string;
      quantity: number;
    }>,
  ): Promise<{
    success: boolean;
    message: string;
    packageNumber?: string;
  }> {
    const integrationStore = await this.integrationStoreRepository.findOne({
      where: { id: integrationStoreId },
      relations: ['integration'],
    });

    if (!integrationStore) {
      throw new NotFoundException('Entegrasyon mağazası bulunamadı.');
    }

    if (!integrationStore.isActive) {
      throw new BadRequestException('Bu entegrasyon mağazası aktif değil.');
    }

    if (integrationStore.integration?.type !== IntegrationType.HEPSIBURADA) {
      throw new BadRequestException('Bu işlem sadece Hepsiburada entegrasyonları için geçerlidir.');
    }

    if (!integrationStore.sendOrderStatus) {
      throw new BadRequestException('Bu mağaza için sipariş durumu gönderimi kapalı.');
    }

    const url = `https://oms-external.hepsiburada.com/packages/merchantid/${integrationStore.sellerId}`;
    const auth = Buffer.from(`${integrationStore.sellerId}:${integrationStore.apiSecret}`).toString('base64');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'User-Agent': 'ambar-hub',
        },
        body: JSON.stringify({
          lineItems: lineItems.map(item => ({
            lineItemId: item.lineItemId,
            quantity: item.quantity,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Hepsiburada Pack API error: ${response.status} - ${errorText}`);
        return {
          success: false,
          message: `Hepsiburada Paketleme API hatası: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();
      const packageNumber = result.packageNumber || result.id;

      this.logger.log(`Hepsiburada order packed successfully, packageNumber: ${packageNumber}`);

      return {
        success: true,
        message: 'Sipariş başarıyla paketlendi.',
        packageNumber,
      };
    } catch (error) {
      this.logger.error(`Error packing Hepsiburada order: ${error.message}`, error);
      return {
        success: false,
        message: `Bağlantı hatası: ${error.message}`,
      };
    }
  }

  async unpackHepsiburadaOrder(
    integrationStoreId: string,
    packageNumber: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const integrationStore = await this.integrationStoreRepository.findOne({
      where: { id: integrationStoreId },
      relations: ['integration'],
    });

    if (!integrationStore) {
      throw new NotFoundException('Entegrasyon mağazası bulunamadı.');
    }

    if (integrationStore.integration?.type !== IntegrationType.HEPSIBURADA) {
      throw new BadRequestException('Bu işlem sadece Hepsiburada entegrasyonları için geçerlidir.');
    }

    const url = `https://oms-external.hepsiburada.com/packages/merchantid/${integrationStore.sellerId}/packagenumber/${packageNumber}/unpack`;
    const auth = Buffer.from(`${integrationStore.sellerId}:${integrationStore.apiSecret}`).toString('base64');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'User-Agent': 'ambar-hub',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Hepsiburada Unpack API error: ${response.status} - ${errorText}`);
        return {
          success: false,
          message: `Hepsiburada Paket Bozma API hatası: ${response.status} - ${errorText}`,
        };
      }

      this.logger.log(`Hepsiburada package ${packageNumber} unpacked successfully`);

      return {
        success: true,
        message: 'Paket başarıyla bozuldu.',
      };
    } catch (error) {
      this.logger.error(`Error unpacking Hepsiburada order: ${error.message}`, error);
      return {
        success: false,
        message: `Bağlantı hatası: ${error.message}`,
      };
    }
  }

  async getHepsiburadaPackageLabel(
    integrationStoreId: string,
    packageNumber: string,
  ): Promise<{
    success: boolean;
    message: string;
    labelUrl?: string;
    labelData?: string;
  }> {
    const integrationStore = await this.integrationStoreRepository.findOne({
      where: { id: integrationStoreId },
      relations: ['integration'],
    });

    if (!integrationStore) {
      throw new NotFoundException('Entegrasyon mağazası bulunamadı.');
    }

    if (integrationStore.integration?.type !== IntegrationType.HEPSIBURADA) {
      throw new BadRequestException('Bu işlem sadece Hepsiburada entegrasyonları için geçerlidir.');
    }

    const url = `https://oms-external.hepsiburada.com/packages/merchantid/${integrationStore.sellerId}/packagenumber/${packageNumber}/labels`;
    const auth = Buffer.from(`${integrationStore.sellerId}:${integrationStore.apiSecret}`).toString('base64');

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'User-Agent': 'ambar-hub',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Hepsiburada Label API error: ${response.status} - ${errorText}`);
        return {
          success: false,
          message: `Hepsiburada Etiket API hatası: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();

      return {
        success: true,
        message: 'Etiket bilgisi alındı.',
        labelUrl: result.url || result.labelUrl,
        labelData: result.data || result.labelData,
      };
    } catch (error) {
      this.logger.error(`Error fetching Hepsiburada package label: ${error.message}`, error);
      return {
        success: false,
        message: `Bağlantı hatası: ${error.message}`,
      };
    }
  }

  // =============================================
  // IKAS METHODS (GraphQL API)
  // =============================================

  private async getIkasAccessToken(
    storeName: string,
    clientId: string,
    clientSecret: string,
  ): Promise<string | null> {
    const authUrl = `https://${storeName}.myikas.com/api/admin/oauth/token`;

    try {
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        this.logger.error(`ikas auth failed: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data.access_token || null;
    } catch (error) {
      this.logger.error(`Error getting ikas access token: ${error.message}`);
      return null;
    }
  }

  private async executeIkasGraphQL(
    accessToken: string,
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<{ data?: unknown; errors?: Array<{ message: string }> }> {
    const graphQlUrl = 'https://api.myikas.com/api/v1/admin/graphql';

    try {
      const response = await fetch(graphQlUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`ikas GraphQL error: ${response.status} - ${errorText}`);
        return { errors: [{ message: `HTTP ${response.status}: ${errorText}` }] };
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Error executing ikas GraphQL: ${error.message}`);
      return { errors: [{ message: error.message }] };
    }
  }

  async updateIkasPriceAndInventory(
    integrationStoreId: string,
    productIds?: string[],
  ): Promise<{
    success: boolean;
    message: string;
    updatedItems?: number;
    skippedItems?: number;
  }> {
    const integrationStore = await this.integrationStoreRepository.findOne({
      where: { id: integrationStoreId },
      relations: ['integration', 'store'],
    });

    if (!integrationStore) {
      throw new NotFoundException('Entegrasyon mağazası bulunamadı.');
    }

    if (!integrationStore.isActive) {
      throw new BadRequestException('Bu entegrasyon mağazası aktif değil.');
    }

    if (integrationStore.integration?.type !== IntegrationType.IKAS) {
      throw new BadRequestException('Bu işlem sadece ikas entegrasyonları için geçerlidir.');
    }

    if (!integrationStore.sendStock && !integrationStore.sendPrice) {
      throw new BadRequestException('Bu mağaza için stok ve fiyat gönderimi kapalı.');
    }

    const accessToken = await this.getIkasAccessToken(
      integrationStore.sellerId,
      integrationStore.apiKey,
      integrationStore.apiSecret,
    );

    if (!accessToken) {
      return {
        success: false,
        message: 'ikas erişim tokenı alınamadı.',
        updatedItems: 0,
        skippedItems: 0,
      };
    }

    const query = this.productStoreRepository
      .createQueryBuilder('ps')
      .leftJoinAndSelect('ps.product', 'product')
      .leftJoinAndSelect('ps.productIntegrations', 'pi', 'pi.integrationId = :integrationId', {
        integrationId: integrationStore.integrationId,
      })
      .where('ps.storeId = :storeId', { storeId: integrationStore.storeId })
      .andWhere('ps.isActive = :isActive', { isActive: true })
      .andWhere('product.isActive = :productActive', { productActive: true })
      .andWhere('(product.barcode IS NOT NULL OR product.sku IS NOT NULL)');

    if (productIds && productIds.length > 0) {
      query.andWhere('ps.productId IN (:...productIds)', { productIds });
    }

    const productStores = await query.getMany();

    if (productStores.length === 0) {
      return {
        success: false,
        message: 'Güncellenecek ürün bulunamadı.',
        updatedItems: 0,
        skippedItems: 0,
      };
    }

    let updatedItems = 0;
    let skippedItems = 0;

    for (const ps of productStores) {
      const product = ps.product;
      const sku = ps.storeSku || product.sku || product.barcode;

      if (!sku) {
        skippedItems++;
        continue;
      }

      const productIntegration = ps.productIntegrations?.find(
        (pi) => pi.integrationId === integrationStore.integrationId && pi.isActive,
      );

      const salePrice =
        productIntegration?.integrationSalePrice ??
        ps.storeSalePrice ??
        product.salePrice;

      const quantity = ps.sellableQuantity ?? 0;

      try {
        const findProductQuery = `
          query FindProduct($sku: StringFilterInput) {
            listProduct(sku: $sku) {
              data {
                id
                name
                variants {
                  id
                  sku
                  barcodeList
                }
              }
            }
          }
        `;

        const findResult = await this.executeIkasGraphQL(accessToken, findProductQuery, {
          sku: { eq: sku },
        });

        if (findResult.errors || !findResult.data) {
          this.logger.warn(`ikas product not found for SKU: ${sku}`);
          skippedItems++;
          continue;
        }

        const products = (findResult.data as { listProduct: { data: Array<{ id: string; variants: Array<{ id: string; sku: string }> }> } }).listProduct?.data;
        if (!products || products.length === 0) {
          skippedItems++;
          continue;
        }

        const ikasProduct = products[0];
        const ikasVariant = ikasProduct.variants?.find((v: { sku: string }) => v.sku === sku) || ikasProduct.variants?.[0];

        if (!ikasVariant) {
          skippedItems++;
          continue;
        }

        if (integrationStore.sendPrice && salePrice !== null && salePrice !== undefined) {
          const updatePriceQuery = `
            mutation SaveVariantPrices($input: SaveVariantPricesInput!) {
              saveVariantPrices(input: $input)
            }
          `;

          const priceResult = await this.executeIkasGraphQL(accessToken, updatePriceQuery, {
            input: {
              variantPriceInputs: [{
                productId: ikasProduct.id,
                variantId: ikasVariant.id,
                price: {
                  sellPrice: Number(salePrice),
                },
              }],
            },
          });

          if (priceResult.errors) {
            this.logger.warn(`ikas price update failed for ${sku}: ${priceResult.errors[0]?.message}`);
          }
        }

        if (integrationStore.sendStock) {
          const updateStockQuery = `
            mutation SaveProduct($input: ProductInput!) {
              saveProduct(input: $input) {
                id
              }
            }
          `;

          const stockResult = await this.executeIkasGraphQL(accessToken, updateStockQuery, {
            input: {
              id: ikasProduct.id,
              variants: [{
                id: ikasVariant.id,
                stocks: [{
                  quantity: Math.max(0, quantity),
                }],
              }],
            },
          });

          if (stockResult.errors) {
            this.logger.warn(`ikas stock update failed for ${sku}: ${stockResult.errors[0]?.message}`);
          }
        }

        updatedItems++;
        this.logger.log(`ikas updated: ${sku}, price: ${salePrice}, stock: ${quantity}`);
      } catch (error) {
        this.logger.error(`Error updating ikas product ${sku}: ${error.message}`);
        skippedItems++;
      }
    }

    return {
      success: updatedItems > 0,
      message: `${updatedItems} ürün güncellendi, ${skippedItems} ürün atlandı.`,
      updatedItems,
      skippedItems,
    };
  }

  async fulfillIkasOrder(
    integrationStoreId: string,
    orderId: string,
    orderLineItems: Array<{
      orderLineItemId: string;
      quantity: number;
    }>,
    trackingInfo?: {
      barcode?: string;
      cargoCompany?: string;
      trackingNumber?: string;
      trackingLink?: string;
    },
  ): Promise<{
    success: boolean;
    message: string;
    orderPackageId?: string;
  }> {
    const integrationStore = await this.integrationStoreRepository.findOne({
      where: { id: integrationStoreId },
      relations: ['integration'],
    });

    if (!integrationStore) {
      throw new NotFoundException('Entegrasyon mağazası bulunamadı.');
    }

    if (!integrationStore.isActive) {
      throw new BadRequestException('Bu entegrasyon mağazası aktif değil.');
    }

    if (integrationStore.integration?.type !== IntegrationType.IKAS) {
      throw new BadRequestException('Bu işlem sadece ikas entegrasyonları için geçerlidir.');
    }

    if (!integrationStore.sendOrderStatus) {
      throw new BadRequestException('Bu mağaza için sipariş durumu gönderimi kapalı.');
    }

    const accessToken = await this.getIkasAccessToken(
      integrationStore.sellerId,
      integrationStore.apiKey,
      integrationStore.apiSecret,
    );

    if (!accessToken) {
      return {
        success: false,
        message: 'ikas erişim tokenı alınamadı.',
      };
    }

    const mutation = `
      mutation FulfillOrder($input: FulFillOrderInput!) {
        fulfillOrder(input: $input) {
          id
          orderPackages {
            id
            orderPackageNumber
            orderPackageFulfillStatus
          }
        }
      }
    `;

    const input: {
      orderId: string;
      lines: Array<{ orderLineItemId: string; quantity: number }>;
      trackingInfoDetail?: {
        barcode?: string;
        cargoCompany?: string;
        trackingNumber?: string;
        trackingLink?: string;
        isSendNotification?: boolean;
      };
    } = {
      orderId,
      lines: orderLineItems,
    };

    if (trackingInfo) {
      input.trackingInfoDetail = {
        ...trackingInfo,
        isSendNotification: false,
      };
    }

    const result = await this.executeIkasGraphQL(accessToken, mutation, { input });

    if (result.errors) {
      this.logger.error(`ikas fulfillOrder failed: ${result.errors[0]?.message}`);
      return {
        success: false,
        message: `ikas hatası: ${result.errors[0]?.message}`,
      };
    }

    const order = (result.data as { fulfillOrder: { orderPackages: Array<{ id: string }> } }).fulfillOrder;
    const packageId = order?.orderPackages?.[order.orderPackages.length - 1]?.id;

    this.logger.log(`ikas order ${orderId} fulfilled successfully`);

    return {
      success: true,
      message: 'Sipariş başarıyla hazırlandı.',
      orderPackageId: packageId,
    };
  }

  async updateIkasOrderPackageStatus(
    integrationStoreId: string,
    orderId: string,
    packages: Array<{
      packageId: string;
      status: 'READY_FOR_SHIPMENT' | 'SHIPPED' | 'DELIVERED';
      trackingInfo?: {
        barcode?: string;
        cargoCompany?: string;
        trackingNumber?: string;
        trackingLink?: string;
      };
    }>,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const integrationStore = await this.integrationStoreRepository.findOne({
      where: { id: integrationStoreId },
      relations: ['integration'],
    });

    if (!integrationStore) {
      throw new NotFoundException('Entegrasyon mağazası bulunamadı.');
    }

    if (integrationStore.integration?.type !== IntegrationType.IKAS) {
      throw new BadRequestException('Bu işlem sadece ikas entegrasyonları için geçerlidir.');
    }

    if (!integrationStore.sendOrderStatus) {
      throw new BadRequestException('Bu mağaza için sipariş durumu gönderimi kapalı.');
    }

    const accessToken = await this.getIkasAccessToken(
      integrationStore.sellerId,
      integrationStore.apiKey,
      integrationStore.apiSecret,
    );

    if (!accessToken) {
      return {
        success: false,
        message: 'ikas erişim tokenı alınamadı.',
      };
    }

    const mutation = `
      mutation UpdateOrderPackageStatus($input: UpdateOrderPackageStatusInput!) {
        updateOrderPackageStatus(input: $input) {
          id
          orderPackageStatus
          orderPackages {
            id
            orderPackageFulfillStatus
          }
        }
      }
    `;

    const input = {
      orderId,
      packages: packages.map((pkg) => ({
        packageId: pkg.packageId,
        status: pkg.status,
        trackingInfo: pkg.trackingInfo,
      })),
    };

    const result = await this.executeIkasGraphQL(accessToken, mutation, { input });

    if (result.errors) {
      this.logger.error(`ikas updateOrderPackageStatus failed: ${result.errors[0]?.message}`);
      return {
        success: false,
        message: `ikas hatası: ${result.errors[0]?.message}`,
      };
    }

    this.logger.log(`ikas order ${orderId} package status updated`);

    return {
      success: true,
      message: 'Paket durumu başarıyla güncellendi.',
    };
  }

  async addIkasOrderInvoice(
    integrationStoreId: string,
    orderId: string,
    invoiceNumber: string,
    invoicePdfBase64?: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const integrationStore = await this.integrationStoreRepository.findOne({
      where: { id: integrationStoreId },
      relations: ['integration'],
    });

    if (!integrationStore) {
      throw new NotFoundException('Entegrasyon mağazası bulunamadı.');
    }

    if (integrationStore.integration?.type !== IntegrationType.IKAS) {
      throw new BadRequestException('Bu işlem sadece ikas entegrasyonları için geçerlidir.');
    }

    const accessToken = await this.getIkasAccessToken(
      integrationStore.sellerId,
      integrationStore.apiKey,
      integrationStore.apiSecret,
    );

    if (!accessToken) {
      return {
        success: false,
        message: 'ikas erişim tokenı alınamadı.',
      };
    }

    const mutation = `
      mutation AddOrderInvoice($input: AddOrderInvoiceInput!) {
        addOrderInvoice(input: $input) {
          id
          invoices {
            id
            invoiceNumber
          }
        }
      }
    `;

    const input: {
      orderId: string;
      invoiceNumber: string;
      type: string;
      sendNotificationToCustomer: boolean;
      base64?: string;
    } = {
      orderId,
      invoiceNumber,
      type: 'COMPANY',
      sendNotificationToCustomer: false,
    };

    if (invoicePdfBase64) {
      input.base64 = invoicePdfBase64;
    }

    const result = await this.executeIkasGraphQL(accessToken, mutation, { input });

    if (result.errors) {
      this.logger.error(`ikas addOrderInvoice failed: ${result.errors[0]?.message}`);
      return {
        success: false,
        message: `ikas hatası: ${result.errors[0]?.message}`,
      };
    }

    this.logger.log(`ikas order ${orderId} invoice added: ${invoiceNumber}`);

    return {
      success: true,
      message: 'Fatura başarıyla eklendi.',
    };
  }
}
