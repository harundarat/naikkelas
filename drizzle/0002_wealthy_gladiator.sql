CREATE TABLE "topup_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"flip_bill_id" text NOT NULL,
	"flip_bill_link" text,
	"amount" integer NOT NULL,
	"credits" integer NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "topup_transactions_flip_bill_id_unique" UNIQUE("flip_bill_id")
);
--> statement-breakpoint
ALTER TABLE "topup_transactions" ADD CONSTRAINT "topup_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;