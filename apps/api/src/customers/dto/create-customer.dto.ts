import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, IsBoolean } from 'class-validator';

export enum CustomerType {
    INDIVIDUAL = 'INDIVIDUAL',
    COMMERCIAL = 'COMMERCIAL',
}

export class CreateCustomerDto {
    @IsEnum(CustomerType)
    @IsOptional()
    type?: CustomerType = CustomerType.INDIVIDUAL;

    @IsString()
    @IsOptional()
    firstName?: string;

    @IsString()
    @IsOptional()
    lastName?: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    city?: string;

    @IsString()
    @IsOptional()
    district?: string;

    @IsString()
    @IsOptional()
    address?: string;

    // Bireysel müşteri için TC
    @IsString()
    @IsOptional()
    tcIdentityNumber?: string;

    // Ticari müşteri için
    @IsString()
    @IsOptional()
    company?: string;

    @IsString()
    @IsOptional()
    taxOffice?: string;

    @IsString()
    @IsOptional()
    taxNumber?: string;
}
