import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductSetItem } from './entities/product-set-item.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { PaginationResponse } from '../common/interfaces/api-response.interface';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductSetItem)
    private readonly productSetItemRepository: Repository<ProductSetItem>,
  ) { }

  async create(
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const product = this.productRepository.create(createProductDto);
    const saved = await this.productRepository.save(product);
    return ProductResponseDto.fromEntity(saved, 0);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginationResponse<ProductResponseDto>> {
    const [products, total] = await this.productRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['productStores'],
    });

    const data = products.map((product) =>
      ProductResponseDto.fromEntity(product, product.productStores?.length || 0),
    );

    return {
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['productStores'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return ProductResponseDto.fromEntity(product, product.productStores?.length || 0);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['productStores'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    Object.assign(product, updateProductDto);
    const updated = await this.productRepository.save(product);
    return ProductResponseDto.fromEntity(updated, updated.productStores?.length || 0);
  }

  async remove(id: string): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.productRepository.softDelete(id);
  }

  // ─────────────────────────────────────────────────────────────
  // ProductSetItem Methods
  // ─────────────────────────────────────────────────────────────

  async getSetItems(setProductId: string): Promise<ProductSetItem[]> {
    return this.productSetItemRepository.find({
      where: { setProductId },
      relations: ['componentProduct'],
      order: { sortOrder: 'ASC' },
    });
  }

  async addSetItem(data: {
    setProductId: string;
    componentProductId: string;
    quantity?: number;
    priceShare?: number;
    sortOrder?: number;
  }): Promise<ProductSetItem> {
    const setItem = this.productSetItemRepository.create({
      setProductId: data.setProductId,
      componentProductId: data.componentProductId,
      quantity: data.quantity || 1,
      priceShare: data.priceShare || 0,
      sortOrder: data.sortOrder || 0,
    });
    return this.productSetItemRepository.save(setItem);
  }

  async updateSetItem(id: string, data: {
    quantity?: number;
    priceShare?: number;
    sortOrder?: number;
  }): Promise<ProductSetItem> {
    const setItem = await this.productSetItemRepository.findOne({ where: { id } });
    if (!setItem) {
      throw new NotFoundException('Set item not found');
    }
    Object.assign(setItem, data);
    return this.productSetItemRepository.save(setItem);
  }

  async removeSetItem(id: string): Promise<void> {
    const setItem = await this.productSetItemRepository.findOne({ where: { id } });
    if (!setItem) {
      throw new NotFoundException('Set item not found');
    }
    await this.productSetItemRepository.delete(id);
  }

  async updateSetItems(setProductId: string, items: {
    componentProductId: string;
    quantity: number;
    priceShare: number;
    sortOrder: number;
  }[]): Promise<ProductSetItem[]> {
    // Delete existing items
    await this.productSetItemRepository.delete({ setProductId });

    // Create new items
    const newItems = items.map((item, index) =>
      this.productSetItemRepository.create({
        setProductId,
        componentProductId: item.componentProductId,
        quantity: item.quantity,
        priceShare: item.priceShare,
        sortOrder: item.sortOrder ?? index,
      })
    );

    return this.productSetItemRepository.save(newItems);
  }
}

