import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumablesService } from './consumables.service';
import { ConsumablesController } from './consumables.controller';
import { Consumable } from './entities/consumable.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Consumable])],
    controllers: [ConsumablesController],
    providers: [ConsumablesService],
    exports: [ConsumablesService],
})
export class ConsumablesModule { }
