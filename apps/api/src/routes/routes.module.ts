import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from './entities/route.entity';
import { RouteOrder } from './entities/route-order.entity';
import { RouteConsumable } from './entities/route-consumable.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ShelfStock } from '../shelves/entities/shelf-stock.entity';
import { Consumable } from '../consumables/entities/consumable.entity';
import { Store } from '../stores/entities/store.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';
import { ConsumablesModule } from '../consumables/consumables.module';
import { OrdersModule } from '../orders/orders.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { StoresModule } from '../stores/stores.module';
import { ShelvesModule } from '../shelves/shelves.module';
import { ProductStoresModule } from '../product-stores/product-stores.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Route,
            RouteOrder,
            RouteConsumable,
            Order,
            OrderItem,
            Product,
            ShelfStock,
            Consumable,
            Store,
            Invoice,
        ]),
        ConsumablesModule,
        forwardRef(() => OrdersModule),
        forwardRef(() => InvoicesModule),
        forwardRef(() => StoresModule),
        forwardRef(() => ShelvesModule),
        ProductStoresModule,
    ],
    controllers: [RoutesController],
    providers: [RoutesService],
    exports: [RoutesService],
})
export class RoutesModule { }
