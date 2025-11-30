import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMessages() {
  console.log('Checking for recent chats and messages...');

  // Fetch the last 1 chat
  const { data: chats, error: chatError } = await supabase
    .from('chats')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (chatError) {
    console.error('Error fetching chats:', chatError);
  } else {
    console.log('Latest Chat:', chats[0]);
    if (chats.length > 0) {
        const chatId = chats[0].id;
        console.log(`Fetching messages for Chat ID: ${chatId}`);
        
        // Fetch messages for this chat
        const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (msgError) {
            console.error('Error fetching messages:', msgError);
        } else {
            console.log('Messages in this chat:', messages.length);
            messages.forEach(msg => {
                console.log(`- [${msg.role}] UserID: ${msg.user_id} | Content: ${msg.content.substring(0, 30)}...`);
            });
        }
    }
  }
}

checkMessages();
