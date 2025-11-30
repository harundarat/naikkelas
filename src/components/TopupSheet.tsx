"use client";

import { useState } from "react";
import { Coins, Loader2, Sparkles, Zap, Crown, Rocket } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PACKAGES = [
  {
    id: "starter",
    name: "Starter",
    credits: 10000,
    price: 10000,
    icon: Sparkles,
    popular: false,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "basic",
    name: "Basic",
    credits: 25000,
    price: 25000,
    icon: Zap,
    popular: true,
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "pro",
    name: "Pro",
    credits: 50000,
    price: 50000,
    icon: Crown,
    popular: false,
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "premium",
    name: "Premium",
    credits: 100000,
    price: 100000,
    icon: Rocket,
    popular: false,
    color: "from-emerald-500 to-teal-500",
  },
];

interface TopupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
}

export default function TopupSheet({ isOpen, onClose, currentCredits }: TopupSheetProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTopup = async () => {
    if (!selectedPackage) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/topup/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selectedPackage }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create topup");
      }

      const data = await response.json();

      // Redirect to Flip payment page
      window.location.href = data.billLink;
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-600" />
            Top Up Tokens
          </SheetTitle>
          <SheetDescription>
            Select a package to top up your tokens. Current balance:{" "}
            <span className="font-semibold text-amber-600">{currentCredits.toLocaleString()} tokens</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {PACKAGES.map((pkg) => {
            const Icon = pkg.icon;
            const isSelected = selectedPackage === pkg.id;

            return (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                disabled={isLoading}
                className={cn(
                  "relative w-full p-4 rounded-xl border-2 transition-all duration-200 text-left",
                  isSelected
                    ? "border-purple-500 bg-purple-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/50",
                  isLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {pkg.popular && (
                  <span className="absolute -top-2 right-3 px-2 py-0.5 text-[10px] font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                    POPULAR
                  </span>
                )}

                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg bg-gradient-to-br",
                    pkg.color
                  )}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">{pkg.name}</span>
                      <span className="text-sm font-bold text-purple-600">
                        {formatPrice(pkg.price)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-sm text-gray-600">
                        {pkg.credits.toLocaleString()} tokens
                      </span>
                    </div>
                  </div>

                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    isSelected
                      ? "border-purple-500 bg-purple-500"
                      : "border-gray-300"
                  )}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <Button
            onClick={handleTopup}
            disabled={!selectedPackage || isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Coins className="w-4 h-4 mr-2" />
                Continue to Payment
              </>
            )}
          </Button>

          <p className="text-xs text-center text-gray-500">
            Secure payment powered by Flip. You&apos;ll be redirected to complete your payment.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
