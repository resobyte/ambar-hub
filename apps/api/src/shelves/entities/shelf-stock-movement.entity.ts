import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Shelf } from './shelf.entity';
import { Product } from '../../products/entities/product.entity';
import { Order } from '../../orders/entities/order.entity';
import { Route } from '../../routes/entities/route.entity';
import { User } from '../../users/entities/user.entity';

export enum MovementType {
    PICKING = 'PICKING',           // Toplama - raftan toplama havuzuna
    PACKING_IN = 'PACKING_IN',     // Paketleme girişi - toplama havuzundan paketleme rafına
    PACKING_OUT = 'PACKING_OUT',   // Paketleme çıkışı - paketleme rafından sevk
    RECEIVING = 'RECEIVING',       // Mal kabul - girişi
    TRANSFER = 'TRANSFER',         // Transfer - raftan rafa
    ADJUSTMENT = 'ADJUSTMENT',     // Manuel düzeltme
    RETURN = 'RETURN',             // İade girişi
    CANCEL = 'CANCEL',             // İptal - stok geri alma
}

export enum MovementDirection {
    IN = 'IN',   // Rafa giriş
    OUT = 'OUT', // Raftan çıkış
}

@Entity('shelf_stock_movements')
export class ShelfStockMovement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'shelf_id', type: 'char', length: 36 })
    shelfId: string;

    @ManyToOne(() => Shelf, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'shelf_id' })
    shelf: Shelf;

    @Column({ name: 'product_id', type: 'char', length: 36 })
    productId: string;

    @ManyToOne(() => Product, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @Column({
        type: 'enum',
        enum: MovementType,
    })
    type: MovementType;

    @Column({
        type: 'enum',
        enum: MovementDirection,
    })
    direction: MovementDirection;

    @Column({ type: 'int' })
    quantity: number;

    @Column({ name: 'quantity_before', type: 'int', default: 0 })
    quantityBefore: number;

    @Column({ name: 'quantity_after', type: 'int', default: 0 })
    quantityAfter: number;

    @Column({ name: 'order_id', type: 'char', length: 36, nullable: true })
    orderId: string | null;

    @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({ name: 'route_id', type: 'char', length: 36, nullable: true })
    routeId: string | null;

    @ManyToOne(() => Route, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'route_id' })
    route: Route;

    @Column({ name: 'source_shelf_id', type: 'char', length: 36, nullable: true })
    sourceShelfId: string | null;

    @ManyToOne(() => Shelf, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'source_shelf_id' })
    sourceShelf: Shelf;

    @Column({ name: 'target_shelf_id', type: 'char', length: 36, nullable: true })
    targetShelfId: string | null;

    @ManyToOne(() => Shelf, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'target_shelf_id' })
    targetShelf: Shelf;

    @Column({ name: 'reference_number', type: 'varchar', length: 100, nullable: true })
    referenceNumber: string | null;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @Column({ name: 'user_id', type: 'char', length: 36, nullable: true })
    userId: string | null;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
