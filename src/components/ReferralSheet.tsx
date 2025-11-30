"use client";

import { useState, useEffect } from "react";
import { Gift, Users, Copy, Check, Loader2, UserPlus, Users2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ReferralStats {
  totalReferrals: number;
  level1Count: number;
  level2Count: number;
  totalRewardsEarned: number;
}

interface ReferralSheetProps {
  isOpen: boolean;
  onClose: () => void;
  rewardBalance: number;
}

export default function ReferralSheet({ isOpen, onClose, rewardBalance }: ReferralSheetProps) {
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralLink, setReferralLink] = useState<string>("");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchReferralData();
    }
  }, [isOpen]);

  const fetchReferralData = async () => {
    setIsLoading(true);
    try {
      const [codeRes, statsRes] = await Promise.all([
        fetch("/api/referral/code"),
        fetch("/api/referral/stats"),
      ]);

      if (codeRes.ok) {
        const codeData = await codeRes.json();
        setReferralCode(codeData.code);
        setReferralLink(codeData.referralLink);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Failed to fetch referral data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setIsCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-emerald-600" />
            Referral Program
          </SheetTitle>
          <SheetDescription>
            Invite friends and earn rewards! Get{" "}
            <span className="font-semibold text-emerald-600">Rp 75.000</span> for each friend who signs up.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Referral Link */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Your Referral Link</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 truncate">
                  {referralLink}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="shrink-0 h-11 w-11 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Share this link with friends. When they sign up, you both benefit!
              </p>
            </div>

            {/* Stats Cards */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Your Stats</label>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl text-center">
                  <div className="flex justify-center mb-1">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-xl font-bold text-purple-700">{stats?.totalReferrals ?? 0}</p>
                  <p className="text-[10px] text-purple-600">Total</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl text-center">
                  <div className="flex justify-center mb-1">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xl font-bold text-blue-700">{stats?.level1Count ?? 0}</p>
                  <p className="text-[10px] text-blue-600">Level 1</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-xl text-center">
                  <div className="flex justify-center mb-1">
                    <Users2 className="w-4 h-4 text-cyan-600" />
                  </div>
                  <p className="text-xl font-bold text-cyan-700">{stats?.level2Count ?? 0}</p>
                  <p className="text-[10px] text-cyan-600">Level 2</p>
                </div>
              </div>
            </div>

            {/* Rewards Info */}
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Rewards Earned</span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(stats?.totalRewardsEarned ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Current Balance</span>
                  <span className="font-bold text-emerald-700 text-lg">
                    {formatCurrency(rewardBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* How it works */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">How it works</label>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-blue-600">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Level 1 Referral</p>
                    <p className="text-xs text-gray-500">
                      Get <span className="font-semibold text-emerald-600">Rp 75.000</span> when your friend signs up
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-cyan-600">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Level 2 Referral</p>
                    <p className="text-xs text-gray-500">
                      Get <span className="font-semibold text-emerald-600">Rp 25.000</span> when your friend&apos;s friend signs up
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Coming Soon */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 text-center">
                Reward redemption feature coming soon!
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
