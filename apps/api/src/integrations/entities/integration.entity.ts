import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { IntegrationStore } from '../../integration-stores/entities/integration-store.entity';
import { ProductIntegration } from '../../product-integrations/entities/product-integration.entity';

export enum IntegrationType {
  TRENDYOL = 'TRENDYOL',
  HEPSIBURADA = 'HEPSIBURADA',
  IKAS = 'IKAS',
}

@Entity('integrations')
export class Integration extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: IntegrationType,
  })
  type: IntegrationType;

  @Column({ name: 'api_url', type: 'varchar', length: 500 })
  apiUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => IntegrationStore, (is) => is.integration, { cascade: true })
  integrationStores: IntegrationStore[];

  @OneToMany(() => ProductIntegration, (pi) => pi.integration, { cascade: true })
  productIntegrations: ProductIntegration[];
}
