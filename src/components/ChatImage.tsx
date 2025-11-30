"use client";

import { useState, useRef } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function ChatImage({ src, alt, className }: ChatImageProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const handleDownload = async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    try {
      // Create a temporary anchor to trigger download
      const response = await fetch(src);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback for simple same-origin or allowed cors
      const link = document.createElement('a');
      link.href = src;
      link.download = `image-${Date.now()}.png`;
      link.target = "_blank";
      link.click();
    }
  };

  const handleTouchStart = () => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setIsPreviewOpen(true);
      // Haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click if it was a long press
    if (isLongPress.current) {
        e.stopPropagation();
        return;
    }
    // Toggle overlay
    setShowOverlay((prev) => !prev);
  };

  return (
    <>
      <div
        className={cn("relative group cursor-pointer overflow-hidden inline-block", className)}
        onMouseEnter={() => setShowOverlay(true)}
        onMouseLeave={() => setShowOverlay(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-auto object-cover rounded-lg"
        />

        {/* Overlay - Desktop Hover / Mobile Click Toggle */}
        <div
          className={cn(
            "absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-200",
            showOverlay ? "opacity-100" : "opacity-0 md:opacity-0 md:group-hover:opacity-100"
          )}
        >
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full h-10 w-10 bg-white/90 hover:bg-white shadow-lg transform transition-transform duration-200 hover:scale-110 active:scale-95"
            onClick={handleDownload}
          >
            <Download className="w-5 h-5 text-gray-800" />
          </Button>
        </div>
      </div>

      {/* Full Screen Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
             {/* Backdrop */}
             <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                onClick={() => setIsPreviewOpen(false)}
             />
             
             {/* Image Container */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 p-4 max-w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image wrapper
            >
              <img
                src={src}
                alt={alt}
                className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl"
              />
              
              <div className="absolute top-4 right-4 flex gap-2">
                 <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                    onClick={() => setIsPreviewOpen(false)}
                 >
                    <X className="w-8 h-8" />
                 </Button>
              </div>

               <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                   <Button
                    variant="secondary"
                    className="rounded-full px-6 gap-2 bg-white/90 hover:bg-white shadow-lg"
                    onClick={handleDownload}
                 >
                   <Download className="w-4 h-4 text-gray-800" />
                   <span className="text-gray-800 font-medium">Download</span>
                 </Button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
