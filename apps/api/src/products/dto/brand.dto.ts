import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateBrandDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class UpdateBrandDto extends CreateBrandDto { }
