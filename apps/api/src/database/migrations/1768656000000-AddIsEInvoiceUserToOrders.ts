import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddIsEInvoiceUserToOrders1768656000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn('orders', new TableColumn({
            name: 'is_e_invoice_user',
            type: 'boolean',
            default: false
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('orders', 'is_e_invoice_user');
    }

}
