import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { Invoice } from './entities/invoice.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Invoice, Order, Product]),
        ConfigModule,
    ],
    controllers: [InvoicesController],
    providers: [InvoicesService],
    exports: [InvoicesService],
})
export class InvoicesModule { }

