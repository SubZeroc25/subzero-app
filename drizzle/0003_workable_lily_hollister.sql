CREATE TABLE `promo_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`description` varchar(255),
	`type` enum('pro_upgrade','discount') NOT NULL DEFAULT 'pro_upgrade',
	`discountPercent` int,
	`maxUses` int NOT NULL DEFAULT 1,
	`usedCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`expiresAt` timestamp,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promo_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `promo_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `discountPercent` int;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `discountAmount` decimal(10,2);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `discountNote` varchar(255);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `discountExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `proGrantedBy` enum('stripe','admin','promo');--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `proGrantedAt` timestamp;