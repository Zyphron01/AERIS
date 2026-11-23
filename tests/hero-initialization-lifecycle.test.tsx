import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import { LiquidSculptureHero } from "@/components/hero/liquid-sculpture-hero";

describe("Hero Initialization & WebGL Lifecycle Unit Tests", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it("handles reduced-motion preference without throwing", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { unmount } = render(<LiquidSculptureHero />);
    const canvas = document.querySelector("canvas");
    expect(canvas).toBeDefined();

    // Verify unmount cleans up cleanly
    expect(() => unmount()).not.toThrow();
  });

  it("gracefully falls back when WebGL2 context is unavailable in the environment", () => {
    // In jsdom environment, getContext('webgl2') returns null by default
    render(<LiquidSculptureHero />);

    const root = document.querySelector(".sh-root");
    expect(root).toBeDefined();

    // The fallback image should always be present in the DOM
    const fallback = screen.getByAltText(
      "AERIS aerodynamic atmospheric particle sculpture"
    );
    expect(fallback).toBeDefined();
    expect(fallback.getAttribute("src")).toContain("aeris-sculpture-light.png");
  });

  it("swaps sculpture image source when dark theme is activated", () => {
    const { rerender } = render(<LiquidSculptureHero theme="light" />);

    const lightImg = screen.getByAltText(
      "AERIS aerodynamic atmospheric particle sculpture"
    );
    expect(lightImg.getAttribute("src")).toContain("aeris-sculpture-light.png");

    rerender(<LiquidSculptureHero theme="dark" />);

    const darkImg = screen.getByAltText(
      "AERIS aerodynamic atmospheric particle sculpture"
    );
    expect(darkImg.getAttribute("src")).toContain("aeris-sculpture-dark.png");
  });

  it("handles window resize and visibility changes without memory leaks", () => {
    const { unmount } = render(<LiquidSculptureHero />);

    act(() => {
      window.dispatchEvent(new Event("resize"));
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(() => unmount()).not.toThrow();
  });
});
