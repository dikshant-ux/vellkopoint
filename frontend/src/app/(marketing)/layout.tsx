import { Inter } from "next/font/google";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "Vellkopoint | Intelligent Lead Routing Infrastructure",
    description: "Route every lead in milliseconds. Scale without limits with Vellkopoint's real-time distribution engine.",
};

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={`min-h-screen bg-black text-white ${inter.className} overflow-x-hidden selection:bg-purple-500/30 selection:text-purple-200`}>
            {children}
        </div>
    );
}
