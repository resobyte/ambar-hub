import { Entity, Column, PrimaryGeneratedColumn, Tree, TreeChildren, TreeParent } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('categories')
@Tree("closure-table")
export class Category extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @TreeChildren()
    children: Category[];

    @TreeParent()
    parent: Category;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;
}
