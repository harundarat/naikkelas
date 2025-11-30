CREATE TABLE "user_credits" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL UNIQUE,
	"credits" integer NOT NULL DEFAULT 10,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "Allow read access to own credits" ON public.user_credits
  FOR SELECT USING (auth.uid()::text = user_id);
