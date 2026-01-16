import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { PackingSession } from './packing-session.entity';
import { Order } from '../../orders/entities/order.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('packing_order_items')
export class PackingOrderItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'session_id', type: 'uuid' })
    sessionId: string;

    @ManyToOne(() => PackingSession, (session) => session.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_id' })
    session: PackingSession;

    @Column({ name: 'order_id', type: 'uuid' })
    orderId: string;

    @ManyToOne(() => Order, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({ name: 'product_id', type: 'uuid', nullable: true })
    productId: string | null;

    @ManyToOne(() => Product, { nullable: true })
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @Column({ type: 'varchar', length: 255 })
    barcode: string;

    @Column({ name: 'required_quantity', type: 'int', default: 1 })
    requiredQuantity: number;

    @Column({ name: 'scanned_quantity', type: 'int', default: 0 })
    scannedQuantity: number;

    @Column({ name: 'is_complete', default: false })
    isComplete: boolean;

    @Column({ name: 'scanned_at', type: 'timestamp', nullable: true })
    scannedAt: Date | null;

    @Column({ name: 'sequence', type: 'int', default: 0 })
    sequence: number;
}
