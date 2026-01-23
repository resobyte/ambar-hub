import { IsString, MaxLength, IsOptional, IsArray, IsUUID, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class RouteConsumableDto {
    @IsUUID('4')
    consumableId: string;

    @Transform(({ value }) => Number(value))
    @IsNumber()
    @Min(0.01)
    quantity: number;
}

export class CreateRouteDto {
    @IsString()
    @IsOptional()
    @MaxLength(255)
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsArray()
    @IsUUID('4', { each: true })
    orderIds: string[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RouteConsumableDto)
    @IsOptional()
    consumables?: RouteConsumableDto[];
}
