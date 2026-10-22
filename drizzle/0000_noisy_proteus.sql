CREATE TABLE `scores` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`size` integer NOT NULL,
	`moves` integer NOT NULL,
	`hints` integer NOT NULL,
	`elapsed_ms` integer NOT NULL,
	`score` integer NOT NULL,
	`jti` text NOT NULL,
	`created_at_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scores_jti_idx` ON `scores` (`jti`);--> statement-breakpoint
CREATE INDEX `scores_size_idx` ON `scores` (`size`);--> statement-breakpoint
CREATE INDEX `scores_user_size_idx` ON `scores` (`user_id`,`size`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text,
	`display_name` text NOT NULL,
	`image_url` text,
	`updated_at_ms` integer NOT NULL
);
