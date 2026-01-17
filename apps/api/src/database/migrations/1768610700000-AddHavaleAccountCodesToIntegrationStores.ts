
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddHavaleAccountCodesToIntegrationStores1768610700000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'e_archive_havale_account_code',
                type: 'varchar',
                length: '100',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'e_invoice_havale_account_code',
                type: 'varchar',
                length: '100',
                isNullable: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('integration_stores', 'e_invoice_havale_account_code');
        await queryRunner.dropColumn('integration_stores', 'e_archive_havale_account_code');
    }
}
