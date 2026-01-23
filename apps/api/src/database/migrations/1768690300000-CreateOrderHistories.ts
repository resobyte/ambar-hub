import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateOrderHistories1768690300000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'order_histories',
                columns: [
                    {
                        name: 'id',
                        type: 'char',
                        length: '36',
                        isPrimary: true,
                        isGenerated: false,
                    },
                    {
                        name: 'order_id',
                        type: 'char',
                        length: '36',
                    },
                    {
                        name: 'action',
                        type: 'enum',
                        enum: [
                            'CREATED',
                            'ROUTE_ASSIGNED',
                            'PICKING_STARTED',
                            'PICKING_COMPLETED',
                            'PACKING_STARTED',
                            'PACKING_COMPLETED',
                            'INVOICE_CREATED',
                            'INTEGRATION_STATUS_PICKING',
                            'INTEGRATION_STATUS_INVOICED',
                            'WAYBILL_CREATED',
                            'CARGO_CREATED',
                            'CARGO_LABEL_FETCHED',
                            'INVOICED',
                            'SHIPPED',
                            'DELIVERED',
                            'CANCELLED',
                            'RETURNED',
                            'STATUS_CHANGED',
                            'NOTE_ADDED',
                        ],
                    },
                    {
                        name: 'previous_status',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'new_status',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'user_id',
                        type: 'char',
                        length: '36',
                        isNullable: true,
                    },
                    {
                        name: 'user_name',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'route_id',
                        type: 'char',
                        length: '36',
                        isNullable: true,
                    },
                    {
                        name: 'route_name',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'session_id',
                        type: 'char',
                        length: '36',
                        isNullable: true,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'metadata',
                        type: 'json',
                        isNullable: true,
                    },
                    {
                        name: 'ip_address',
                        type: 'varchar',
                        length: '50',
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
            'order_histories',
            new TableForeignKey({
                columnNames: ['order_id'],
                referencedTableName: 'orders',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            })
        );

        await queryRunner.createForeignKey(
            'order_histories',
            new TableForeignKey({
                columnNames: ['user_id'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            })
        );

        await queryRunner.createIndex(
            'order_histories',
            new TableIndex({
                name: 'IDX_order_histories_order_id',
                columnNames: ['order_id'],
            })
        );

        await queryRunner.createIndex(
            'order_histories',
            new TableIndex({
                name: 'IDX_order_histories_user_id',
                columnNames: ['user_id'],
            })
        );

        await queryRunner.createIndex(
            'order_histories',
            new TableIndex({
                name: 'IDX_order_histories_action',
                columnNames: ['action'],
            })
        );

        await queryRunner.createIndex(
            'order_histories',
            new TableIndex({
                name: 'IDX_order_histories_created_at',
                columnNames: ['created_at'],
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('order_histories');
        if (table) {
            for (const foreignKey of table.foreignKeys) {
                await queryRunner.dropForeignKey('order_histories', foreignKey);
            }
            for (const index of table.indices) {
                await queryRunner.dropIndex('order_histories', index);
            }
        }
        await queryRunner.dropTable('order_histories', true);
    }
}
