import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { LiquidSculptureHero } from "@/components/hero/liquid-sculpture-hero";

describe("LiquidSculptureHero Component", () => {
  it("renders authoritative brand, eyebrow, and headline", () => {
    render(<LiquidSculptureHero />);

    // Brand
    expect(screen.getAllByText("AERIS")[0]).toBeDefined();

    // Eyebrow
    expect(
      screen.getAllByText("Intelligent Air Quality Companion")[0]
    ).toBeDefined();

    // Headline
    expect(screen.getByText("Know your air.")).toBeDefined();
    expect(screen.getAllByText("Shape your day.")[0]).toBeDefined();

    // Description
    expect(
      screen.getAllByText(/Understand the air around you and discover practical/i)[0]
    ).toBeDefined();
  });

  it("points Primary CTA to /dashboard and Secondary CTA to #features", () => {
    render(<LiquidSculptureHero />);

    const primaryCta = screen.getByRole("link", { name: /Check My Air/i });
    expect(primaryCta.getAttribute("href")).toBe("/dashboard");

    const secondaryCta = screen.getByRole("link", { name: /Explore Features/i });
    expect(secondaryCta.getAttribute("href")).toBe("#features");
  });

  it("renders functional navigation destinations", () => {
    render(<LiquidSculptureHero />);

    expect(screen.getByRole("link", { name: "How It Works" }).getAttribute("href")).toBe(
      "#how-it-works"
    );
    expect(screen.getByRole("link", { name: "Features" }).getAttribute("href")).toBe(
      "#features"
    );
    expect(screen.getByRole("link", { name: "About" }).getAttribute("href")).toBe(
      "#about"
    );
    expect(screen.getByRole("link", { name: "Get Started" }).getAttribute("href")).toBe(
      "/dashboard"
    );
  });

  it("toggles theme when the theme button is clicked", () => {
    const handleThemeChange = vi.fn();
    render(
      <LiquidSculptureHero
        theme="light"
        onThemeChange={handleThemeChange}
      />
    );

    const themeToggle = screen.getByRole("button", {
      name: /Switch to dark theme/i,
    });
    fireEvent.click(themeToggle);

    expect(handleThemeChange).toHaveBeenCalledWith("dark");
  });

  it("provides accessible static fallback image and semantic labels", () => {
    render(<LiquidSculptureHero />);

    const fallbackImg = screen.getByAltText(
      "AERIS aerodynamic atmospheric particle sculpture"
    );
    expect(fallbackImg).toBeDefined();
    expect(fallbackImg.className).toContain("sh-fallback");
  });
});
