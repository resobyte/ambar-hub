import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Order } from '../orders/entities/order.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { FaultyOrder } from '../orders/entities/faulty-order.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Order, Invoice, FaultyOrder])
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule { }
