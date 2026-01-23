import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateShelfStockMovements1768690200000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'shelf_stock_movements',
                columns: [
                    {
                        name: 'id',
                        type: 'char',
                        length: '36',
                        isPrimary: true,
                        isGenerated: false,
                    },
                    {
                        name: 'shelf_id',
                        type: 'char',
                        length: '36',
                    },
                    {
                        name: 'product_id',
                        type: 'char',
                        length: '36',
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['PICKING', 'PACKING_IN', 'PACKING_OUT', 'RECEIVING', 'TRANSFER', 'ADJUSTMENT', 'RETURN', 'CANCEL'],
                    },
                    {
                        name: 'direction',
                        type: 'enum',
                        enum: ['IN', 'OUT'],
                    },
                    {
                        name: 'quantity',
                        type: 'int',
                    },
                    {
                        name: 'quantity_before',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'quantity_after',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'order_id',
                        type: 'char',
                        length: '36',
                        isNullable: true,
                    },
                    {
                        name: 'route_id',
                        type: 'char',
                        length: '36',
                        isNullable: true,
                    },
                    {
                        name: 'source_shelf_id',
                        type: 'char',
                        length: '36',
                        isNullable: true,
                    },
                    {
                        name: 'target_shelf_id',
                        type: 'char',
                        length: '36',
                        isNullable: true,
                    },
                    {
                        name: 'reference_number',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'notes',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'user_id',
                        type: 'char',
                        length: '36',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true
        );

        await queryRunner.createForeignKey(
            'shelf_stock_movements',
            new TableForeignKey({
                columnNames: ['shelf_id'],
                referencedTableName: 'shelves',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        await queryRunner.createForeignKey(
            'shelf_stock_movements',
            new TableForeignKey({
                columnNames: ['product_id'],
                referencedTableName: 'products',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        await queryRunner.createForeignKey(
            'shelf_stock_movements',
            new TableForeignKey({
                columnNames: ['order_id'],
                referencedTableName: 'orders',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            })
        );

        await queryRunner.createForeignKey(
            'shelf_stock_movements',
            new TableForeignKey({
                columnNames: ['route_id'],
                referencedTableName: 'routes',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            })
        );

        await queryRunner.createIndex(
            'shelf_stock_movements',
            new TableIndex({
                name: 'IDX_shelf_stock_movements_shelf_id',
                columnNames: ['shelf_id'],
            })
        );

        await queryRunner.createIndex(
            'shelf_stock_movements',
            new TableIndex({
                name: 'IDX_shelf_stock_movements_product_id',
                columnNames: ['product_id'],
            })
        );

        await queryRunner.createIndex(
            'shelf_stock_movements',
            new TableIndex({
                name: 'IDX_shelf_stock_movements_order_id',
                columnNames: ['order_id'],
            })
        );

        await queryRunner.createIndex(
            'shelf_stock_movements',
            new TableIndex({
                name: 'IDX_shelf_stock_movements_created_at',
                columnNames: ['created_at'],
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('shelf_stock_movements');
        if (table) {
            for (const foreignKey of table.foreignKeys) {
                await queryRunner.dropForeignKey('shelf_stock_movements', foreignKey);
            }
            for (const index of table.indices) {
                await queryRunner.dropIndex('shelf_stock_movements', index);
            }
        }
        await queryRunner.dropTable('shelf_stock_movements', true);
    }
}
