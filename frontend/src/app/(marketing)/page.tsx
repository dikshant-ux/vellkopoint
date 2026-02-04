import Hero from "@/components/landing/Hero";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ProblemSolution from "@/components/landing/ProblemSolution";
import Features from "@/components/landing/Features";
import SocialProof from "@/components/landing/SocialProof";
import Pipeline from "@/components/landing/Pipeline";
import PricingPreview from "@/components/landing/PricingPreview";
import CTA from "@/components/landing/CTA";

export default function LandingPage() {
    return (
        <main className="relative z-10 w-full overflow-hidden">
            <Navbar />
            <Hero />
            <SocialProof />
            <ProblemSolution />
            <Features />
            <Pipeline />
            <PricingPreview />
            <CTA />
            <Footer />
        </main>
    );
}
