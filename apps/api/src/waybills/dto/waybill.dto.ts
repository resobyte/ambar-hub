import { IsUUID, IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { WaybillType } from '../entities/waybill.entity';

export class CreateWaybillDto {
    @IsUUID()
    orderId: string;

    @IsUUID()
    @IsOptional()
    storeId?: string;

    @IsEnum(WaybillType)
    @IsOptional()
    type?: WaybillType;

    @IsString()
    @IsOptional()
    notes?: string;
}

export class WaybillResponseDto {
    id: string;
    waybillNumber: string;
    orderId: string;
    storeId: string;
    type: WaybillType;
    status: string;
    customerName: string;
    customerAddress: string;
    totalAmount: number;
    currencyCode: string;
    notes: string;
    createdAt: Date;
    printedAt: Date;
}
