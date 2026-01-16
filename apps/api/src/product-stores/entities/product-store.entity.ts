import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Product } from '../../products/entities/product.entity';
import { Store } from '../../stores/entities/store.entity';
import { ProductIntegration } from '../../product-integrations/entities/product-integration.entity';

@Entity('product_stores')
@Unique(['productId', 'storeId'])
export class ProductStore extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId!: string;

  @Column({ name: 'store_sku', type: 'varchar', length: 255, nullable: true })
  storeSku!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'store_sale_price', nullable: true })
  storeSalePrice!: number;

  @Column({ type: 'int', name: 'stock_quantity', default: 0 })
  stockQuantity!: number;

  // Stock available for sale (e.g. in Normal shelves)
  @Column({ type: 'int', name: 'sellable_quantity', default: 0 })
  sellableQuantity!: number;

  // Stock available for reservation (e.g. in Receiving shelves)
  @Column({ type: 'int', name: 'reservable_quantity', default: 0 })
  reservableQuantity!: number;

  @Column({ type: 'int', name: 'committed_quantity', default: 0 })
  committedQuantity!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @ManyToOne(() => Product, (product) => product.productStores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @ManyToOne(() => Store, (store) => store.productStores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @OneToMany(() => ProductIntegration, (pi) => pi.productStore, {
    onDelete: 'CASCADE',
  })
  productIntegrations!: ProductIntegration[];
}
