import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ProductStore } from '../../product-stores/entities/product-store.entity';
import { Integration } from '../../integrations/entities/integration.entity';

/**
 * ProductIntegration Entity
 *
 * PRICING HIERARCHY (Final sale price resolution priority):
 * 1. ProductIntegration.integrationSalePrice (highest priority)
 * 2. ProductStore.storeSalePrice
 * 3. Product.salePrice (fallback)
 *
 * This entity allows integration-specific price overrides for products
 * that are already assigned to stores via ProductStore.
 */
@Entity('product_integrations')
@Unique(['productStoreId', 'integrationId'])
export class ProductIntegration extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_store_id', type: 'uuid' })
  productStoreId: string;

  @Column({ name: 'integration_id', type: 'uuid' })
  integrationId: string;

  /**
   * Integration-specific sale price override.
   * If set, this takes priority over ProductStore.storeSalePrice and Product.salePrice.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'integration_sale_price', nullable: true })
  integrationSalePrice: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => ProductStore, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_store_id' })
  productStore: ProductStore;

  @ManyToOne(() => Integration, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'integration_id' })
  integration: Integration;
}
