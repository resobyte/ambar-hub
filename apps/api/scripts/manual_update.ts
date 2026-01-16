import 'reflect-metadata';
import { AppDataSource } from '../src/database/data-source';

async function run() {
    console.log("Initializing DataSource...");
    await AppDataSource.initialize();

    console.log("Adding columns to product_stores...");
    try {
        await AppDataSource.query("ALTER TABLE `product_stores` ADD COLUMN `sellable_quantity` int NOT NULL DEFAULT '0'");
        console.log("Added sellable_quantity");
    } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("sellable_quantity already exists");
        } else {
            console.error(e);
        }
    }

    try {
        await AppDataSource.query("ALTER TABLE `product_stores` ADD COLUMN `reservable_quantity` int NOT NULL DEFAULT '0'");
        console.log("Added reservable_quantity");
    } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("reservable_quantity already exists");
        } else {
            console.error(e);
        }
    }

    try {
        await AppDataSource.query("ALTER TABLE `product_stores` ADD COLUMN `committed_quantity` int NOT NULL DEFAULT '0'");
        console.log("Added committed_quantity");
    } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("committed_quantity already exists");
        } else {
            console.error(e);
        }
    }

    try {
        await AppDataSource.query("ALTER TABLE `orders` ADD COLUMN `cargo_label_zpl` text NULL");
        console.log("Added cargo_label_zpl");
    } catch (e: any) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("cargo_label_zpl already exists");
        } else {
            console.error(e);
        }
    }

    console.log("Done.");
    process.exit(0);
}

run();
