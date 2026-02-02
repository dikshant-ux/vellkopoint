"use client";

import { format } from "date-fns";

interface DateDisplayProps {
    date: string | Date;
    dateFormat?: string; // Default: PP p (e.g. Apr 29, 2021 2:00 PM)
    className?: string;
}

export function DateDisplay({ date, dateFormat = "PP p", className }: DateDisplayProps) {
    if (!date) return <span className={className}>-</span>;

    const dateObj = typeof date === "string" ? new Date(date) : date;

    // Check for invalid date
    if (isNaN(dateObj.getTime())) {
        return <span className={className}>Invalid Date</span>;
    }

    return (
        <span suppressHydrationWarning className={className}>
            {format(dateObj, dateFormat)}
        </span>
    );
}
