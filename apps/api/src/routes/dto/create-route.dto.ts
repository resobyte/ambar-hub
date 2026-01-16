import { IsString, MinLength, MaxLength, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateRouteDto {
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsArray()
    @IsUUID('4', { each: true })
    orderIds: string[];
}
