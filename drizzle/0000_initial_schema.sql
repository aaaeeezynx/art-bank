CREATE TABLE `artwork_operations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`artworkId` int NOT NULL,
	`artworkNo` varchar(32) NOT NULL,
	`operationType` enum('入庫','出庫','暫放','借展','修護','歸庫','位置變更') NOT NULL,
	`operatorName` varchar(128),
	`operationDate` date NOT NULL,
	`loanStartDate` date,
	`loanEndDate` date,
	`loanOrganization` varchar(256),
	`conservationInstitution` varchar(256),
	`conservationDueDate` date,
	`outReason` varchar(512),
	`fromLocationCode` varchar(32),
	`toLocationCode` varchar(32),
	`toLocationId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `artwork_operations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `artwork_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`artworkId` int NOT NULL,
	`photoType` enum('artwork','condition') NOT NULL,
	`dataUrl` text NOT NULL,
	`caption` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `artwork_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `artworks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`artworkNo` varchar(32) NOT NULL,
	`title` varchar(256) NOT NULL,
	`titleNotProvided` tinyint NOT NULL DEFAULT 0,
	`artist` varchar(128) NOT NULL,
	`collector` varchar(128),
	`medium` enum('canvas','paper','wood','metal','textile','mixed') NOT NULL,
	`mediumCode` varchar(4) NOT NULL,
	`status` enum('在庫','出庫','暫放','借展','修護') NOT NULL DEFAULT '在庫',
	`locationId` int,
	`locationCode` varchar(32),
	`entryDate` date NOT NULL,
	`era` date,
	`registrar` varchar(128),
	`receiveDate` date,
	`registrationDate` date,
	`dimensionLength` decimal(10,2),
	`dimensionWidth` decimal(10,2),
	`dimensionHeight` decimal(10,2),
	`category` json,
	`categoryOther` text,
	`support` text,
	`mediaDescription` text,
	`conditionData` json,
	`thumbnail` text,
	`notes` text,
	`loanStartDate` date,
	`loanEndDate` date,
	`loanOrganization` varchar(256),
	`conservationInstitution` varchar(256),
	`conservationDueDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `artworks_id` PRIMARY KEY(`id`),
	CONSTRAINT `artworks_artworkNo_unique` UNIQUE(`artworkNo`)
);
--> statement-breakpoint
CREATE TABLE `storage_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`warehouseNo` varchar(16) NOT NULL,
	`zone` varchar(4) NOT NULL,
	`shelfNo` varchar(4) NOT NULL,
	`levelNo` varchar(4) NOT NULL,
	`locationCode` varchar(32) NOT NULL,
	`description` text,
	`isOccupied` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storage_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`passwordHash` text,
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
