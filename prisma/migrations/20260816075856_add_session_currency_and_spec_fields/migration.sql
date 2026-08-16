-- AlterTable
ALTER TABLE `account` ADD COLUMN `currentBalance` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `description` VARCHAR(200) NULL;

-- AlterTable
ALTER TABLE `transaction` ADD COLUMN `receiveAmount` DECIMAL(18, 2) NULL;

-- CreateTable
CREATE TABLE `session` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_session_token`(`token`),
    INDEX `idx_session_user_id`(`userId`),
    INDEX `idx_session_expires_at`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `currency` (
    `code` VARCHAR(3) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(8) NOT NULL,
    `decimalDigits` INTEGER NOT NULL DEFAULT 2,
    `region` VARCHAR(2) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `idx_currency_sort_order`(`sortOrder`),
    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exchange_rate` (
    `id` VARCHAR(191) NOT NULL,
    `base` VARCHAR(3) NOT NULL,
    `code` VARCHAR(3) NOT NULL,
    `rate` DECIMAL(24, 8) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `idx_exchange_rate_base`(`base`),
    UNIQUE INDEX `uq_exchange_rate_base_code`(`base`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `session` ADD CONSTRAINT `session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
