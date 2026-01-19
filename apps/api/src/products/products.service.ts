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
import { BrandsService } from './brands.service';
import { CategoriesService } from './categories.service';
import { ProductType } from './enums/product-type.enum';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductSetItem)
    private readonly productSetItemRepository: Repository<ProductSetItem>,
    private readonly brandsService: BrandsService,
    private readonly categoriesService: CategoriesService,
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
    filters?: { name?: string; isActive?: string; brandId?: string; categoryId?: string },
  ): Promise<PaginationResponse<ProductResponseDto>> {
    const queryBuilder = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.productStores', 'productStores')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.deletedAt IS NULL');

    if (filters?.name) {
      queryBuilder.andWhere('LOWER(product.name) LIKE LOWER(:name)', { name: `%${filters.name}%` });
    }

    if (filters?.isActive !== undefined && filters?.isActive !== '') {
      const isActiveValue = filters.isActive === 'true';
      queryBuilder.andWhere('product.isActive = :isActive', { isActive: isActiveValue });
    }

    if (filters?.brandId) {
      queryBuilder.andWhere('product.brandId = :brandId', { brandId: filters.brandId });
    }

    if (filters?.categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId: filters.categoryId });
    }

    queryBuilder
      .orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

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

  // ─────────────────────────────────────────────────────────────
  // Excel Import
  // ─────────────────────────────────────────────────────────────

  async importExcel(fileBuffer: Buffer): Promise<{ success: number; errors: string[] }> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require('xlsx');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    let successCount = 0;
    const errors: string[] = [];

    // Helper to find/create brand
    const getOrCreateBrand = async (brandName: string): Promise<string | null> => {
      if (!brandName || typeof brandName !== 'string') return null;
      const normalizedName = brandName.trim();
      const allBrands = await this.brandsService.findAll();
      const existing = allBrands.find(
        (b) => b.name.toLowerCase() === normalizedName.toLowerCase(),
      );
      if (existing) return existing.id;
      const newBrand = await this.brandsService.create({ name: normalizedName, isActive: true });
      return newBrand.id;
    };

    // Helper to find/create category hierarchy
    const getOrCreateCategory = async (categoryPath: string): Promise<string | null> => {
      if (!categoryPath || typeof categoryPath !== 'string') return null;
      const parts = categoryPath.split('>').map((s) => s.trim()).filter((s) => s.length > 0);
      if (parts.length === 0) return null;

      let parentId: string | null = null;
      let lastCategoryId: string | null = null;

      for (const part of parts) {
        const siblings = await this.categoriesService.findChildren(parentId);
        let category = siblings.find(c => c.name.toLowerCase() === part.toLowerCase());

        if (!category) {
          category = await this.categoriesService.create({
            name: part,
            parentId: parentId || undefined,
            isActive: true,
          });
        }
        parentId = category.id;
        lastCategoryId = category.id;
      }
      return lastCategoryId;
    };

    for (const [index, row] of data.entries()) {
      try {
        // Expected columns: Name, Brand, Category, Barcode, SKU, Price, Stock
        const name = row['Name'] || row['Ürün Adı'] || row['name'];
        if (!name) {
          errors.push(`Row ${index + 1}: Ürün adı eksik.`);
          continue;
        }

        const brandName = row['Brand'] || row['Marka'] || row['brand'];
        const categoryPath = row['Category'] || row['Kategori'] || row['category'];
        const barcode = row['Barcode'] || row['Barkod'] || row['barcode'];
        const sku = row['SKU'] || row['Stok Kodu'] || row['sku'];
        const price = parseFloat(row['Price'] || row['Fiyat'] || row['price'] || '0');
        const vatRate = parseInt(row['VAT'] || row['KDV'] || row['vatRate'] || '20', 10);

        const brandId = await getOrCreateBrand(brandName);
        const categoryId = await getOrCreateCategory(categoryPath);

        // Check if product exists by Barcode or SKU
        let existingProduct: Product | null = null;
        if (barcode) {
          existingProduct = await this.productRepository.findOne({ where: { barcode }, relations: ['productStores'] });
        }
        if (!existingProduct && sku) {
          existingProduct = await this.productRepository.findOne({ where: { sku }, relations: ['productStores'] });
        }

        if (existingProduct) {
          // Update existing
          await this.update(existingProduct.id, {
            name,
            brandId: brandId || undefined,
            categoryId: categoryId || undefined,
            salePrice: price,
            vatRate,
          });
        } else {
          // Create new
          await this.create({
            name,
            brandId: brandId || undefined,
            categoryId: categoryId || undefined,
            barcode,
            sku,
            salePrice: price,
            vatRate,
            isActive: true,
            productType: ProductType.SIMPLE,
          });
        }

        successCount++;
      } catch (err: any) {
        errors.push(`Row ${index + 1}: Error - ${err.message}`);
      }
    }

    return { success: successCount, errors };
  }

  async generateExcelTemplate(): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require('xlsx');

    const headers = [
      'Ürün Adı',
      'Marka',
      'Kategori',
      'Barkod',
      'Stok Kodu',
      'Fiyat',
      'KDV',
      'Stok'
    ];

    const data = [
      {
        'Ürün Adı': 'Örnek Tişört',
        'Marka': 'Nike',
        'Kategori': 'Giyim > Erkek > Tişört',
        'Barkod': '8690000000001',
        'Stok Kodu': 'NKE-TSHIRT-001',
        'Fiyat': 599.90,
        'KDV': 20,
        'Stok': 100
      },
      {
        'Ürün Adı': 'Örnek Telefon',
        'Marka': 'Apple',
        'Kategori': 'Elektronik > Telefon',
        'Barkod': '8690000000002',
        'Stok Kodu': 'APL-IPHONE-15',
        'Fiyat': 59999.00,
        'KDV': 20,
        'Stok': 50
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ürün Şablonu');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

