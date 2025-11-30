import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { db } from '@/db';
import { messages, chats } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();

        // Get the current user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;

        // Query messages with attachments (AI-generated media)
        const mediaMessages = await db
            .select({
                messageId: messages.id,
                content: messages.content,
                attachments: messages.attachments,
                createdAt: messages.createdAt,
                chatId: chats.id,
                chatTitle: chats.title,
            })
            .from(messages)
            .innerJoin(chats, eq(messages.chatId, chats.id))
            .where(
                and(
                    eq(messages.userId, userId),
                    eq(messages.role, 'ai'),
                    sql`jsonb_array_length(${messages.attachments}) > 0`
                )
            )
            .orderBy(desc(messages.createdAt));

        // Process and group media by date
        const now = new Date();
        const groups: {
            [key: string]: {
                label: string;
                items: Array<{
                    id: string;
                    url: string;
                    type: string;
                    chatId: string;
                    chatTitle: string;
                    messageId: string;
                    createdAt: string;
                }>;
            };
        } = {
            today: { label: 'Today', items: [] },
            yesterday: { label: 'Yesterday', items: [] },
            lastWeek: { label: 'Last Week', items: [] },
            lastMonth: { label: 'Last Month', items: [] },
            older: { label: 'Older', items: [] },
        };

        // Process each message and extract media
        mediaMessages.forEach((msg) => {
            const attachments = msg.attachments as Array<{ type: string; url: string }>;

            if (!attachments || attachments.length === 0) return;

            attachments.forEach((attachment, index) => {
                const createdAt = new Date(msg.createdAt);
                const diffMs = now.getTime() - createdAt.getTime();
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                const mediaItem = {
                    id: `${msg.messageId}-${index}`,
                    url: attachment.url,
                    type: attachment.type,
                    chatId: msg.chatId,
                    chatTitle: msg.chatTitle,
                    messageId: msg.messageId,
                    createdAt: msg.createdAt.toISOString(),
                };

                // Group by date range
                if (diffDays === 0) {
                    groups.today.items.push(mediaItem);
                } else if (diffDays === 1) {
                    groups.yesterday.items.push(mediaItem);
                } else if (diffDays <= 7) {
                    groups.lastWeek.items.push(mediaItem);
                } else if (diffDays <= 30) {
                    groups.lastMonth.items.push(mediaItem);
                } else {
                    groups.older.items.push(mediaItem);
                }
            });
        });

        // Convert to array and filter out empty groups
        const groupsArray = Object.values(groups).filter(
            (group) => group.items.length > 0
        );

        return NextResponse.json({ groups: groupsArray });
    } catch (error) {
        console.error('Error fetching library media:', error);
        return NextResponse.json(
            { error: 'Failed to fetch media library' },
            { status: 500 }
        );
    }
}
