"use client"

import { Eye, EyeOff, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface MaskedDataIndicatorProps {
    value: string
    isMasked: boolean
    type?: "email" | "phone" | "text"
}

export function MaskedDataIndicator({ value, isMasked, type = "text" }: MaskedDataIndicatorProps) {
    if (!isMasked) {
        return <span>{value}</span>
    }

    // Check if value looks masked (contains X's)
    const appearsMasked = value.includes("X") || value.includes("*")

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 cursor-help">
                        <span className="font-mono text-gray-600">{value}</span>
                        {appearsMasked && (
                            <EyeOff className="w-3 h-3 text-gray-400" />
                        )}
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-xs">
                        {appearsMasked
                            ? `This ${type} is masked for security. Full data visible to admins only.`
                            : `Limited access - some data may be hidden`}
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

interface LimitedViewBadgeProps {
    className?: string
}

export function LimitedViewBadge({ className }: LimitedViewBadgeProps) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge variant="outline" className={`bg-yellow-50 text-yellow-700 border-yellow-200 ${className}`}>
                        <EyeOff className="w-3 h-3 mr-1" />
                        Limited View
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="max-w-xs space-y-1">
                        <p className="font-semibold text-xs">Limited Data Access</p>
                        <p className="text-xs">
                            Sensitive information like emails and phone numbers are masked for security.
                            Contact your administrator for full access.
                        </p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

interface DataMaskingAlertProps {
    show: boolean
}

export function DataMaskingAlert({ show }: DataMaskingAlertProps) {
    if (!show) return null

    return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                    <h4 className="font-semibold text-yellow-900 text-sm mb-1">
                        Limited Data View
                    </h4>
                    <p className="text-xs text-yellow-800">
                        You are viewing leads with masked sensitive data. Email addresses and phone numbers
                        are partially hidden for security. Admins have access to full, unmasked data.
                    </p>
                </div>
            </div>
        </div>
    )
}
