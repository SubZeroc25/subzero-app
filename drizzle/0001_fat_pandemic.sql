CREATE TABLE `scan_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(32) NOT NULL,
	`status` enum('pending','connecting','scanning','analyzing','completed','failed') NOT NULL DEFAULT 'pending',
	`emailsScanned` int NOT NULL DEFAULT 0,
	`subscriptionsFound` int NOT NULL DEFAULT 0,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `scan_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`provider` varchar(255) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`billingCycle` enum('monthly','yearly','weekly','quarterly','one-time') NOT NULL DEFAULT 'monthly',
	`category` enum('entertainment','productivity','cloud','finance','health','education','shopping','news','social','utilities','other') NOT NULL DEFAULT 'other',
	`status` enum('active','cancelled','trial','paused','expired') NOT NULL DEFAULT 'active',
	`nextRenewalDate` timestamp,
	`detectedFrom` varchar(32) NOT NULL DEFAULT 'manual',
	`logoUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`plan` enum('free','pro') NOT NULL DEFAULT 'free',
	`onboardingComplete` boolean NOT NULL DEFAULT false,
	`connectedGmail` boolean NOT NULL DEFAULT false,
	`connectedOutlook` boolean NOT NULL DEFAULT false,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`notificationsEnabled` boolean NOT NULL DEFAULT true,
	`scansThisMonth` int NOT NULL DEFAULT 0,
	`lastScanReset` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_userId_unique` UNIQUE(`userId`)
);
