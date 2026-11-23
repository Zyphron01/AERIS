import React from "react";
import Link from "next/link";

export function AboutSection(): React.JSX.Element {
  return (
    <section
      id="about"
      className="relative z-10 scroll-mt-16 bg-slate-50 px-6 py-28 transition-colors duration-500 dark:bg-slate-950 md:px-12 lg:px-20"
      aria-labelledby="about-heading"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-semibold tracking-widest uppercase text-teal-700 dark:text-cyan-400">
            About AERIS
          </p>
          <h2
            id="about-heading"
            className="text-3xl font-medium tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl"
          >
            Science-grounded environmental clarity.
          </h2>
        </div>

        <div className="space-y-6 text-center text-base leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            AERIS is an intelligent personal air quality decision companion built to help
            individuals, families, and vulnerable populations understand the air they breathe
            and take preventative actions in real time.
          </p>
          <p>
            Unlike static weather apps that only display retrospective pollution numbers, AERIS
            focuses on forward-looking behavioral impact: when to open windows, how to adjust
            commute paths, and how to minimize personal particulate exposure during seasonal or
            traffic-driven spikes.
          </p>
          <div className="pt-6">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-full bg-slate-900 px-8 text-sm font-medium text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Access Air Monitor
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
