"use client";

import { Coins, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreditsDisplayProps {
  credits: number;
  isLoading?: boolean;
  onTopupClick: () => void;
}

export default function CreditsDisplay({ credits, isLoading, onTopupClick }: CreditsDisplayProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/50">
      <div className="flex items-center gap-1.5">
        <Coins className="w-4 h-4 text-amber-600" />
        <span className="text-xs font-semibold text-amber-700">
          {isLoading ? "..." : credits.toLocaleString()}
        </span>
        <span className="text-[10px] text-amber-600/70">tokens</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onTopupClick}
        className="h-5 w-5 rounded-full bg-amber-100 hover:bg-amber-200 ml-auto"
      >
        <Plus className="w-3 h-3 text-amber-700" />
      </Button>
    </div>
  );
}
