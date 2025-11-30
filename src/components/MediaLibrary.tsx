"use client";

import { useState, useEffect } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import MediaGallery from "./MediaGallery";
import MediaPreviewModal from "./MediaPreviewModal";
import DateSection from "./DateSection";
import { Skeleton } from "@/components/ui/skeleton";

interface MediaItem {
    id: string;
    url: string;
    type: string;
    chatId: string;
    chatTitle: string;
    messageId: string;
    createdAt: string;
}

interface MediaGroup {
    label: string;
    items: MediaItem[];
}

interface MediaLibraryProps {
    onNavigateToChat: (chatId: string, messageId: string) => void;
}

export default function MediaLibrary({ onNavigateToChat }: MediaLibraryProps) {
    const [groups, setGroups] = useState<MediaGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    useEffect(() => {
        const fetchMedia = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch("/api/library");

                if (!response.ok) {
                    throw new Error("Failed to fetch media library");
                }

                const data = await response.json();
                setGroups(data.groups || []);
            } catch (err) {
                console.error("Error fetching media:", err);
                setError("Failed to load your media library. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchMedia();
    }, []);

    const handleItemClick = (item: MediaItem) => {
        setSelectedMedia(item);
        setIsPreviewOpen(true);
    };

    const handleClosePreview = () => {
        setIsPreviewOpen(false);
        setSelectedMedia(null);
    };

    const handleNavigateToChat = (chatId: string, messageId: string) => {
        onNavigateToChat(chatId, messageId);
    };

    // Loading State
    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <Skeleton className="h-8 w-32 mb-4" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="aspect-square rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="w-full max-w-7xl mx-auto px-4 py-6">
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <div className="rounded-full bg-red-50 p-4">
                        <ImageIcon className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{error}</h3>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Empty State
    if (groups.length === 0) {
        return (
            <div className="w-full max-w-7xl mx-auto px-4 py-6">
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <div className="rounded-full bg-purple-50 p-6">
                        <ImageIcon className="h-12 w-12 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">
                        No Media Yet
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                        Your generated images and videos will appear here. Start a
                        conversation and ask me to create something!
                    </p>
                </div>
            </div>
        );
    }

    // Content State
    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent mb-2">
                    Media Library
                </h2>
                <p className="text-sm text-muted-foreground">
                    All your AI-generated images and videos in one place
                </p>
            </div>

            {/* Gallery Groups */}
            <div className="space-y-8">
                {groups.map((group) => (
                    <div key={group.label}>
                        <DateSection label={group.label} count={group.items.length} />
                        <MediaGallery items={group.items} onItemClick={handleItemClick} />
                    </div>
                ))}
            </div>

            {/* Preview Modal */}
            <MediaPreviewModal
                isOpen={isPreviewOpen}
                onClose={handleClosePreview}
                media={selectedMedia}
                onNavigateToChat={handleNavigateToChat}
            />
        </div>
    );
}
