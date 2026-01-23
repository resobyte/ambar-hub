import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CommonModule } from './common/common.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { StoresModule } from './stores/stores.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { IntegrationStoresModule } from './integration-stores/integration-stores.module';
import { ProductsModule } from './products/products.module';
import { ProductStoresModule } from './product-stores/product-stores.module';
import { ProductIntegrationsModule } from './product-integrations/product-integrations.module';
import { ShippingProvidersModule } from './shipping-providers/shipping-providers.module';
import { OrdersModule } from './orders/orders.module';
import { CustomersModule } from './customers/customers.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ShelvesModule } from './shelves/shelves.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { RoutesModule } from './routes/routes.module';
import { PackingModule } from './packing/packing.module';
import { PickingModule } from './picking/picking.module';
import { ConsumablesModule } from './consumables/consumables.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { WaybillsModule } from './waybills/waybills.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: false
      }),
      inject: [ConfigService],
    }),
    CommonModule,
    AuthModule,
    UsersModule,
    WarehousesModule,
    StoresModule,
    IntegrationsModule,
    IntegrationStoresModule,
    ProductsModule,
    ProductStoresModule,
    ProductIntegrationsModule,
    ShippingProvidersModule,
    OrdersModule,
    CustomersModule,
    InvoicesModule,
    ShelvesModule,
    SuppliersModule,
    PurchasesModule,
    RoutesModule,
    PackingModule,
    PickingModule,
    ConsumablesModule,
    DashboardModule,
    WaybillsModule,
  ],
})
export class AppModule { }

