import { IsString, MaxLength, IsOptional, IsArray, IsUUID } from 'class-validator';

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
}
