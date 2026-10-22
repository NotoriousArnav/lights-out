CREATE TABLE "scores" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"size" integer NOT NULL,
	"moves" integer NOT NULL,
	"hints" integer NOT NULL,
	"elapsed_ms" integer NOT NULL,
	"score" integer NOT NULL,
	"jti" text NOT NULL,
	"created_at_ms" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text,
	"display_name" text NOT NULL,
	"image_url" text,
	"updated_at_ms" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scores_jti_idx" ON "scores" USING btree ("jti");--> statement-breakpoint
CREATE INDEX "scores_size_idx" ON "scores" USING btree ("size");--> statement-breakpoint
CREATE INDEX "scores_user_size_idx" ON "scores" USING btree ("user_id","size");