import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateCategoryDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsUUID()
    @IsOptional()
    parentId?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class UpdateCategoryDto extends CreateCategoryDto { }
