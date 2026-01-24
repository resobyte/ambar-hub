import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackingSession } from './entities/packing-session.entity';
import { PackingOrderItem } from './entities/packing-order-item.entity';
import { Route } from '../routes/entities/route.entity';
import { RouteOrder } from '../routes/entities/route-order.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderConsumable } from '../orders/entities/order-consumable.entity';
import { PackingMaterial } from './entities/packing-material.entity';
import { Consumable } from '../consumables/entities/consumable.entity';
import { Store } from '../stores/entities/store.entity';
import { Product } from '../products/entities/product.entity';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { PackingService } from './packing.service';
import { PackingMaterialsService } from './packing-materials.service';
import { PackingController } from './packing.controller';
import { PackingMaterialsController } from './packing-materials.controller';
import { InvoicesModule } from '../invoices/invoices.module';
import { StoresModule } from '../stores/stores.module';
import { WaybillsModule } from '../waybills/waybills.module';
import { ShelvesModule } from '../shelves/shelves.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            PackingSession,
            PackingOrderItem,
            Route,
            RouteOrder,
            Order,
            OrderItem,
            OrderConsumable,
            PackingMaterial,
            Consumable,
            Store,
            Product,
            ProductStore,
        ]),
        forwardRef(() => InvoicesModule),
        forwardRef(() => StoresModule),
        forwardRef(() => WaybillsModule),
        forwardRef(() => OrdersModule),
        ShelvesModule,
    ],
    controllers: [PackingController, PackingMaterialsController],
    providers: [PackingService, PackingMaterialsService],
    exports: [PackingService, PackingMaterialsService],
})
export class PackingModule { }
