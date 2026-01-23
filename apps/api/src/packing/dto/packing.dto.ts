import { IsUUID, IsOptional, IsString, IsArray, IsNumber, ValidateNested, Min, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class StartPackingDto {
    @IsUUID()
    routeId: string;

    @IsString()
    @IsOptional()
    stationId?: string;
}

export class ScanBarcodeDto {
    @IsString()
    barcode: string;

    @IsUUID()
    sessionId: string;
}

export class OrderConsumableDto {
    @IsUUID()
    consumableId: string;

    @Transform(({ value }) => Number(value))
    @IsNumber()
    @Min(0.01)
    quantity: number;
}

export class CompleteOrderDto {
    @IsUUID()
    sessionId: string;

    @IsUUID()
    orderId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderConsumableDto)
    @IsOptional()
    consumables?: OrderConsumableDto[];

    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    processShipment?: boolean;
}

export class ProcessShipmentDto {
    @IsUUID()
    orderId: string;
}
