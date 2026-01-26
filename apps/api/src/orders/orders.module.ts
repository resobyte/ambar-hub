import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrderHistoryService } from './order-history.service';
import { ZplTemplateService } from './zpl-template.service';
import { OrderSyncService } from './order-sync.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderHistory } from './entities/order-history.entity';
import { FaultyOrder } from './entities/faulty-order.entity';
import { CustomersModule } from '../customers/customers.module';
import { StoresModule } from '../stores/stores.module';
import { Product } from '../products/entities/product.entity';
import { ProductSetItem } from '../products/entities/product-set-item.entity';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { RouteOrder } from '../routes/entities/route-order.entity';
import { Route } from '../routes/entities/route.entity';
import { User } from '../users/entities/user.entity';
import { InvoicesModule } from '../invoices/invoices.module';
import { Store } from '../stores/entities/store.entity';
import { ShelfStock } from '../shelves/entities/shelf-stock.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Order, OrderItem, OrderHistory, FaultyOrder, Product, ProductSetItem, ProductStore, RouteOrder, Route, User, Store, ShelfStock]),
        CustomersModule,
        StoresModule,
        InvoicesModule,
    ],
    controllers: [OrdersController],
    providers: [OrdersService, OrderHistoryService, ZplTemplateService, OrderSyncService],
    exports: [OrdersService, OrderHistoryService, ZplTemplateService, OrderSyncService],
})
export class OrdersModule { }
