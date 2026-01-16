import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackingSession } from './entities/packing-session.entity';
import { PackingOrderItem } from './entities/packing-order-item.entity';
import { Route } from '../routes/entities/route.entity';
import { RouteOrder } from '../routes/entities/route-order.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { PackingMaterial } from './entities/packing-material.entity';
import { PackingService } from './packing.service';
import { PackingMaterialsService } from './packing-materials.service';
import { PackingController } from './packing.controller';
import { PackingMaterialsController } from './packing-materials.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            PackingSession,
            PackingOrderItem,
            Route,
            RouteOrder,
            Order,
            OrderItem,
            PackingMaterial,
        ]),
    ],
    controllers: [PackingController, PackingMaterialsController],
    providers: [PackingService, PackingMaterialsService],
    exports: [PackingService, PackingMaterialsService],
})
export class PackingModule { }
