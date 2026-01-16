import { IsUUID, IsOptional, IsString } from 'class-validator';

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

export class CompleteOrderDto {
    @IsUUID()
    sessionId: string;

    @IsUUID()
    orderId: string;
}
