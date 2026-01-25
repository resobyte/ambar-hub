import { IsArray, IsString, IsBoolean, IsNotEmpty, IsNumber } from 'class-validator';

export class ReshipmentItemDto {
    @IsString()
    @IsNotEmpty()
    itemId: string;

    @IsNumber()
    @IsNotEmpty()
    quantity: number;
}

export class ReshipmentDto {
    @IsArray()
    @IsNotEmpty({ each: true })
    items: ReshipmentItemDto[];

    @IsString()
    @IsNotEmpty()
    cargoTrackingNumber: string;

    @IsBoolean()
    needsInvoice: boolean;
}
