import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductStore } from './entities/product-store.entity';
import { CreateProductStoreDto } from './dto/create-product-store.dto';
import { UpdateProductStoreDto } from './dto/update-product-store.dto';
import { ProductStoreResponseDto } from './dto/product-store-response.dto';

interface FindAllOptions {
  productId?: string;
  storeId?: string;
  page?: number;
  limit?: number;
  search?: string;
}

@Injectable()
export class ProductStoresService {
  constructor(
    @InjectRepository(ProductStore)
    private readonly productStoreRepository: Repository<ProductStore>,
  ) {}

  async create(
    createProductStoreDto: CreateProductStoreDto,
  ): Promise<ProductStoreResponseDto> {
    const existing = await this.productStoreRepository.findOne({
      where: {
        productId: createProductStoreDto.productId,
        storeId: createProductStoreDto.storeId,
      },
    });

    if (existing) {
      throw new ConflictException('Bu ürün zaten bu mağazaya bağlı');
    }

    const productStore = this.productStoreRepository.create(createProductStoreDto);
    const saved = await this.productStoreRepository.save(productStore);
    
    const result = await this.productStoreRepository.findOne({
      where: { id: saved.id },
      relations: ['product', 'store'],
    });
    
    return ProductStoreResponseDto.fromEntity(result!);
  }

  async findAll(options: FindAllOptions = {}) {
    const { productId, storeId, page = 1, limit = 20, search } = options;
    
    const queryBuilder = this.productStoreRepository
      .createQueryBuilder('ps')
      .leftJoinAndSelect('ps.product', 'product')
      .leftJoinAndSelect('ps.store', 'store');

    if (productId) {
      queryBuilder.andWhere('ps.productId = :productId', { productId });
    }

    if (storeId) {
      queryBuilder.andWhere('ps.storeId = :storeId', { storeId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(product.name LIKE :search OR product.barcode LIKE :search OR ps.storeBarcode LIKE :search OR ps.storeSku LIKE :search)',
        { search: `%${search}%` }
      );
    }

    queryBuilder.orderBy('product.name', 'ASC');

    const total = await queryBuilder.getCount();
    
    queryBuilder
      .skip((page - 1) * limit)
      .take(limit);

    const results = await queryBuilder.getMany();

    return {
      data: results.map((result) => ProductStoreResponseDto.fromEntity(result)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<ProductStoreResponseDto> {
    const productStore = await this.productStoreRepository.findOne({
      where: { id },
      relations: ['product', 'store'],
    });

    if (!productStore) {
      throw new NotFoundException('ProductStore not found');
    }

    return ProductStoreResponseDto.fromEntity(productStore);
  }

  async update(
    id: string,
    updateProductStoreDto: UpdateProductStoreDto,
  ): Promise<ProductStoreResponseDto> {
    const productStore = await this.productStoreRepository.findOne({
      where: { id },
      relations: ['product', 'store'],
    });

    if (!productStore) {
      throw new NotFoundException('ProductStore not found');
    }

    Object.assign(productStore, updateProductStoreDto);
    const updated = await this.productStoreRepository.save(productStore);
    
    const result = await this.productStoreRepository.findOne({
      where: { id: updated.id },
      relations: ['product', 'store'],
    });
    
    return ProductStoreResponseDto.fromEntity(result!);
  }

  async remove(id: string): Promise<void> {
    const productStore = await this.productStoreRepository.findOne({
      where: { id },
    });

    if (!productStore) {
      throw new NotFoundException('ProductStore not found');
    }

    await this.productStoreRepository.softDelete(id);
  }

  async findByStoreBarcode(storeId: string, barcode: string): Promise<ProductStore | null> {
    return this.productStoreRepository.findOne({
      where: { storeId, storeBarcode: barcode },
      relations: ['product'],
    });
  }

  async bulkUpsert(storeId: string, items: Array<{
    productId: string;
    storeBarcode?: string;
    storeSku?: string;
    storeSalePrice?: number;
    isActive?: boolean;
  }>): Promise<{ created: number; updated: number; errors: string[] }> {
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        const existing = await this.productStoreRepository.findOne({
          where: { productId: item.productId, storeId },
        });

        if (existing) {
          // Update
          if (item.storeBarcode !== undefined) existing.storeBarcode = item.storeBarcode || null;
          if (item.storeSku !== undefined) existing.storeSku = item.storeSku || null;
          if (item.storeSalePrice !== undefined) existing.storeSalePrice = item.storeSalePrice;
          if (item.isActive !== undefined) existing.isActive = item.isActive;
          await this.productStoreRepository.save(existing);
          updated++;
        } else {
          // Create
          const newPs = new ProductStore();
          newPs.productId = item.productId;
          newPs.storeId = storeId;
          newPs.storeBarcode = item.storeBarcode || null;
          newPs.storeSku = item.storeSku || null;
          newPs.storeSalePrice = item.storeSalePrice ?? null;
          newPs.isActive = item.isActive ?? true;
          newPs.stockQuantity = 0;
          newPs.sellableQuantity = 0;
          newPs.reservableQuantity = 0;
          newPs.committedQuantity = 0;
          await this.productStoreRepository.save(newPs);
          created++;
        }
      } catch (err) {
        errors.push(`Ürün ${item.productId}: ${err instanceof Error ? err.message : 'Hata'}`);
      }
    }

    return { created, updated, errors };
  }
}
