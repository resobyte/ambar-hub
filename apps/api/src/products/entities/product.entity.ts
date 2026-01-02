import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ProductStore } from '../../product-stores/entities/product-store.entity';

@Entity('products')
export class Product extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  brand: string;

  @Column({ type: 'varchar', length: 255 })
  category: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  barcode: string;

  @Column({ type: 'varchar', length: 255, name: 'sku' })
  sku: string;

  @Column({ type: 'int', name: 'vat_rate', default: 20 })
  vatRate: number;

  @Column({ type: 'int', nullable: true })
  desi: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'purchase_price', default: 0 })
  purchasePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'sale_price', default: 0 })
  salePrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'last_sale_price', nullable: true })
  lastSalePrice: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => ProductStore, (ps) => ps.product, { cascade: true })
  productStores: ProductStore[];
}
