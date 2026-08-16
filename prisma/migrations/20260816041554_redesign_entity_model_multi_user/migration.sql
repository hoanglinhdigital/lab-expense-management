/*
  Warnings:

  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Expense` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Expense` DROP FOREIGN KEY `Expense_categoryId_fkey`;

-- DropTable
DROP TABLE `Category`;

-- DropTable
DROP TABLE `Expense`;

-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `defaultCurrency` VARCHAR(3) NOT NULL DEFAULT 'VND',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `uq_user_email`(`email`),
    INDEX `idx_user_is_deleted_created_at`(`isDeleted`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('CASH', 'BANK_ACCOUNT', 'SAVING_ACCOUNT', 'E_WALLET', 'CREDIT_CARD', 'IC_CARD', 'INVESTMENT', 'OTHER') NOT NULL,
    `initialBalance` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'VND',
    `icon` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `idx_account_user_id_is_deleted`(`userId`, `isDeleted`),
    INDEX `idx_account_user_id_type_is_deleted`(`userId`, `type`, `isDeleted`),
    INDEX `idx_account_user_id_is_default`(`userId`, `isDefault`),
    UNIQUE INDEX `uq_account_user_id_name`(`userId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `category` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `scope` ENUM('SYSTEM', 'USER') NOT NULL DEFAULT 'USER',
    `parentId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `color` VARCHAR(9) NULL,
    `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `idx_category_user_id_type_is_deleted`(`userId`, `type`, `isDeleted`),
    INDEX `idx_category_scope_type_is_deleted`(`scope`, `type`, `isDeleted`),
    INDEX `idx_category_parent_id`(`parentId`),
    UNIQUE INDEX `uq_category_user_id_name_type`(`userId`, `name`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `idx_contact_user_id_is_deleted`(`userId`, `isDeleted`),
    UNIQUE INDEX `uq_contact_user_id_name`(`userId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaction` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('INCOME', 'EXPENSE', 'TRANSFER', 'BORROW', 'LEND') NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `note` TEXT NULL,
    `fromAccountId` VARCHAR(191) NOT NULL,
    `toAccountId` VARCHAR(191) NULL,
    `categoryId` VARCHAR(191) NULL,
    `contactId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `idx_transaction_user_id_is_deleted_date`(`userId`, `isDeleted`, `date`),
    INDEX `idx_transaction_user_id_type_date`(`userId`, `type`, `date`),
    INDEX `idx_transaction_user_id_category_id_date`(`userId`, `categoryId`, `date`),
    INDEX `idx_transaction_from_account_id_date`(`fromAccountId`, `date`),
    INDEX `idx_transaction_to_account_id_date`(`toAccountId`, `date`),
    INDEX `idx_transaction_user_id_contact_id_date`(`userId`, `contactId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `account` ADD CONSTRAINT `account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category` ADD CONSTRAINT `category_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `category` ADD CONSTRAINT `category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contact` ADD CONSTRAINT `contact_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction` ADD CONSTRAINT `transaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction` ADD CONSTRAINT `transaction_fromAccountId_fkey` FOREIGN KEY (`fromAccountId`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction` ADD CONSTRAINT `transaction_toAccountId_fkey` FOREIGN KEY (`toAccountId`) REFERENCES `account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction` ADD CONSTRAINT `transaction_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction` ADD CONSTRAINT `transaction_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contact`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
