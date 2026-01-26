import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Invoice } from './entities/invoice.entity';
import { InvoicesService } from './invoices.service';
import { InvoiceProcessorService } from './invoice-processor.service';
import { InvoicesController } from './invoices.controller';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { Store } from '../stores/entities/store.entity';
import { User } from '../users/entities/user.entity';
import { OrderHistory } from '../orders/entities/order-history.entity';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        TypeOrmModule.forFeature([Invoice, Order, OrderHistory, Product, Store, User]),
        forwardRef(() => OrdersModule),
    ],
    controllers: [InvoicesController],
    providers: [InvoicesService, InvoiceProcessorService],
    exports: [InvoicesService],
})
export class InvoicesModule { }
