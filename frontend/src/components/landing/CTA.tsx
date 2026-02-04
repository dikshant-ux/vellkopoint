import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function CTA() {
    return (
        <section className="py-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900 to-blue-900 -z-20" />
            <div className="absolute inset-0 bg-black/40 -z-10" />

            <div className="container mx-auto px-6 text-center">
                <h2 className="text-4xl md:text-6xl font-bold text-white mb-8">
                    Stop Losing Available Leads.
                </h2>
                <p className="text-xl text-gray-200 mb-10 max-w-2xl mx-auto">
                    Join high-performance teams that route millions of dollars in revenue through Vellkopoint every day.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button size="lg" className="h-14 px-8 rounded-full bg-white text-black hover:bg-gray-200 text-lg font-semibold shadow-lg">
                        Get Started Now
                    </Button>
                    <Button size="lg" variant="ghost" className="h-14 px-8 rounded-full text-white hover:bg-white/10 text-lg">
                        Read Documentation <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </div>
            </div>
        </section>
    );
}
