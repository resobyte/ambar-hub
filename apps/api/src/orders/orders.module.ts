import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { FaultyOrder } from './entities/faulty-order.entity';
import { CustomersModule } from '../customers/customers.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { Product } from '../products/entities/product.entity';
import { ProductSetItem } from '../products/entities/product-set-item.entity';
import { ProductStore } from '../product-stores/entities/product-store.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Order, OrderItem, FaultyOrder, Product, ProductSetItem, ProductStore]),
        CustomersModule,
        IntegrationsModule,
    ],
    controllers: [OrdersController],
    providers: [OrdersService],
    exports: [OrdersService],
})
export class OrdersModule { }


