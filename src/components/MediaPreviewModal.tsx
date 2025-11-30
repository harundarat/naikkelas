/* eslint-disable @next/next/no-img-element */
"use client";

import { X, Eye } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogOverlay,
    DialogPortal,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    media: {
        url: string;
        type: string;
        chatTitle: string;
        createdAt: string;
        chatId: string;
        messageId: string;
    } | null;
    onNavigateToChat: (chatId: string, messageId: string) => void;
}

export default function MediaPreviewModal({
    isOpen,
    onClose,
    media,
    onNavigateToChat,
}: MediaPreviewModalProps) {
    if (!media) return null;

    const isVideo = media.type.startsWith("video/");
    const formattedDate = new Date(media.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    const handleViewChat = () => {
        onClose();
        onNavigateToChat(media.chatId, media.messageId);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogPortal>
                <DialogOverlay className="bg-black/80 backdrop-blur-sm" />
                <DialogContent
                    showCloseButton={false}
                    className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 border-none bg-transparent shadow-2xl"
                >
                    {/* Close Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all duration-200"
                    >
                        <X className="h-5 w-5" />
                    </Button>

                    {/* Media Display */}
                    <div className="relative flex flex-col items-center justify-center max-h-[85vh]">
                        {isVideo ? (
                            <video
                                src={media.url}
                                controls
                                autoPlay
                                className="max-h-[75vh] max-w-full rounded-lg shadow-2xl"
                            />
                        ) : (
                            <img
                                src={media.url}
                                alt="Preview"
                                className="max-h-[75vh] max-w-full rounded-lg shadow-2xl object-contain"
                            />
                        )}

                        {/* Media Info & Actions */}
                        <div className="mt-4 flex flex-col items-center gap-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-xl p-4 shadow-lg border border-gray-200/50">
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-foreground font-medium">
                                    {media.chatTitle}
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">{formattedDate}</span>
                            </div>

                            <Button
                                onClick={handleViewChat}
                                className="gap-2 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                            >
                                <Eye className="h-4 w-4" />
                                View in Chat
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </DialogPortal>
        </Dialog>
    );
}
