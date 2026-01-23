import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateWaybillsTable1768690000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'waybills',
                columns: [
                    {
                        name: 'id',
                        type: 'char',
                        length: '36',
                        isPrimary: true,
                        isGenerated: false,
                    },
                    {
                        name: 'waybill_number',
                        type: 'varchar',
                        length: '50',
                        isUnique: true,
                    },
                    {
                        name: 'order_id',
                        type: 'char',
                        length: '36',
                        isNullable: true,
                    },
                    {
                        name: 'store_id',
                        type: 'char',
                        length: '36',
                        isNullable: true,
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['DISPATCH', 'RETURN'],
                        default: "'DISPATCH'",
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['CREATED', 'PRINTED', 'CANCELLED'],
                        default: "'CREATED'",
                    },
                    {
                        name: 'html_content',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'pdf_path',
                        type: 'varchar',
                        length: '500',
                        isNullable: true,
                    },
                    {
                        name: 'customer_name',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'customer_address',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'customer_phone',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'total_amount',
                        type: 'decimal',
                        precision: 12,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'currency_code',
                        type: 'varchar',
                        length: '10',
                        default: "'TRY'",
                    },
                    {
                        name: 'notes',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'printed_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'printed_by',
                        type: 'varchar',
                        length: '255',
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
                        default: 'CURRENT_TIMESTAMP',
                        onUpdate: 'CURRENT_TIMESTAMP',
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

        await queryRunner.createForeignKey(
            'waybills',
            new TableForeignKey({
                columnNames: ['order_id'],
                referencedTableName: 'orders',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            })
        );

        await queryRunner.createForeignKey(
            'waybills',
            new TableForeignKey({
                columnNames: ['store_id'],
                referencedTableName: 'stores',
                referencedColumnNames: ['id'],
                onDelete: 'SET NULL',
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('waybills');
        if (table) {
            const orderForeignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('order_id') !== -1);
            if (orderForeignKey) {
                await queryRunner.dropForeignKey('waybills', orderForeignKey);
            }
            const storeForeignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('store_id') !== -1);
            if (storeForeignKey) {
                await queryRunner.dropForeignKey('waybills', storeForeignKey);
            }
        }
        await queryRunner.dropTable('waybills', true);
    }
}
