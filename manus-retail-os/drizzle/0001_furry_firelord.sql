CREATE TABLE `assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`assetType` enum('phone','computer','vehicle','fire_extinguisher','furniture','internet_service','rental','insurance','other') NOT NULL,
	`serialNumber` varchar(128),
	`storeId` int,
	`assignedTo` int,
	`purchaseDate` timestamp,
	`expiryDate` timestamp,
	`renewalDate` timestamp,
	`value` decimal(12,2),
	`status` enum('active','maintenance','retired','lost') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`campaignType` enum('discount','voucher','loyalty_bonus','flash_sale') NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`status` enum('draft','active','paused','completed') NOT NULL DEFAULT 'draft',
	`targetAudience` json,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`parentId` int,
	`imageUrl` text,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`label` varchar(64) DEFAULT 'home',
	`addressLine1` varchar(255) NOT NULL,
	`addressLine2` varchar(255),
	`city` varchar(128),
	`region` varchar(128),
	`postalCode` varchar(32),
	`country` varchar(64) DEFAULT 'Mauritius',
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(128) NOT NULL,
	`lastName` varchar(128),
	`email` varchar(320),
	`phone` varchar(32),
	`whatsappPhone` varchar(32),
	`dateOfBirth` timestamp,
	`gender` enum('male','female','other','unspecified') DEFAULT 'unspecified',
	`notes` text,
	`tags` json,
	`preferredStoreId` int,
	`whatsappOptIn` boolean NOT NULL DEFAULT false,
	`totalSpent` decimal(14,2) DEFAULT '0.00',
	`totalOrders` int DEFAULT 0,
	`lastOrderAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `device_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`userId` int NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	`ipAddress` varchar(64),
	CONSTRAINT `device_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`deviceType` enum('pos','staff_mobile','desktop','kiosk','kitchen_display') NOT NULL,
	`storeId` int NOT NULL,
	`assignedUserId` int,
	`hardwareId` varchar(255),
	`osInfo` varchar(255),
	`appVersion` varchar(64),
	`provisioningCode` varchar(128),
	`status` enum('active','inactive','revoked','ghost') NOT NULL DEFAULT 'inactive',
	`lastSeenAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` enum('transport','bus_fare','supplies','meals','other') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`description` text,
	`receiptUrl` text,
	`status` enum('pending','approved','rejected','paid') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_levels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`warehouseId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`reorderLevel` int DEFAULT 10,
	`reorderQuantity` int DEFAULT 50,
	`lastCountedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_levels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leave_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`leaveType` enum('annual','sick','personal','training','unpaid') NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`reason` text,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`tierId` int,
	`pointsBalance` int NOT NULL DEFAULT 0,
	`lifetimePoints` int NOT NULL DEFAULT 0,
	`lifetimeRedeemed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loyalty_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`triggerType` enum('points_earned','orders_count','total_spent','tier_upgrade') NOT NULL,
	`triggerValue` int NOT NULL,
	`rewardType` enum('bonus_points','voucher','notification') NOT NULL,
	`rewardValue` varchar(255),
	`whatsappTemplate` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyalty_milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`minPoints` int NOT NULL DEFAULT 0,
	`multiplier` decimal(4,2) DEFAULT '1.00',
	`benefits` json,
	`color` varchar(16),
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyalty_tiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`customerId` int NOT NULL,
	`type` enum('earn','redeem','adjust','expire','bonus') NOT NULL,
	`points` int NOT NULL,
	`balanceAfter` int NOT NULL,
	`orderId` int,
	`description` text,
	`performedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyalty_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetId` int NOT NULL,
	`description` text NOT NULL,
	`imageUrl` text,
	`cost` decimal(12,2),
	`performedBy` int,
	`scheduledDate` timestamp,
	`completedDate` timestamp,
	`status` enum('scheduled','in_progress','completed') NOT NULL DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `maintenance_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientType` enum('customer','staff') NOT NULL,
	`recipientId` int NOT NULL,
	`channel` enum('whatsapp','email','push','sms') NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text,
	`status` enum('sent','failed','pending') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`sku` varchar(64),
	`quantity` int NOT NULL,
	`unitPrice` decimal(12,2) NOT NULL,
	`discountAmount` decimal(12,2) DEFAULT '0.00',
	`taxAmount` decimal(12,2) DEFAULT '0.00',
	`totalPrice` decimal(12,2) NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(64) NOT NULL,
	`storeId` int NOT NULL,
	`customerId` int,
	`userId` int NOT NULL,
	`deviceId` int,
	`tillSessionId` int,
	`channel` enum('pos','online','whatsapp','phone') NOT NULL DEFAULT 'pos',
	`status` enum('pending','completed','refunded','partially_refunded','cancelled','on_hold') NOT NULL DEFAULT 'pending',
	`subtotal` decimal(14,2) NOT NULL,
	`taxAmount` decimal(14,2) DEFAULT '0.00',
	`discountAmount` decimal(14,2) DEFAULT '0.00',
	`totalAmount` decimal(14,2) NOT NULL,
	`loyaltyPointsEarned` int DEFAULT 0,
	`loyaltyPointsRedeemed` int DEFAULT 0,
	`notes` text,
	`offlineSyncId` varchar(128),
	`syncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`method` enum('cash','card','qr','mobile_money','voucher','loyalty_points','split') NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`reference` varchar(255),
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'completed',
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`productId` int,
	`categoryId` int,
	`discountType` enum('percentage','fixed','buy_x_get_y') NOT NULL,
	`discountValue` decimal(12,2) NOT NULL,
	`minQuantity` int DEFAULT 1,
	`startDate` timestamp,
	`endDate` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku` varchar(64) NOT NULL,
	`barcode` varchar(128),
	`name` varchar(255) NOT NULL,
	`description` text,
	`categoryId` int,
	`price` decimal(12,2) NOT NULL,
	`costPrice` decimal(12,2),
	`taxRate` decimal(5,2) DEFAULT '15.00',
	`unit` varchar(32) DEFAULT 'each',
	`imageUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`isRecurring` boolean NOT NULL DEFAULT false,
	`loyaltyPointsEarn` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`reason` text,
	`processedBy` int NOT NULL,
	`status` enum('pending','approved','completed','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `refunds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`storeId` int NOT NULL,
	`shiftDate` timestamp NOT NULL,
	`startTime` varchar(8) NOT NULL,
	`endTime` varchar(8) NOT NULL,
	`status` enum('scheduled','approved','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`approvedBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`employeeCode` varchar(32),
	`department` varchar(128),
	`position` varchar(128),
	`hireDate` timestamp,
	`emergencyContact` varchar(255),
	`emergencyPhone` varchar(32),
	`bankAccountNumber` varchar(64),
	`skills` json,
	`hobbies` text,
	`bio` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_adjustments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`warehouseId` int NOT NULL,
	`adjustmentType` enum('received','sold','returned','damaged','counted','transferred','write_off') NOT NULL,
	`quantity` int NOT NULL,
	`previousQuantity` int NOT NULL,
	`newQuantity` int NOT NULL,
	`reason` text,
	`performedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_adjustments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(32) NOT NULL,
	`address` text,
	`phone` varchar(32),
	`email` varchar(320),
	`timezone` varchar(64) DEFAULT 'UTC',
	`currency` varchar(8) DEFAULT 'MUR',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stores_id` PRIMARY KEY(`id`),
	CONSTRAINT `stores_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`assignedTo` int,
	`assignedBy` int NOT NULL,
	`storeId` int,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`dueDate` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `till_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` int NOT NULL,
	`userId` int NOT NULL,
	`storeId` int NOT NULL,
	`openingBalance` decimal(12,2) NOT NULL,
	`closingBalance` decimal(12,2),
	`expectedBalance` decimal(12,2),
	`discrepancy` decimal(12,2),
	`discrepancyNote` text,
	`status` enum('open','closed','reconciled') NOT NULL DEFAULT 'open',
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`reconciliationPdfUrl` text,
	CONSTRAINT `till_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `utility_bills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeId` int NOT NULL,
	`billType` enum('electricity','water','internet','rent','insurance','other') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`billingPeriod` varchar(32),
	`dueDate` timestamp,
	`paidDate` timestamp,
	`receiptUrl` text,
	`status` enum('pending','paid','overdue') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `utility_bills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vouchers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`campaignId` int,
	`discountType` enum('percentage','fixed') NOT NULL,
	`discountValue` decimal(12,2) NOT NULL,
	`minOrderAmount` decimal(12,2),
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`validFrom` timestamp,
	`validUntil` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vouchers_id` PRIMARY KEY(`id`),
	CONSTRAINT `vouchers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`storeId` int,
	`address` text,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `warehouses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warnings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`issuedBy` int NOT NULL,
	`severity` enum('verbal','written','final','termination') NOT NULL,
	`reason` text NOT NULL,
	`voiceRecordingUrl` text,
	`signatureUrl` text,
	`acknowledged` boolean NOT NULL DEFAULT false,
	`acknowledgedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `warnings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int,
	`phone` varchar(32) NOT NULL,
	`direction` enum('inbound','outbound') NOT NULL,
	`templateId` int,
	`messageType` enum('text','template','media','interactive') NOT NULL DEFAULT 'text',
	`content` text,
	`mediaUrl` text,
	`status` enum('queued','sent','delivered','read','failed') NOT NULL DEFAULT 'queued',
	`externalMessageId` varchar(255),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsapp_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('receipt','loyalty','promotion','support','booking','general') NOT NULL,
	`bodyTemplate` text NOT NULL,
	`variables` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsapp_templates_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','manager','staff','customer') NOT NULL DEFAULT 'staff';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `storeId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;