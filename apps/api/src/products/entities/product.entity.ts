import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ProductStore } from '../../product-stores/entities/product-store.entity';
import { ProductType } from '../enums/product-type.enum';
import { Brand } from './brand.entity';
import { Category } from './category.entity';

@Entity('products')
export class Product extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'brand_id', nullable: true })
  brandId: string | null;

  @ManyToOne(() => Brand, { nullable: true, eager: true })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => Category, { eager: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  barcode: string;

  @Column({ type: 'varchar', length: 255, name: 'sku' })
  sku: string;

  // Product type: SIMPLE or SET
  @Column({
    type: 'enum',
    enum: ProductType,
    default: ProductType.SIMPLE,
    name: 'product_type',
  })
  productType: ProductType;

  @Column({ type: 'int', name: 'vat_rate', default: 20 })
  vatRate: number;

  @Column({ type: 'int', nullable: true })
  desi: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'purchase_price', default: 0 })
  purchasePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'sale_price', default: 0 })
  salePrice: number;

  // Set price (only used for SET type products)
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'set_price', nullable: true })
  setPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'last_sale_price', nullable: true })
  lastSalePrice: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => ProductStore, (ps) => ps.product, { cascade: true })
  productStores: ProductStore[];
}

