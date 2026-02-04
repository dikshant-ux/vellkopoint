"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Menu, X, Command } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${scrolled
                ? "bg-black/80 backdrop-blur-md border-white/10 py-3"
                : "bg-transparent border-transparent py-5"
                }`}
        >
            <div className="container mx-auto px-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
                        <Command size={18} />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">
                        Vellkopoint
                    </span>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Features</a>
                    <a href="#how-it-works" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">How it works</a>
                    <a href="#pricing" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Pricing</a>
                    <a href="#docs" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Docs</a>
                </nav>

                <div className="hidden md:flex items-center gap-4">
                    <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                        Login
                    </Link>
                    <Button className="bg-white text-black hover:bg-gray-100 rounded-full px-6 font-semibold">
                        Get Started
                    </Button>
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden text-gray-300"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-black border-b border-white/10 p-6 flex flex-col gap-4 shadow-xl animate-in slide-in-from-top-2">
                    <a href="#features" className="text-lg font-medium text-gray-300 py-2">Features</a>
                    <a href="#how-it-works" className="text-lg font-medium text-gray-300 py-2">How it works</a>
                    <a href="#pricing" className="text-lg font-medium text-gray-300 py-2">Pricing</a>
                    <div className="h-px bg-white/10 my-2" />
                    <Link href="/login" className="text-lg font-medium text-gray-300 py-2">Login</Link>
                    <Button className="w-full bg-white text-black hover:bg-gray-100 rounded-full font-semibold">
                        Get Started
                    </Button>
                </div>
            )}
        </header>
    );
}
