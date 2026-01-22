import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Order } from '../../orders/entities/order.entity';

export enum CustomerType {
    INDIVIDUAL = 'INDIVIDUAL',
    COMMERCIAL = 'COMMERCIAL',
}

@Entity('customers')
export class Customer extends BaseEntity {
    @Column({
        type: 'enum',
        enum: CustomerType,
        default: CustomerType.INDIVIDUAL,
    })
    type: CustomerType;

    @Column({ name: 'first_name', nullable: true })
    firstName: string;

    @Column({ name: 'last_name', nullable: true })
    lastName: string;

    @Column({ unique: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    district: string;

    @Column({ name: 'postal_code', nullable: true })
    postalCode: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    // Fatura Adresi (Boş ise teslimat adresi kullanılır mantığı frontend'de/serviste yönetilebilir)
    @Column({ name: 'invoice_city', nullable: true })
    invoiceCity: string;

    @Column({ name: 'invoice_district', nullable: true })
    invoiceDistrict: string;

    @Column({ name: 'invoice_postal_code', nullable: true })
    invoicePostalCode: string;

    @Column({ name: 'invoice_address', type: 'text', nullable: true })
    invoiceAddress: string;

    @Column({ name: 'tc_identity_number', nullable: true })
    tcIdentityNumber: string;

    @Column({ name: 'trendyol_customer_id', nullable: true })
    trendyolCustomerId: string;

    @Column({ nullable: true })
    company: string;

    @Column({ name: 'tax_office', nullable: true })
    taxOffice: string;

    @Column({ name: 'tax_number', nullable: true })
    taxNumber: string;

    @OneToMany(() => Order, (order) => order.customer)
    orders: Order[];
}
