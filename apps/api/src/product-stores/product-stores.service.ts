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
      throw new ConflictException('Product-Store pair already exists');
    }

    const productStore = this.productStoreRepository.create(createProductStoreDto);
    const saved = await this.productStoreRepository.save(productStore);
    return ProductStoreResponseDto.fromEntity(saved);
  }

  async findAll(productId?: string): Promise<ProductStoreResponseDto[]> {
    const queryBuilder = this.productStoreRepository
      .createQueryBuilder('ps')
      .leftJoinAndSelect('ps.store', 'store');

    if (productId) {
      queryBuilder.where('ps.productId = :productId', { productId });
    }

    const results = await queryBuilder.getMany();

    return results.map((result) =>
      ProductStoreResponseDto.fromEntity(result, result.store?.name),
    );
  }

  async findOne(id: string): Promise<ProductStoreResponseDto> {
    const productStore = await this.productStoreRepository.findOne({
      where: { id },
      relations: ['store'],
    });

    if (!productStore) {
      throw new NotFoundException('ProductStore not found');
    }

    return ProductStoreResponseDto.fromEntity(
      productStore,
      productStore.store?.name,
    );
  }

  async update(
    id: string,
    updateProductStoreDto: UpdateProductStoreDto,
  ): Promise<ProductStoreResponseDto> {
    const productStore = await this.productStoreRepository.findOne({
      where: { id },
    });

    if (!productStore) {
      throw new NotFoundException('ProductStore not found');
    }

    Object.assign(productStore, updateProductStoreDto);
    const updated = await this.productStoreRepository.save(productStore);
    return ProductStoreResponseDto.fromEntity(updated);
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
}
