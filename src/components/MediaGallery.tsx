/* eslint-disable @next/next/no-img-element */
"use client";

import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaItem {
    id: string;
    url: string;
    type: string;
    chatId: string;
    chatTitle: string;
    messageId: string;
    createdAt: string;
}

interface MediaGalleryProps {
    items: MediaItem[];
    onItemClick: (item: MediaItem) => void;
}

export default function MediaGallery({ items, onItemClick }: MediaGalleryProps) {
    if (items.length === 0) return null;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {items.map((item) => {
                const isVideo = item.type.startsWith("video/");

                return (
                    <button
                        key={item.id}
                        onClick={() => onItemClick(item)}
                        className={cn(
                            "group relative aspect-square overflow-hidden rounded-xl",
                            "bg-gray-100 dark:bg-gray-800",
                            "border border-gray-200/50 dark:border-gray-700/50",
                            "transition-all duration-300 ease-out",
                            "hover:scale-105 hover:shadow-xl hover:border-purple-300",
                            "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
                            "cursor-pointer"
                        )}
                    >
                        {/* Media Display */}
                        {isVideo ? (
                            <video
                                src={item.url}
                                className="absolute inset-0 h-full w-full object-cover"
                                muted
                            />
                        ) : (
                            <img
                                src={item.url}
                                alt={item.chatTitle}
                                className="absolute inset-0 h-full w-full object-cover"
                                loading="lazy"
                            />
                        )}

                        {/* Video Indicator */}
                        {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                                <div className="rounded-full bg-white/90 p-3 shadow-lg group-hover:scale-110 transition-transform">
                                    <Play className="h-6 w-6 text-purple-600 fill-purple-600" />
                                </div>
                            </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-white text-xs font-medium truncate">
                                    {item.chatTitle}
                                </p>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
