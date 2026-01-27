import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateStockSyncLogsTable1768700100000 implements MigrationInterface {
    name = 'CreateStockSyncLogsTable1768700100000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'stock_sync_logs',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'UUID()',
                    },
                    {
                        name: 'batch_id',
                        type: 'uuid',
                    },
                    {
                        name: 'store_id',
                        type: 'uuid',
                    },
                    {
                        name: 'provider',
                        type: 'enum',
                        enum: ['ARAS_KARGO', 'TRENDYOL', 'HEPSIBURADA', 'IKAS', 'UYUMSOFT'],
                    },
                    {
                        name: 'sync_status',
                        type: 'enum',
                        enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'RATE_LIMITED'],
                        default: "'PENDING'",
                    },
                    {
                        name: 'total_items',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'success_items',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'failed_items',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'endpoint',
                        type: 'varchar',
                        length: '500',
                        isNullable: true,
                    },
                    {
                        name: 'method',
                        type: 'varchar',
                        length: '10',
                        isNullable: true,
                    },
                    {
                        name: 'request_payload',
                        type: 'longtext',
                        isNullable: true,
                    },
                    {
                        name: 'response_payload',
                        type: 'longtext',
                        isNullable: true,
                    },
                    {
                        name: 'status_code',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'error_message',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'duration_ms',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'batch_request_id',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'product_details',
                        type: 'json',
                        isNullable: true,
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
                ],
            }),
            true
        );

        // Foreign key
        await queryRunner.query(`
            ALTER TABLE stock_sync_logs
            ADD CONSTRAINT FK_stock_sync_logs_store
            FOREIGN KEY (store_id) REFERENCES stores(id)
            ON DELETE CASCADE
        `);

        // Indexes
        await queryRunner.createIndex(
            'stock_sync_logs',
            new TableIndex({
                name: 'IDX_stock_sync_logs_batch',
                columnNames: ['batch_id'],
            })
        );

        await queryRunner.createIndex(
            'stock_sync_logs',
            new TableIndex({
                name: 'IDX_stock_sync_logs_store',
                columnNames: ['store_id'],
            })
        );

        await queryRunner.createIndex(
            'stock_sync_logs',
            new TableIndex({
                name: 'IDX_stock_sync_logs_status',
                columnNames: ['sync_status'],
            })
        );

        await queryRunner.createIndex(
            'stock_sync_logs',
            new TableIndex({
                name: 'IDX_stock_sync_logs_created',
                columnNames: ['created_at'],
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('stock_sync_logs');
    }
}
