import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCargoLabelHtmlToOrders1768690100000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('orders');

        if (table && !table.columns.find(c => c.name === 'cargo_label_html')) {
            await queryRunner.addColumn(
                'orders',
                new TableColumn({
                    name: 'cargo_label_html',
                    type: 'text',
                    isNullable: true,
                })
            );
        }

        if (table && !table.columns.find(c => c.name === 'waybill_id')) {
            await queryRunner.addColumn(
                'orders',
                new TableColumn({
                    name: 'waybill_id',
                    type: 'char',
                    length: '36',
                    isNullable: true,
                })
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('orders');

        if (table?.columns.find(c => c.name === 'cargo_label_html')) {
            await queryRunner.dropColumn('orders', 'cargo_label_html');
        }

        if (table?.columns.find(c => c.name === 'waybill_id')) {
            await queryRunner.dropColumn('orders', 'waybill_id');
        }
    }
}
