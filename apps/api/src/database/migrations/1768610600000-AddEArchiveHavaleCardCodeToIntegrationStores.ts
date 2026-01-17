
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEArchiveHavaleCardCodeToIntegrationStores1768610600000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'e_archive_havale_card_code',
                type: 'varchar',
                length: '100',
                isNullable: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('integration_stores', 'e_archive_havale_card_code');
    }
}
