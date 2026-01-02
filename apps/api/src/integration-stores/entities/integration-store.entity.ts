import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Integration } from '../../integrations/entities/integration.entity';
import { Store } from '../../stores/entities/store.entity';
import { ShippingProvider } from '../../shipping-providers/entities/shipping-provider.entity';

@Entity('integration_stores')
@Unique(['integrationId', 'storeId'])
export class IntegrationStore extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'integration_id', type: 'uuid' })
  integrationId: string;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId: string;

  @Column({ name: 'shipping_provider_id', type: 'uuid', nullable: true })
  shippingProviderId: string;

  // Store-specific credentials
  @Column({ name: 'seller_id', type: 'varchar', length: 255 })
  sellerId: string;

  @Column({ name: 'api_key', type: 'varchar', length: 500 })
  apiKey: string;

  @Column({ name: 'api_secret', type: 'varchar', length: 500 })
  apiSecret: string;

  // Store-specific settings
  @Column({ name: 'crawl_interval_minutes', type: 'int', default: 60 })
  crawlIntervalMinutes: number;

  @Column({ name: 'send_stock', default: true })
  sendStock: boolean;

  @Column({ name: 'send_price', default: true })
  sendPrice: boolean;

  @Column({ name: 'send_order_status', default: true })
  sendOrderStatus: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => Integration, (integration) => integration.integrationStores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'integration_id' })
  integration: Integration;

  @ManyToOne(() => Store, (store) => store.integrationStores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => ShippingProvider, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'shipping_provider_id' })
  shippingProvider: ShippingProvider;
}
