CREATE TABLE `cancellation_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subscriptionId` int NOT NULL,
	`providerEmail` varchar(320) NOT NULL,
	`status` enum('pending','email_sent','follow_up_sent','confirmed','failed') NOT NULL DEFAULT 'pending',
	`emailSubject` varchar(500),
	`emailBody` text,
	`followUpCount` int NOT NULL DEFAULT 0,
	`lastSentAt` timestamp,
	`confirmedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cancellation_requests_id` PRIMARY KEY(`id`)
);
