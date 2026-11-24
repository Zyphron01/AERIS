"use client";

import React from "react";
import { LiquidSculptureHero } from "@/components/hero/liquid-sculpture-hero";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { AboutSection } from "@/components/landing/about-section";
import { SiteFooter } from "@/components/landing/site-footer";
import { useTheme } from "@/components/theme/theme-provider";

export default function HomePage(): React.JSX.Element {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        {/* Authoritative Liquid Sculpture Hero */}
        <LiquidSculptureHero
          theme={theme}
          onThemeChange={setTheme}
          brand="AERIS"
          eyebrow="Intelligent Air Quality Companion"
          headline={`Know your air.\nShape your day.`}
          headlineAccent="Shape your day."
          body="Understand the air around you and discover practical, personalized ways to plan healthier routines and more sustainable everyday choices."
          primaryCta={{
            label: "Check My Air",
            href: "/dashboard",
          }}
          secondaryCta={{
            label: "Explore Features",
            href: "#features",
          }}
          navLinks={[
            { label: "How It Works", href: "#how-it-works" },
            { label: "Features", href: "#features" },
            { label: "About", href: "#about" },
            { label: "Get Started", href: "/dashboard" },
          ]}
          navCta={{
            label: "Check My Air",
            href: "/dashboard",
          }}
        />

        {/* Real Features Section (Secondary CTA destination) */}
        <FeaturesSection />

        {/* Real How It Works Section */}
        <HowItWorksSection />

        {/* Real About Section */}
        <AboutSection />
      </main>

      {/* Accessible Footer */}
      <SiteFooter />
    </div>
  );
}
