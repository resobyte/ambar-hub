
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { Warehouse } from './warehouses/entities/warehouse.entity';
import { Store } from './stores/entities/store.entity';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    const warehouses = await dataSource.getRepository(Warehouse).find({ relations: ['stores'] });
    console.log('Warehouses:', JSON.stringify(warehouses, null, 2));

    const stores = await dataSource.getRepository(Store).find();
    console.log('All Stores:', JSON.stringify(stores, null, 2));

    await app.close();
}

bootstrap();
