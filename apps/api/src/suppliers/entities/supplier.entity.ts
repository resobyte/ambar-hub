import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('suppliers')
export class Supplier extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 255 })
    name: string;

    @Column({ unique: true, length: 50, nullable: true })
    code: string;

    @Column({ length: 255, nullable: true })
    email: string;

    @Column({ length: 50, nullable: true })
    phone: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ name: 'contact_person', length: 255, nullable: true })
    contactPerson: string;

    @Column({ name: 'tax_number', length: 50, nullable: true })
    taxNumber: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @OneToMany('PurchaseOrder', 'supplier')
    purchaseOrders: any[];
}
