CREATE TABLE `auth_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`until` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_initial_coordinator` ON `accounts` (`role`) WHERE "accounts"."role" = 'coordinator';