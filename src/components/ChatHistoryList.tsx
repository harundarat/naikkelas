"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Chat {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatHistoryListProps {
  chats: Chat[];
  onSelectChat: (chatId: string) => void;
  activeChatId?: string | null;
}

export default function ChatHistoryList({ chats, onSelectChat, activeChatId }: ChatHistoryListProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="px-3 space-y-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))
          ) : chats.length > 0 ? (
            chats.map((chat) => (
              <Button
                key={chat.id}
                variant="ghost"
                onClick={() => onSelectChat(chat.id)}
                className={cn(
                  "w-full justify-start gap-2 h-8 text-xs truncate transition-all duration-200 font-medium group",
                  activeChatId === chat.id
                    ? "bg-cyan-100/80 text-cyan-700 hover:bg-cyan-200/80 hover:text-cyan-800"
                    : "text-muted-foreground hover:bg-purple-50 hover:text-purple-700"
                )}
              >
                <MessageSquareText 
                  className={cn(
                    "w-3.5 h-3.5 flex-shrink-0 transition-colors",
                    activeChatId === chat.id ? "text-cyan-600" : "group-hover:text-purple-600"
                  )} 
                />
                <span className="truncate">{chat.title}</span>
              </Button>
            ))
          ) : (
            <p className="p-4 text-xs text-center text-muted-foreground">
              No chat history.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}