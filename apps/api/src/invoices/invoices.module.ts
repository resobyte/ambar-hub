import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { Invoice } from './entities/invoice.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderHistory } from '../orders/entities/order-history.entity';
import { Product } from '../products/entities/product.entity';
import { IntegrationStore } from '../integration-stores/entities/integration-store.entity';
import { OrderHistoryService } from '../orders/order-history.service';
import { User } from '../users/entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Invoice, Order, OrderHistory, Product, IntegrationStore, User]),
        ConfigModule,
    ],
    controllers: [InvoicesController],
    providers: [InvoicesService, OrderHistoryService],
    exports: [InvoicesService],
})
export class InvoicesModule { }

