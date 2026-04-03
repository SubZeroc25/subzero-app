CREATE TABLE `email_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('gmail','outlook') NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`expiresAt` timestamp,
	`email` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `stripeSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `stripeCurrentPeriodEnd` timestamp;