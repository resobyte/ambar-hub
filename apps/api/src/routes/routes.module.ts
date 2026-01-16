import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from './entities/route.entity';
import { RouteOrder } from './entities/route-order.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Route,
            RouteOrder,
            Order,
            OrderItem,
            Product,
        ]),
    ],
    controllers: [RoutesController],
    providers: [RoutesService],
    exports: [RoutesService],
})
export class RoutesModule { }
