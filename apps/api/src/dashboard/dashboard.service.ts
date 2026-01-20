import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { FaultyOrder } from '../orders/entities/faulty-order.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { InvoiceStatus } from '../invoices/enums/invoice-status.enum';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        @InjectRepository(Invoice)
        private readonly invoiceRepository: Repository<Invoice>,
        @InjectRepository(FaultyOrder)
        private readonly faultyOrderRepository: Repository<FaultyOrder>,
    ) { }

    async getStats() {
        const today = new Date();
        const start = startOfDay(today);
        const end = endOfDay(today);

        const [
            todayOrders,
            failedInvoices,
            faultyOrders,
            unsuppliedOrders
        ] = await Promise.all([
            // 1. Today's Orders
            this.orderRepository.count({
                where: {
                    orderDate: Between(start, end)
                }
            }),
            // 2. Failed Invoices
            this.invoiceRepository.count({
                where: {
                    status: InvoiceStatus.ERROR
                }
            }),
            // 3. Faulty Orders
            this.faultyOrderRepository.count(),
            // 4. Unsupplied Orders
            this.orderRepository.count({
                where: {
                    status: OrderStatus.UNSUPPLIED
                }
            })
        ]);

        return {
            todayOrders,
            failedInvoices,
            faultyOrders,
            unsuppliedOrders
        };
    }
}
