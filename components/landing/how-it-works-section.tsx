import React from "react";

export function HowItWorksSection(): React.JSX.Element {
  const steps = [
    {
      num: "01",
      title: "Locate & Sense",
      desc: "Connect your location to pull hourly modeled air-quality forecasts, satellite-assisted atmospheric layers, and localized meteorological feeds calibrated to official standards.",
    },
    {
      num: "02",
      title: "Forecast & Predict",
      desc: "AERIS ingests Open-Meteo atmospheric chemical transport model forecasts—tracking wind speeds and particulate trends—to project 24-hour regional air quality trajectories through our deterministic decision engine.",
    },
    {
      num: "03",
      title: "Decide & Protect",
      desc: "Receive actionable recommendations: whether to shift your morning jog, seal windows against smog spikes, or activate purifiers before pollution enters your home.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="relative z-10 scroll-mt-16 bg-white px-6 py-28 transition-colors duration-500 dark:bg-slate-900 md:px-12 lg:px-20"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 max-w-xl">
          <p className="mb-3 text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-cyan-400">
            Decision Methodology
          </p>
          <h2
            id="how-it-works-heading"
            className="text-3xl font-medium tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl"
          >
            Turning atmospheric data into proactive health decisions.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.num} className="relative flex flex-col">
              <span className="mb-4 font-mono text-3xl font-bold tracking-tight text-teal-600/40 dark:text-cyan-400/40">
                {step.num}
              </span>
              <h3 className="mb-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
