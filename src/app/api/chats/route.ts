import { NextResponse, NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { db } from '@/db';
import { chats, messages } from '@/db/schema';
import { eq, desc, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeInitialMessages = searchParams.get('include_initial_messages') === 'true';

    // 1. Fetch all of the user's chats, sorted by the most recently updated
    const userChats = await db.query.chats.findMany({
      where: eq(chats.userId, user.id),
      orderBy: desc(chats.updatedAt),
    });

    // 2. If the user has chats AND the flag is set, fetch messages for the most recent one
    if (userChats.length > 0 && includeInitialMessages) {
      const mostRecentChatId = userChats[0].id;
      const recentChatMessages = await db.query.messages.findMany({
        where: eq(messages.chatId, mostRecentChatId),
        orderBy: asc(messages.createdAt),
      });
      
      // 3a. Return the combined payload
      return NextResponse.json({
        chats: userChats,
        initialMessages: recentChatMessages,
      });
    }

    // 3b. Otherwise, return just the list of chats
    return NextResponse.json({
      chats: userChats,
      initialMessages: [], // Always return an empty array if not requested
    });

  } catch (error: any) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}
