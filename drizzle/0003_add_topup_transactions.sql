CREATE TABLE "topup_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"flip_bill_id" text NOT NULL UNIQUE,
	"flip_bill_link" text,
	"amount" integer NOT NULL,
	"credits" integer NOT NULL,
	"status" text NOT NULL DEFAULT 'PENDING',
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "topup_transactions" ADD CONSTRAINT "topup_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE public.topup_transactions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "Allow read access to own transactions" ON public.topup_transactions
  FOR SELECT USING (auth.uid()::text = user_id);
--> statement-breakpoint
CREATE POLICY "Allow insert for authenticated users" ON public.topup_transactions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
