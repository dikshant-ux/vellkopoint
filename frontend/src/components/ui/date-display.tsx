"use client";

import { format } from "date-fns";

interface DateDisplayProps {
    date: string | Date;
    dateFormat?: string; // Default: PP p (e.g. Apr 29, 2021 2:00 PM)
    className?: string;
}

export function DateDisplay({ date, dateFormat = "PP p", className }: DateDisplayProps) {
    if (!date) return <span className={className}>-</span>;

    let dateObj: Date;
    if (typeof date === "string") {
        // Fix for naive timestamps (legacy data from storing datetime.utcnow)
        // If the string doesn't end with Z and doesn't have an offset, append Z to treat as UTC
        // Naive ISO strings come out like "2023-01-01T12:00:00.000" or similar
        let dateString = date;
        if (!dateString.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(dateString)) {
            dateString += "Z";
        }
        dateObj = new Date(dateString);
    } else {
        dateObj = date;
    }

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
