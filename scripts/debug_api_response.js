import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateApiFetch() {
  // 1. Get the latest chat ID
  const { data: chats } = await supabase
    .from('chats')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!chats || chats.length === 0) {
    console.log("No chats found.");
    return;
  }

  const chatId = chats[0].id;
  console.log(`Fetching messages for Chat ID: ${chatId}`);

  // 2. Simulate the DB query done in /api/messages
  // Note: The API uses Drizzle, here we use Supabase client for simplicity, 
  // but the underlying data is the same.
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true }); // API orders by ASC

  if (error) {
    console.error("Error:", error);
    return;
  }

  // 3. Print the "attachments" field specifically to see its structure
  messages.forEach(msg => {
    console.log(`[${msg.role}] Attachments Type: ${typeof msg.attachments}`);
    console.log(`[${msg.role}] Attachments Value:`, JSON.stringify(msg.attachments, null, 2));
  });
}

simulateApiFetch();
