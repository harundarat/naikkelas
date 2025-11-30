"use client";

import { Gift, ChevronRight } from "lucide-react";

interface RewardsDisplayProps {
  balance: number;
  isLoading?: boolean;
  onClick: () => void;
}

export default function RewardsDisplay({ balance, isLoading, onClick }: RewardsDisplayProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/50 hover:border-emerald-300 transition-all duration-200 group"
    >
      <div className="flex items-center gap-1.5 flex-1">
        <Gift className="w-4 h-4 text-emerald-600" />
        <span className="text-xs font-semibold text-emerald-700">
          {isLoading ? "..." : formatCurrency(balance)}
        </span>
        <span className="text-[10px] text-emerald-600/70">reward</span>
      </div>
      <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}
