import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('customers')
export class Customer extends BaseEntity {
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

    @Column({ type: 'text', nullable: true })
    address: string;

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
