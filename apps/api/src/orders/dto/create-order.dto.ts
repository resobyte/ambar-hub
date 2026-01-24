import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType } from '../enums/order-type.enum';

export class OrderItemDto {
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsNumber()
    quantity: number;

    @IsNumber()
    price: number;
}

export class AddressDto {
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsNotEmpty()
    city: string;

    @IsString()
    @IsNotEmpty()
    district: string;

    @IsString()
    @IsOptional()
    postalCode?: string;

    @IsString()
    @IsNotEmpty()
    addressDetail: string;
}

export class CreateOrderDto {
    @IsOptional()
    @IsString()
    customerId?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => AddressDto)
    newCustomerData?: AddressDto & {
        email?: string,
        tcIdentityNumber?: string,
        taxNumber?: string,
        taxOffice?: string,
        company?: string,
        // Invoice fields
        invoiceCity?: string;
        invoiceDistrict?: string;
        invoiceAddress?: string;
    };

    @IsEnum(OrderType)
    @IsNotEmpty()
    orderType: OrderType;

    @IsOptional()
    @IsString()
    documentType?: string; // 'WAYBILL_ONLY' | 'WAYBILL_AND_INVOICE'

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @ValidateNested()
    @Type(() => AddressDto)
    shippingAddress: AddressDto;

    @ValidateNested()
    @Type(() => AddressDto)
    invoiceAddress: AddressDto;

    @IsOptional()
    @IsString()
    storeId?: string;

    @IsOptional()
    @IsString()
    paymentMethod?: string;

    @IsOptional()
    @IsBoolean()
    isCod?: boolean;

    @IsOptional()
    @IsString()
    note?: string;
}
