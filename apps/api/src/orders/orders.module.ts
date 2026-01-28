import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrderHistoryService } from './order-history.service';
import { OrderApiLogService } from './order-api-log.service';
import { ZplTemplateService } from './zpl-template.service';
import { OrderSyncService } from './order-sync.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderHistory } from './entities/order-history.entity';
import { OrderApiLog } from './entities/order-api-log.entity';
import { FaultyOrder } from './entities/faulty-order.entity';
import { CustomersModule } from '../customers/customers.module';
import { StoresModule } from '../stores/stores.module';
import { ProductStoresModule } from '../product-stores/product-stores.module';
import { Product } from '../products/entities/product.entity';
import { ProductSetItem } from '../products/entities/product-set-item.entity';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { RouteOrder } from '../routes/entities/route-order.entity';
import { Route } from '../routes/entities/route.entity';
import { User } from '../users/entities/user.entity';
import { InvoicesModule } from '../invoices/invoices.module';
import { Store } from '../stores/entities/store.entity';
import { ShelvesModule } from '../shelves/shelves.module';
import { StockSyncModule } from '../stock-sync/stock-sync.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Order, OrderItem, OrderHistory, OrderApiLog, FaultyOrder, Product, ProductSetItem, ProductStore, RouteOrder, Route, User, Store]),
        CustomersModule,
        StoresModule,
        ProductStoresModule,
        InvoicesModule,
        forwardRef(() => ShelvesModule),
        forwardRef(() => StockSyncModule),
    ],
    controllers: [OrdersController],
    providers: [OrdersService, OrderHistoryService, OrderApiLogService, ZplTemplateService, OrderSyncService],
    exports: [OrdersService, OrderHistoryService, OrderApiLogService, ZplTemplateService, OrderSyncService],
})
export class OrdersModule { }
