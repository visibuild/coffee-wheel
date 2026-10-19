CREATE TABLE "admins" (
	"email" text PRIMARY KEY NOT NULL,
	"added_by" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"weight" double precision NOT NULL,
	"color" text,
	"emoji" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "people_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "slack_emojis" (
	"name" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "spins" (
	"id" serial PRIMARY KEY NOT NULL,
	"winner_id" integer NOT NULL,
	"spun_by" text NOT NULL,
	"chance" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"undone_at" timestamp with time zone,
	"undone_by" text,
	"slack_channel" text,
	"slack_file_id" text,
	"slack_ts" text
);
--> statement-breakpoint
CREATE TABLE "weight_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"old_share" double precision NOT NULL,
	"new_share" double precision NOT NULL,
	"changed_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "spins" ADD CONSTRAINT "spins_winner_id_people_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_changes" ADD CONSTRAINT "weight_changes_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;