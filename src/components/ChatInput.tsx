/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, ImageIcon, Video, Send, Wand2 } from "lucide-react";

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  attachedFiles: File[];
  setAttachedFiles: (files: File[]) => void;
  handleSendMessage: () => void;
  handleFileAttach: (type: "image" | "video") => void;
  handleFetchFromAPI?: () => void; // Made optional as we might remove it or keep for backward compat
  onOpenPromptBuilder?: () => void; // New prop
  isConversationActive?: boolean;
}

export default function ChatInput({
  message,
  setMessage,
  attachedFiles,
  setAttachedFiles,
  handleSendMessage,
  handleFileAttach,
  handleFetchFromAPI,
  onOpenPromptBuilder,
  isConversationActive = false, // Default to false
}: ChatInputProps) {
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  return (
    <div className="w-full max-w-2xl relative group z-0">
      <div className="absolute -inset-0.5 -z-10 bg-gradient-to-r from-purple-500/30 via-blue-500/30 to-purple-500/30 opacity-40 scale-100 blur-2xl transition-all duration-500 group-hover:opacity-100 group-hover:scale-[1.01] rounded-xl" />
      <div className="relative rounded-xl bg-white/80 backdrop-blur-xl border border-gray-200/50 p-5 transition-all duration-500 z-10">
        {attachedFiles.length > 0 && (
          <div className="mb-3 pb-3 border-b border-gray-200/50">
            <div className="flex flex-wrap gap-1.5">
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-50/50 text-[10px]"
                >
                  <Paperclip className="w-2.5 h-2.5 text-purple-500" />
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button
                    onClick={() =>
                      setAttachedFiles(files =>
                        files.filter((_, i) => i !== index)
                      )
                    }
                    className="text-gray-400 hover:text-red-500 text-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            // Allow default behavior for Enter (line break)
            e.stopPropagation();
          }}
          placeholder="Type a message or command to the AI..."
          className={`w-full resize-none bg-transparent border-0 focus:outline-none focus:ring-0 text-sm placeholder:text-muted-foreground/60 mb-3 ${isConversationActive ? 'min-h-[48px] max-h-[48px] md:min-h-[96px] md:max-h-[unset]' : 'min-h-[96px]'
            }`}
        />

        <div className="flex items-center justify-between gap-2 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {/* Desktop: Show Image/Video buttons */}
            <Button
              onClick={() => handleFileAttach("image")}
              variant="ghost"
              size="sm"
              className="hidden md:flex rounded-full gap-1.5 h-7 px-2.5 hover:bg-purple-50 hover:text-purple-700 transition-all duration-200"
            >
              <ImageIcon className="w-3 h-3" />
              <span className="text-[10px]">Image</span>
            </Button>

            <Button
              onClick={() => handleFileAttach("video")}
              variant="ghost"
              size="sm"
              className="hidden md:flex rounded-full gap-1.5 h-7 px-2.5 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200"
            >
              <Video className="w-3 h-3" />
              <span className="text-[10px]">Video</span>
            </Button>

            {/* Mobile: Show Attach button with popup */}
            <div className="relative md:hidden">
              <Button
                onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                variant="ghost"
                size="sm"
                className="rounded-full gap-1.5 h-7 px-2.5 hover:bg-purple-50 hover:text-purple-700 transition-all duration-200"
              >
                <Paperclip className="w-3 h-3" />
                <span className="text-[10px]">Attach</span>
              </Button>

              {isAttachMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsAttachMenuOpen(false)}
                  />
                  <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200/50 py-1 z-20 min-w-[120px]">
                    <button
                      onClick={() => {
                        handleFileAttach("image");
                        setIsAttachMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-purple-50 flex items-center gap-2"
                    >
                      <ImageIcon className="w-3 h-3" />
                      Image
                    </button>
                    <button
                      onClick={() => {
                        handleFileAttach("video");
                        setIsAttachMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 flex items-center gap-2"
                    >
                      <Video className="w-3 h-3" />
                      Video
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!isConversationActive && onOpenPromptBuilder && (
              <Button
                onClick={onOpenPromptBuilder}
                variant="ghost"
                size="sm"
                className="rounded-full gap-1.5 h-7 px-2.5 hover:bg-purple-50 hover:text-purple-700 transition-all duration-200"
              >
                <Wand2 className="w-3 h-3" />
                <span className="text-[10px]">Use prompt builder</span>
              </Button>
            )}

            <Button
              type="button"
              onClick={() => handleSendMessage()}
              size="icon"
              className="relative group rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex-shrink-0 h-8 w-8 cursor-pointer overflow-hidden bg-transparent border-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-500 transition-opacity duration-300 opacity-100 group-hover:opacity-0" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-blue-600 transition-opacity duration-300 opacity-0 group-hover:opacity-100" />
              <Send className="w-3.5 h-3.5 relative z-10 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
