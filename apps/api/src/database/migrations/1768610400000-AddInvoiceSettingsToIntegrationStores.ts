import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddInvoiceSettingsToIntegrationStores1768610400000 implements MigrationInterface {
    name = 'AddInvoiceSettingsToIntegrationStores1768610400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Genel Fatura Ayarları
        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'invoice_transaction_code',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'has_micro_export',
                type: 'boolean',
                default: false,
            }),
        );

        // E-Arşiv Ayarları
        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'e_archive_bulk_customer',
                type: 'boolean',
                default: false,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'e_archive_card_code',
                type: 'varchar',
                length: '100',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'e_archive_account_code',
                type: 'varchar',
                length: '100',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'e_archive_serial_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'e_archive_sequence_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        // E-Fatura Ayarları
        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'e_invoice_bulk_customer',
                type: 'boolean',
                default: false,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'e_invoice_card_code',
                type: 'varchar',
                length: '100',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'e_invoice_account_code',
                type: 'varchar',
                length: '100',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'e_invoice_serial_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'e_invoice_sequence_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        // Toplu Faturalama Ayarları
        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'bulk_e_archive_serial_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'bulk_e_archive_sequence_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'bulk_e_invoice_serial_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'bulk_e_invoice_sequence_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        // İade Gider Pusulası Ayarları
        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'refund_ev_e_archive_serial_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'refund_ev_e_archive_sequence_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'refund_ev_e_invoice_serial_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'refund_ev_e_invoice_sequence_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        // Mikro İhracat Ayarları
        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'micro_export_transaction_code',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'micro_export_account_code',
                type: 'varchar',
                length: '100',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'micro_export_az_account_code',
                type: 'varchar',
                length: '100',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'micro_export_e_archive_serial_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'micro_export_e_archive_sequence_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'micro_export_bulk_serial_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'micro_export_bulk_sequence_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'micro_export_refund_serial_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );

        await queryRunner.addColumn(
            'integration_stores',
            new TableColumn({
                name: 'micro_export_refund_sequence_no',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }),
        );
    }


    public async down(queryRunner: QueryRunner): Promise<void> {
        // Mikro İhracat Ayarları
        await queryRunner.dropColumn('integration_stores', 'micro_export_refund_sequence_no');
        await queryRunner.dropColumn('integration_stores', 'micro_export_refund_serial_no');
        await queryRunner.dropColumn('integration_stores', 'micro_export_bulk_sequence_no');
        await queryRunner.dropColumn('integration_stores', 'micro_export_bulk_serial_no');
        await queryRunner.dropColumn('integration_stores', 'micro_export_e_archive_sequence_no');
        await queryRunner.dropColumn('integration_stores', 'micro_export_e_archive_serial_no');
        await queryRunner.dropColumn('integration_stores', 'micro_export_az_account_code');
        await queryRunner.dropColumn('integration_stores', 'micro_export_account_code');
        await queryRunner.dropColumn('integration_stores', 'micro_export_transaction_code');

        // İade Gider Pusulası Ayarları
        await queryRunner.dropColumn('integration_stores', 'refund_ev_e_invoice_sequence_no');
        await queryRunner.dropColumn('integration_stores', 'refund_ev_e_invoice_serial_no');
        await queryRunner.dropColumn('integration_stores', 'refund_ev_e_archive_sequence_no');
        await queryRunner.dropColumn('integration_stores', 'refund_ev_e_archive_serial_no');

        // Toplu Faturalama Ayarları
        await queryRunner.dropColumn('integration_stores', 'bulk_e_invoice_sequence_no');
        await queryRunner.dropColumn('integration_stores', 'bulk_e_invoice_serial_no');
        await queryRunner.dropColumn('integration_stores', 'bulk_e_archive_sequence_no');
        await queryRunner.dropColumn('integration_stores', 'bulk_e_archive_serial_no');

        // E-Fatura Ayarları
        await queryRunner.dropColumn('integration_stores', 'e_invoice_sequence_no');
        await queryRunner.dropColumn('integration_stores', 'e_invoice_serial_no');
        await queryRunner.dropColumn('integration_stores', 'e_invoice_account_code');
        await queryRunner.dropColumn('integration_stores', 'e_invoice_card_code');
        await queryRunner.dropColumn('integration_stores', 'e_invoice_bulk_customer');

        // E-Arşiv Ayarları
        await queryRunner.dropColumn('integration_stores', 'e_archive_sequence_no');
        await queryRunner.dropColumn('integration_stores', 'e_archive_serial_no');
        await queryRunner.dropColumn('integration_stores', 'e_archive_account_code');
        await queryRunner.dropColumn('integration_stores', 'e_archive_card_code');
        await queryRunner.dropColumn('integration_stores', 'e_archive_bulk_customer');

        // Genel Fatura Ayarları
        await queryRunner.dropColumn('integration_stores', 'has_micro_export');
        await queryRunner.dropColumn('integration_stores', 'invoice_transaction_code');
    }
}
