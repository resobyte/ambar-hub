import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderApiLog, ApiLogProvider, ApiLogType } from './entities/order-api-log.entity';

export interface CreateApiLogDto {
    orderId: string;
    provider: ApiLogProvider;
    logType: ApiLogType;
    endpoint?: string;
    method?: string;
    requestPayload?: any;
    responsePayload?: any;
    statusCode?: number;
    isSuccess: boolean;
    errorMessage?: string;
    durationMs?: number;
}

@Injectable()
export class OrderApiLogService {
    constructor(
        @InjectRepository(OrderApiLog)
        private readonly apiLogRepository: Repository<OrderApiLog>,
    ) {}

    async log(data: CreateApiLogDto): Promise<OrderApiLog> {
        // Get current time in GMT+3 (Turkey)
        const nowUtc = new Date();
        const turkeyTime = new Date(nowUtc.getTime() + (3 * 60 * 60 * 1000));

        const log = this.apiLogRepository.create({
            orderId: data.orderId,
            provider: data.provider,
            logType: data.logType,
            endpoint: data.endpoint || null,
            method: data.method || null,
            requestPayload: data.requestPayload ? JSON.stringify(data.requestPayload) : null,
            responsePayload: data.responsePayload ? JSON.stringify(data.responsePayload) : null,
            statusCode: data.statusCode || null,
            isSuccess: data.isSuccess,
            errorMessage: data.errorMessage || null,
            durationMs: data.durationMs || null,
            createdAt: turkeyTime,
        });

        return this.apiLogRepository.save(log);
    }

    async getLogsByOrderId(orderId: string): Promise<OrderApiLog[]> {
        return this.apiLogRepository.find({
            where: { orderId },
            order: { createdAt: 'DESC' },
        });
    }

    async getLogsByProvider(orderId: string, provider: ApiLogProvider): Promise<OrderApiLog[]> {
        return this.apiLogRepository.find({
            where: { orderId, provider },
            order: { createdAt: 'DESC' },
        });
    }
}
