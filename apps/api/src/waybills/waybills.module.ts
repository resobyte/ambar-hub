import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Waybill } from './entities/waybill.entity';
import { Order } from '../orders/entities/order.entity';
import { Store } from '../stores/entities/store.entity';
import { WaybillsService } from './waybills.service';
import { WaybillsController } from './waybills.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([Waybill, Order, Store]),
    ],
    controllers: [WaybillsController],
    providers: [WaybillsService],
    exports: [WaybillsService],
})
export class WaybillsModule { }
