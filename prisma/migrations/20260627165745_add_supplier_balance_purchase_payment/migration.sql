-- AlterTable
ALTER TABLE `payments` ADD COLUMN `supplier_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `purchases` ADD COLUMN `paid` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `payment_method` ENUM('CASH', 'QRIS', 'TRANSFER', 'TEMPO') NOT NULL DEFAULT 'CASH';

-- AlterTable
ALTER TABLE `suppliers` ADD COLUMN `balance` DECIMAL(15, 2) NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
