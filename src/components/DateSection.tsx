"use client";

interface DateSectionProps {
    label: string;
    count: number;
}

export default function DateSection({ label, count }: DateSectionProps) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold text-foreground">{label}</h3>
            <span className="text-sm text-muted-foreground">({count})</span>
            <div className="flex-1 h-px bg-gradient-to-r from-gray-200 via-gray-300 to-transparent dark:from-gray-700 dark:via-gray-600" />
        </div>
    );
}
