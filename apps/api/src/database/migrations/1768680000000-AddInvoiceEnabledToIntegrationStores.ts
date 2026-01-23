import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddInvoiceEnabledToIntegrationStores1768680000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'invoice_enabled',
                type: 'boolean',
                default: true,
                isNullable: false,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('integration_stores', 'invoice_enabled');
    }
}
