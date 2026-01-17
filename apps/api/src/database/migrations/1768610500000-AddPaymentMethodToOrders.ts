import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPaymentMethodToOrders1768610500000 implements MigrationInterface {
    name = 'AddPaymentMethodToOrders1768610500000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'orders',
            new TableColumn({
                name: 'payment_method',
                type: 'varchar',
                length: '100',
                isNullable: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('orders', 'payment_method');
    }
}
