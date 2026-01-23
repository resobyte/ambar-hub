import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductIntegration } from './entities/product-integration.entity';
import { Product } from '../products/entities/product.entity';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { CreateProductIntegrationDto } from './dto/create-product-integration.dto';
import { UpdateProductIntegrationDto } from './dto/update-product-integration.dto';
import { ProductIntegrationResponseDto } from './dto/product-integration-response.dto';

/**
 * ProductIntegrationsService
 *
 * PRICING HIERARCHY (Final sale price resolution priority):
 * 1. ProductIntegration.integrationSalePrice (highest priority)
 * 2. ProductStore.storeSalePrice
 * 3. Product.salePrice (fallback)
 *
 * This service provides helper methods for resolving the final sale price
 * based on the product, store, and optionally integration context.
 */
@Injectable()
export class ProductIntegrationsService {
  constructor(
    @InjectRepository(ProductIntegration)
    private readonly productIntegrationRepository: Repository<ProductIntegration>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductStore)
    private readonly productStoreRepository: Repository<ProductStore>,
  ) {}

  /**
   * Resolve the final sale price for a product based on pricing hierarchy.
   *
   * PRICING HIERARCHY:
   * 1. ProductIntegration.integrationSalePrice (if integrationId provided and exists)
   * 2. ProductStore.storeSalePrice (if storeId provided and exists)
   * 3. Product.salePrice (fallback)
   *
   * @param productId - The product ID
   * @param storeId - The store ID (optional, if not provided skips to Product.salePrice)
   * @param integrationId - The integration ID (optional, requires storeId)
   * @returns The resolved sale price or null if product not found
   */
  async resolveFinalSalePrice(
    productId: string,
    storeId?: string,
    integrationId?: string,
  ): Promise<number | null> {
    // Get the base product
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      return null;
    }

    // If no storeId provided, return product sale price
    if (!storeId) {
      return product.salePrice;
    }

    // If integrationId is provided, check for integration-specific price
    if (integrationId) {
      // Find the ProductStore for this product+store combination
      const productStore = await this.productStoreRepository.findOne({
        where: { productId, storeId },
      });

      if (!productStore) {
        // No ProductStore exists, fall back to product sale price
        return product.salePrice;
      }

      // Check for ProductIntegration with integration-specific price
      const productIntegration = await this.productIntegrationRepository.findOne({
        where: {
          productStoreId: productStore.id,
          integrationId,
          isActive: true,
        },
      });

      // Priority 1: Integration-specific price (if set and active)
      if (productIntegration && productIntegration.integrationSalePrice !== null) {
        return productIntegration.integrationSalePrice;
      }

      // Priority 2: Store-specific price (if set)
      if (productStore.storeSalePrice !== null) {
        return productStore.storeSalePrice;
      }

      // Priority 3: Product sale price (fallback)
      return product.salePrice;
    }

    // No integrationId but storeId provided, check store-specific price
    const productStore = await this.productStoreRepository.findOne({
      where: { productId, storeId },
    });

    if (productStore && productStore.storeSalePrice !== null) {
      return productStore.storeSalePrice;
    }

    // Fallback to product sale price
    return product.salePrice;
  }

  /**
   * Find all product integrations for a specific product store.
   */
  async findByProductStore(productStoreId: string): Promise<ProductIntegration[]> {
    return this.productIntegrationRepository.find({
      where: { productStoreId },
      relations: ['integration'],
    });
  }

  /**
   * Find all product integrations for a specific integration.
   */
  async findByIntegration(integrationId: string): Promise<ProductIntegration[]> {
    return this.productIntegrationRepository.find({
      where: { integrationId },
      relations: ['productStore'],
    });
  }

  /**
   * Find a specific product integration by product store and integration.
   */
  async findOne(productStoreId: string, integrationId: string): Promise<ProductIntegration | null> {
    return this.productIntegrationRepository.findOne({
      where: { productStoreId, integrationId },
      relations: ['integration'],
    });
  }

  /**
   * Create a new product integration.
   */
  async create(
    createProductIntegrationDto: CreateProductIntegrationDto,
  ): Promise<ProductIntegrationResponseDto> {
    // Check if ProductStore exists
    const productStore = await this.productStoreRepository.findOne({
      where: { id: createProductIntegrationDto.productStoreId },
    });
    if (!productStore) {
      throw new NotFoundException('ProductStore not found');
    }

    // Check for duplicate
    const existing = await this.productIntegrationRepository.findOne({
      where: {
        productStoreId: createProductIntegrationDto.productStoreId,
        integrationId: createProductIntegrationDto.integrationId,
      },
    });
    if (existing) {
      throw new ConflictException('ProductIntegration already exists for this store and integration');
    }

    const productIntegration = this.productIntegrationRepository.create({
      ...createProductIntegrationDto,
      isActive: createProductIntegrationDto.isActive ?? true,
    });
    const saved = await this.productIntegrationRepository.save(productIntegration);

    // Fetch integration details for response
    const withIntegration = await this.productIntegrationRepository.findOne({
      where: { id: saved.id },
      relations: ['integration'],
    });

    return ProductIntegrationResponseDto.fromEntity(
      saved,
      withIntegration?.integration?.name,
      withIntegration?.integration?.type,
    );
  }

  /**
   * Update an existing product integration.
   */
  async update(
    id: string,
    updateProductIntegrationDto: UpdateProductIntegrationDto,
  ): Promise<ProductIntegrationResponseDto> {
    const productIntegration = await this.productIntegrationRepository.findOne({
      where: { id },
    });
    if (!productIntegration) {
      throw new NotFoundException('ProductIntegration not found');
    }

    Object.assign(productIntegration, updateProductIntegrationDto);
    const updated = await this.productIntegrationRepository.save(productIntegration);

    // Fetch integration details for response
    const withIntegration = await this.productIntegrationRepository.findOne({
      where: { id: updated.id },
      relations: ['integration'],
    });

    return ProductIntegrationResponseDto.fromEntity(
      updated,
      withIntegration?.integration?.name,
      withIntegration?.integration?.type,
    );
  }

  /**
   * Delete a product integration.
   */
  async remove(id: string): Promise<void> {
    const productIntegration = await this.productIntegrationRepository.findOne({
      where: { id },
    });
    if (!productIntegration) {
      throw new NotFoundException('ProductIntegration not found');
    }

    await this.productIntegrationRepository.softDelete(id);
  }

  /**
   * Find all product integrations with optional filtering.
   */
  async findAll(productStoreId?: string, integrationId?: string): Promise<ProductIntegrationResponseDto[]> {
    const where: any = {};
    if (productStoreId) where.productStoreId = productStoreId;
    if (integrationId) where.integrationId = integrationId;

    const integrations = await this.productIntegrationRepository.find({
      where,
      relations: ['integration', 'productStore', 'productStore.product', 'productStore.store'],
    });

    return integrations.map(pi => {
      const product = pi.productStore?.product;
      const store = pi.productStore?.store;

      return ProductIntegrationResponseDto.fromEntity(
        pi,
        pi.integration?.name,
        pi.integration?.type,
        product ? {
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          salePrice: Number(product.salePrice),
        } : undefined,
        store ? {
          id: store.id,
          name: store.name,
          storeSalePrice: pi.productStore?.storeSalePrice ? Number(pi.productStore.storeSalePrice) : null,
        } : undefined,
      );
    });
  }
}
