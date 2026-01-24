import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store, StoreType } from './entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoreFilterDto } from './dto/store-filter.dto';
import { PaginationResponse } from '../common/interfaces/api-response.interface';
import { StoreResponseDto } from './dto/store-response.dto';
import { WarehousesService } from '../warehouses/warehouses.service';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(ProductStore)
    private readonly productStoreRepository: Repository<ProductStore>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly warehousesService: WarehousesService,
  ) {}

  async create(createStoreDto: CreateStoreDto): Promise<StoreResponseDto> {
    await this.ensureWarehouseExists(createStoreDto.warehouseId);

    const store = this.storeRepository.create(createStoreDto);
    const savedStore = await this.storeRepository.save(store);
    return StoreResponseDto.fromEntity(savedStore);
  }

  async findAll(
    filterDto: StoreFilterDto,
  ): Promise<PaginationResponse<StoreResponseDto>> {
    const { page, limit, sortBy, sortOrder, type } = filterDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.storeRepository.createQueryBuilder('store')
      .leftJoinAndSelect('store.warehouse', 'warehouse')
      .leftJoinAndSelect('store.shippingProvider', 'shippingProvider');

    if (type) {
      queryBuilder.andWhere('store.type = :type', { type });
    }

    if (sortBy) {
      queryBuilder.orderBy(`store.${sortBy}`, sortOrder);
    } else {
      queryBuilder.orderBy('store.createdAt', 'DESC');
    }

    const [stores, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      success: true,
      data: stores.map(StoreResponseDto.fromEntity),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<StoreResponseDto> {
    const store = await this.storeRepository.findOne({
      where: { id },
      relations: ['warehouse', 'shippingProvider'],
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return StoreResponseDto.fromEntity(store);
  }

  async findEntity(id: string): Promise<Store> {
    const store = await this.storeRepository.findOne({
      where: { id },
      relations: ['warehouse', 'shippingProvider'],
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  async findByType(type: StoreType): Promise<Store[]> {
    return this.storeRepository.find({
      where: { type, isActive: true },
      relations: ['warehouse', 'shippingProvider'],
    });
  }

  async findActiveByBrand(brandName: string): Promise<Store[]> {
    return this.storeRepository.find({
      where: { brandName, isActive: true },
      relations: ['warehouse', 'shippingProvider'],
    });
  }

  async update(
    id: string,
    updateStoreDto: UpdateStoreDto,
  ): Promise<StoreResponseDto> {
    const store = await this.storeRepository.findOne({
      where: { id },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (updateStoreDto.warehouseId) {
      await this.ensureWarehouseExists(updateStoreDto.warehouseId);
    }

    Object.assign(store, updateStoreDto);
    const updatedStore = await this.storeRepository.save(store);
    return StoreResponseDto.fromEntity(updatedStore);
  }

  async remove(id: string): Promise<void> {
    const store = await this.storeRepository.findOne({
      where: { id },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    await this.storeRepository.softDelete(id);
  }

  private async ensureWarehouseExists(warehouseId: string): Promise<void> {
    try {
      await this.warehousesService.findOne(warehouseId);
    } catch {
      throw new BadRequestException('Warehouse not found');
    }
  }

  // =============================================
  // TRENDYOL API METHODS
  // =============================================

  async updateTrendyolPriceAndInventory(
    storeId: string,
    productIds?: string[],
  ): Promise<{
    success: boolean;
    message: string;
    batchRequestId?: string;
    sentItems?: number;
    skippedItems?: number;
  }> {
    const store = await this.findEntity(storeId);

    if (store.type !== StoreType.TRENDYOL) {
      throw new BadRequestException('Bu işlem sadece Trendyol mağazaları için geçerlidir.');
    }

    if (!store.isActive) {
      throw new BadRequestException('Bu mağaza aktif değil.');
    }

    if (!store.sendStock && !store.sendPrice) {
      throw new BadRequestException('Bu mağaza için stok ve fiyat gönderimi kapalı.');
    }

    const query = this.productStoreRepository
      .createQueryBuilder('ps')
      .leftJoinAndSelect('ps.product', 'product')
      .where('ps.storeId = :storeId', { storeId })
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

      const salePrice = ps.storeSalePrice ?? product.salePrice;
      const listPrice = salePrice;
      const quantity = ps.sellableQuantity ?? 0;

      const item: {
        barcode: string;
        quantity?: number;
        salePrice?: number;
        listPrice?: number;
      } = {
        barcode: product.barcode,
      };

      if (store.sendStock) {
        item.quantity = Math.max(0, Math.min(quantity, 20000));
      }

      if (store.sendPrice && salePrice !== null && salePrice !== undefined) {
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

    const url = `https://apigw.trendyol.com/integration/inventory/sellers/${store.sellerId}/products/price-and-inventory`;
    const auth = Buffer.from(`${store.apiKey}:${store.apiSecret}`).toString('base64');

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
              message: '15 dakika boyunca aynı isteği tekrarlı olarak atamazsınız.',
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
    storeId: string,
    batchRequestId: string,
  ): Promise<{
    success: boolean;
    message: string;
    status?: string;
    failedItems?: Array<{ barcode: string; reason: string }>;
  }> {
    const store = await this.findEntity(storeId);

    if (store.type !== StoreType.TRENDYOL) {
      throw new BadRequestException('Bu işlem sadece Trendyol mağazaları için geçerlidir.');
    }

    const url = `https://apigw.trendyol.com/integration/product/sellers/${store.sellerId}/products/batch-requests/${batchRequestId}`;
    const auth = Buffer.from(`${store.apiKey}:${store.apiSecret}`).toString('base64');

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
  // HEPSIBURADA API METHODS
  // =============================================

  async updateHepsiburadaPriceAndInventory(
    storeId: string,
    productIds?: string[],
  ): Promise<{
    success: boolean;
    message: string;
    priceUploadId?: string;
    stockUploadId?: string;
    sentItems?: number;
    skippedItems?: number;
  }> {
    const store = await this.findEntity(storeId);

    if (store.type !== StoreType.HEPSIBURADA) {
      throw new BadRequestException('Bu işlem sadece Hepsiburada mağazaları için geçerlidir.');
    }

    if (!store.isActive) {
      throw new BadRequestException('Bu mağaza aktif değil.');
    }

    if (!store.sendStock && !store.sendPrice) {
      throw new BadRequestException('Bu mağaza için stok ve fiyat gönderimi kapalı.');
    }

    const query = this.productStoreRepository
      .createQueryBuilder('ps')
      .leftJoinAndSelect('ps.product', 'product')
      .where('ps.storeId = :storeId', { storeId })
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

    const priceItems: Array<{ merchantSku: string; price: number }> = [];
    const stockItems: Array<{ merchantSku: string; availableStock: number }> = [];
    let skippedItems = 0;

    for (const ps of productStores) {
      const product = ps.product;
      const merchantSku = ps.storeSku || product.sku || product.barcode;
      
      if (!merchantSku) {
        skippedItems++;
        continue;
      }

      const salePrice = ps.storeSalePrice ?? product.salePrice;
      const quantity = ps.sellableQuantity ?? 0;

      if (store.sendPrice && salePrice !== null && salePrice !== undefined) {
        priceItems.push({ merchantSku, price: Number(salePrice) });
      }

      if (store.sendStock) {
        stockItems.push({ merchantSku, availableStock: Math.max(0, quantity) });
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

    const auth = Buffer.from(`${store.sellerId}:${store.apiSecret}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ambar-hub',
    };

    let priceUploadId: string | undefined;
    let stockUploadId: string | undefined;
    let totalSent = 0;

    if (priceItems.length > 0 && store.sendPrice) {
      try {
        const priceUrl = `https://listing-external.hepsiburada.com/listings/merchantid/${store.sellerId}/price-uploads`;
        
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
        this.logger.log(`Hepsiburada price upload sent: ${priceItems.length} items`);
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

    if (stockItems.length > 0 && store.sendStock) {
      try {
        const stockUrl = `https://listing-external.hepsiburada.com/listings/merchantid/${store.sellerId}/stock-uploads`;
        
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
        this.logger.log(`Hepsiburada stock upload sent: ${stockItems.length} items`);
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

  // =============================================
  // IKAS API METHODS
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
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

  async fulfillIkasOrder(
    storeId: string,
    orderId: string,
    orderLineItems: Array<{ orderLineItemId: string; quantity: number }>,
    trackingInfo?: {
      barcode?: string;
      cargoCompany?: string;
      trackingNumber?: string;
      trackingLink?: string;
    },
  ): Promise<{ success: boolean; message: string; orderPackageId?: string }> {
    const store = await this.findEntity(storeId);

    if (store.type !== StoreType.IKAS) {
      throw new BadRequestException('Bu işlem sadece ikas mağazaları için geçerlidir.');
    }

    if (!store.isActive) {
      throw new BadRequestException('Bu mağaza aktif değil.');
    }

    if (!store.sendOrderStatus) {
      throw new BadRequestException('Bu mağaza için sipariş durumu gönderimi kapalı.');
    }

    const accessToken = await this.getIkasAccessToken(
      store.sellerId,
      store.apiKey,
      store.apiSecret,
    );

    if (!accessToken) {
      return { success: false, message: 'ikas erişim tokenı alınamadı.' };
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
    } = { orderId, lines: orderLineItems };

    if (trackingInfo) {
      input.trackingInfoDetail = { ...trackingInfo, isSendNotification: false };
    }

    const result = await this.executeIkasGraphQL(accessToken, mutation, { input });

    if (result.errors) {
      this.logger.error(`ikas fulfillOrder failed: ${result.errors[0]?.message}`);
      return { success: false, message: `ikas hatası: ${result.errors[0]?.message}` };
    }

    const order = (result.data as { fulfillOrder: { orderPackages: Array<{ id: string }> } }).fulfillOrder;
    const packageId = order?.orderPackages?.[order.orderPackages.length - 1]?.id;

    this.logger.log(`ikas order ${orderId} fulfilled successfully`);

    return { success: true, message: 'Sipariş başarıyla hazırlandı.', orderPackageId: packageId };
  }
}
