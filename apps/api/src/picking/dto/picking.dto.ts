import { IsUUID, IsString, IsOptional, IsArray, IsNumber, Min } from 'class-validator';

export class StartPickingDto {
    @IsUUID()
    routeId: string;
}

export class ScanPickingBarcodeDto {
    @IsString()
    barcode: string;

    @IsUUID()
    routeId: string;

    @IsNumber()
    @IsOptional()
    @Min(1)
    quantity?: number;
}

export class BulkScanDto {
    @IsArray()
    @IsString({ each: true })
    barcodes: string[];

    @IsUUID()
    routeId: string;
}
