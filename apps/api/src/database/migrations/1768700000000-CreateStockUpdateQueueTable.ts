import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateStockUpdateQueueTable1768700000000 implements MigrationInterface {
    name = 'CreateStockUpdateQueueTable1768700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'stock_update_queue',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'UUID()',
                    },
                    {
                        name: 'product_id',
                        type: 'uuid',
                    },
                    {
                        name: 'store_id',
                        type: 'uuid',
                    },
                    {
                        name: 'reason',
                        type: 'enum',
                        enum: ['ORDER_CREATED', 'ORDER_CANCELLED', 'STOCK_ADDED', 'STOCK_REMOVED', 'MANUAL'],
                    },
                    {
                        name: 'priority',
                        type: 'int',
                        default: 50,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'deleted_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'processed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                ],
            }),
            true
        );

        // Foreign keys
        await queryRunner.query(`
            ALTER TABLE stock_update_queue
            ADD CONSTRAINT FK_stock_queue_product
            FOREIGN KEY (product_id) REFERENCES products(id)
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE stock_update_queue
            ADD CONSTRAINT FK_stock_queue_store
            FOREIGN KEY (store_id) REFERENCES stores(id)
            ON DELETE CASCADE
        `);

        // Indexes
        await queryRunner.createIndex(
            'stock_update_queue',
            new TableIndex({
                name: 'IDX_stock_queue_pending',
                columnNames: ['processed_at', 'created_at'],
            })
        );

        await queryRunner.createIndex(
            'stock_update_queue',
            new TableIndex({
                name: 'IDX_stock_queue_store',
                columnNames: ['store_id'],
            })
        );

        await queryRunner.createIndex(
            'stock_update_queue',
            new TableIndex({
                name: 'IDX_stock_queue_product',
                columnNames: ['product_id'],
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('stock_update_queue');
    }
}
