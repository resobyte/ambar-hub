import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Warehouse } from '../../warehouses/entities/warehouse.entity';
import { IntegrationStore } from '../../integration-stores/entities/integration-store.entity';
import { ProductStore } from '../../product-stores/entities/product-store.entity';

@Entity('stores')
export class Store extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  proxyUrl: string;

  @Column({ name: 'warehouse_id' })
  warehouseId: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => Warehouse, (warehouse) => warehouse.stores, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @OneToMany(() => IntegrationStore, (is) => is.store)
  integrationStores: IntegrationStore[];

  @OneToMany(() => ProductStore, (ps) => ps.store)
  productStores: ProductStore[];
}
