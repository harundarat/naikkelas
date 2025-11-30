-- Enable Row-Level Security for all relevant tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_summary ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, to ensure a clean slate
DROP POLICY IF EXISTS "Allow read access to own user data" ON public.users;
DROP POLICY IF EXISTS "Allow update access to own user data" ON public.users;
DROP POLICY IF EXISTS "Allow all access to own chats" ON public.chats;
DROP POLICY IF EXISTS "Allow all access to own messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all access to own facts" ON public.facts;
DROP POLICY IF EXISTS "Allow all access to own conversation summaries" ON public.conversation_summary;

-- Create policies for the 'users' table
CREATE POLICY "Allow read access to own user data" ON public.users
  FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Allow update access to own user data" ON public.users
  FOR UPDATE USING (auth.uid()::text = id) WITH CHECK (auth.uid()::text = id);

-- Create policies for the 'chats' table
CREATE POLICY "Allow all access to own chats" ON public.chats
  FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- Create policies for the 'messages' table
-- Users can access messages if they are the owner of the message and the chat
CREATE POLICY "Allow all access to own messages" ON public.messages
  FOR ALL USING (
    auth.uid()::text = user_id AND
    chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid()::text)
  ) WITH CHECK (
    auth.uid()::text = user_id AND
    chat_id IN (SELECT id FROM chats WHERE user_id = auth.uid()::text)
  );

-- Create policies for the 'facts' table
CREATE POLICY "Allow all access to own facts" ON public.facts
  FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- Create policies for the 'conversation_summary' table
CREATE POLICY "Allow all access to own conversation summaries" ON public.conversation_summary
  FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
