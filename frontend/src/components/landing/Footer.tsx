"use client";

import { Twitter, Linkedin, Github, Command } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-black border-t border-white/10 pt-20 pb-10">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
                                <Command size={18} />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-white">
                                Vellkopoint
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            The intelligent infrastructure layer for real-time lead routing and distribution. Scale your revenue operations without limits.
                        </p>
                        <div className="flex gap-4 pt-2">
                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Twitter size={20} /></a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Linkedin size={20} /></a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Github size={20} /></a>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-4">Product</h4>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-purple-400 transition-colors">Features</a></li>
                            <li><a href="#" className="hover:text-purple-400 transition-colors">Integrations</a></li>
                            <li><a href="#" className="hover:text-purple-400 transition-colors">Pricing</a></li>
                            <li><a href="#" className="hover:text-purple-400 transition-colors">Changelog</a></li>
                            <li><a href="#" className="hover:text-purple-400 transition-colors">Docs</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-4">Company</h4>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-purple-400 transition-colors">About</a></li>
                            <li><a href="#" className="hover:text-purple-400 transition-colors">Blog</a></li>
                            <li><a href="#" className="hover:text-purple-400 transition-colors">Careers</a></li>
                            <li><a href="#" className="hover:text-purple-400 transition-colors">Contact</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-white mb-4">Legal</h4>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li><a href="#" className="hover:text-purple-400 transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-purple-400 transition-colors">Terms of Service</a></li>
                            <li><a href="#" className="hover:text-purple-400 transition-colors">Security</a></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500 text-sm">
                        © {new Date().getFullYear()} Vellkopoint Inc. All rights reserved.
                    </p>
                    <div className="flex gap-8 text-sm text-gray-500">
                        <span>Made with ❤️ for high-growth teams</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
