import React from "react";
import Link from "next/link";
import { Activity, ShieldCheck, Wind, Compass } from "lucide-react";

interface FeatureCardProps {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description: string;
  readonly badge: string;
  readonly href: string;
}

function FeatureCard({
  icon,
  title,
  description,
  badge,
  href,
}: FeatureCardProps): React.JSX.Element {
  return (
    <div className="group relative rounded-2xl border border-slate-200/80 bg-white/70 p-7 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-teal-500/40 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-cyan-500/40">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-slate-800 dark:text-cyan-400">
          {icon}
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {badge}
        </span>
      </div>
      <h3 className="mb-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {description}
      </p>
      <Link
        href={href}
        className="inline-flex items-center text-sm font-medium text-teal-600 transition-colors hover:text-teal-700 dark:text-cyan-400 dark:hover:text-cyan-300"
      >
        Explore module
        <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
      </Link>
    </div>
  );
}

export function FeaturesSection(): React.JSX.Element {
  return (
    <section
      id="features"
      className="relative z-10 scroll-mt-16 bg-slate-50/80 px-6 py-28 transition-colors duration-500 dark:bg-slate-950/80 md:px-12 lg:px-20"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 max-w-2xl">
          <p className="mb-3 text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-cyan-400">
            Intelligent Modules
          </p>
          <h2
            id="features-heading"
            className="text-3xl font-medium tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl"
          >
            Empowering every breath with contextual decision intelligence.
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            AERIS bridges ambient atmospheric sensing with personalized lifestyle guidance,
            ensuring your routines are healthier and more resilient.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<Wind className="h-6 w-6" />}
            title="Live Air Monitor"
            description="Continuous regional AQI, PM2.5, PM10, and ozone tracking powered by atmospheric chemical transport models (Open-Meteo CAMS) calibrated with regulatory breakpoints."
            badge="Telemetry"
            href="/dashboard"
          />
          <FeatureCard
            icon={<Activity className="h-6 w-6" />}
            title="Personalized AI Plan"
            description="Optimized schedule windows for outdoor exercise, ventilation timing, and respiratory protection tailored to your vulnerability."
            badge="Decision Engine"
            href="/daily-plan"
          />
          <FeatureCard
            icon={<ShieldCheck className="h-6 w-6" />}
            title="Indoor Air Coach"
            description="Smart home guidance on filtration, window opening protocols, cooking ventilation, and humidity balancing."
            badge="Indoor Hygiene"
            href="/indoor-air"
          />
          <FeatureCard
            icon={<Compass className="h-6 w-6" />}
            title="What-If Simulator"
            description="Simulate the exposure impact of alternative commute corridors, departure times, and outdoor recreational locations."
            badge="Simulation"
            href="/scenarios"
          />
        </div>

        {/* Permanent Rule 11 Compliance Banner */}
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/60 bg-white/40 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-teal-500" />
            <span>Atmospheric Baseline: Modeled Air-Quality Forecasts (Open-Meteo CAMS calibrated with EPA / EEA / CPCB methods)</span>
          </div>
          <div>Units: AQI (US Index), PM2.5 (µg/m³), O₃ (ppb)</div>
          <div>Verified Timestamp Protocol: ISO 8601 UTC synchronized</div>
        </div>
      </div>
    </section>
  );
}
