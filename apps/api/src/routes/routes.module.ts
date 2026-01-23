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
import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';
import { ConsumablesModule } from '../consumables/consumables.module';
import { OrdersModule } from '../orders/orders.module';

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
        ]),
        ConsumablesModule,
        forwardRef(() => OrdersModule),
    ],
    controllers: [RoutesController],
    providers: [RoutesService],
    exports: [RoutesService],
})
export class RoutesModule { }
