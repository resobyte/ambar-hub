import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Return } from './return.entity';
import { Product } from '../../products/entities/product.entity';
import { ReturnShelfType } from '../enums/return-status.enum';

@Entity('return_items')
export class ReturnItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'return_id' })
    returnId: string;

    @ManyToOne(() => Return, ret => ret.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'return_id' })
    return: Return;

    // Trendyol claim item ID
    @Column({ name: 'claim_item_id' })
    claimItemId: string;

    @Column({ name: 'order_line_item_id', nullable: true })
    orderLineItemId: string;

    // Ürün bilgileri
    @Column({ name: 'product_name', nullable: true })
    productName: string;

    @Column({ nullable: true })
    barcode: string;

    @Column({ name: 'merchant_sku', nullable: true })
    merchantSku: string;

    @Column({ name: 'product_color', nullable: true })
    productColor: string;

    @Column({ name: 'product_size', nullable: true })
    productSize: string;

    @Column({ name: 'product_category', nullable: true })
    productCategory: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    price: number;

    @Column({ type: 'int', default: 1 })
    quantity: number;

    // İade sebepleri
    @Column({ name: 'customer_reason_id', nullable: true })
    customerReasonId: string;

    @Column({ name: 'customer_reason_name', nullable: true })
    customerReasonName: string;

    @Column({ name: 'customer_reason_code', nullable: true })
    customerReasonCode: string;

    @Column({ name: 'trendyol_reason_id', nullable: true })
    trendyolReasonId: string;

    @Column({ name: 'trendyol_reason_name', nullable: true })
    trendyolReasonName: string;

    @Column({ name: 'customer_note', type: 'text', nullable: true })
    customerNote: string;

    // Status
    @Column({ name: 'claim_item_status', nullable: true })
    claimItemStatus: string;

    @Column({ default: false })
    resolved: boolean;

    @Column({ name: 'auto_accepted', default: false })
    autoAccepted: boolean;

    @Column({ name: 'accepted_by_seller', default: false })
    acceptedBySeller: boolean;

    @Column({ name: 'accept_detail', nullable: true })
    acceptDetail: string;

    // İşlem sonucu
    @Column({
        name: 'shelf_type',
        type: 'enum',
        enum: ReturnShelfType,
        nullable: true
    })
    shelfType: ReturnShelfType;

    @Column({ name: 'processed_shelf_id', nullable: true })
    processedShelfId: string;

    @Column({ name: 'processed_quantity', type: 'int', default: 0 })
    processedQuantity: number;

    // Ürün ilişkisi
    @Column({ name: 'product_id', nullable: true })
    productId: string | null;

    @ManyToOne(() => Product, { nullable: true })
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
