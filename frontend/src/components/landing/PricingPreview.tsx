import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
    {
        name: "Startup",
        price: "$99",
        period: "/mo",
        features: ["5,000 leads/mo", "3 Sources", "Real-time Dashboard", "Email Support"],
        popular: false
    },
    {
        name: "Growth",
        price: "$299",
        period: "/mo",
        features: ["50,000 leads/mo", "Unlimited Sources", "Advanced Routing Rules", "Priority Support", "API Access"],
        popular: true
    },
    {
        name: "Enterprise",
        price: "Custom",
        period: "",
        features: ["Unlimited Volume", "Dedicated Instance", "SLA Guarantee", "24/7 Phone Support", "Custom Integrations"],
        popular: false
    }
];

export default function PricingPreview() {
    return (
        <section id="pricing" className="py-24 bg-black">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                        Transparent Pricing.
                    </h2>
                    <p className="text-gray-400 text-lg">
                        Start small and scale as you grow. No hidden fees.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan, i) => (
                        <div key={i} className={`relative p-8 rounded-3xl border ${plan.popular ? 'border-purple-500 bg-purple-500/5' : 'border-white/10 bg-white/5'} hover:bg-white/10 transition-colors`}>
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                    MOST POPULAR
                                </div>
                            )}
                            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-bold text-white">{plan.price}</span>
                                <span className="text-gray-400">{plan.period}</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, j) => (
                                    <li key={j} className="flex items-center gap-3 text-sm text-gray-300">
                                        <Check className="w-5 h-5 text-purple-400 shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <Button className={`w-full rounded-full font-semibold ${plan.popular ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`} variant={plan.popular ? "default" : "outline"}>
                                {plan.price === "Custom" ? "Contact Sales" : "Start Free Trial"}
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
