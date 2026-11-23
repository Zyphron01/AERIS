"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { ParticleEngine, type EngineResolvedOptions } from "./particle-engine";
import type { SculptureHeroProps, ThemeMode, RectBounds } from "./types";

function computeRect(
  containerW: number,
  containerH: number,
  aspect: number,
  bounds: { top: number; bottom: number },
  layout: { scale: number; mobileScale: number; x: number; y: number }
): RectBounds {
  const contentHeight = Math.max(80, bounds.bottom - bounds.top);
  let w: number;
  let hLimit: number;

  if (containerW >= 1024) {
    w = containerW * 1.02 * layout.scale;
    hLimit = contentHeight * 1.1 * layout.scale;
  } else if (containerW >= 640) {
    w = containerW * 1.3 * layout.scale;
    hLimit = contentHeight * 1.15 * layout.scale;
  } else if (aspect < 1.3) {
    w = containerW * 1.0 * layout.mobileScale;
    hLimit = contentHeight * 1.0 * layout.mobileScale;
  } else {
    w = containerW * 1.9 * layout.mobileScale;
    hLimit = contentHeight * 1.2 * layout.mobileScale;
  }

  if (w / aspect > hLimit) {
    w = hLimit * aspect;
  }

  const h = w / aspect;
  const centerX = containerW * (0.5 + layout.x / 100);
  const centerY = (bounds.top + bounds.bottom) / 2 + containerH * (layout.y / 100);

  return {
    x: centerX - w / 2,
    y: centerY - h / 2,
    w,
    h,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  ];
}

const emptySubscribe = (): (() => void) => () => {};

const SunIcon = (): React.JSX.Element => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M8 1.2v1.6M8 13.2v1.6M1.2 8h1.6M13.2 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M3.2 12.8l1.1-1.1M11.7 4.3l1.1-1.1"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

const MoonIcon = (): React.JSX.Element => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M13.6 10.1A5.9 5.9 0 0 1 5.9 2.4a5.9 5.9 0 1 0 7.7 7.7Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

const ArrowIcon = (): React.JSX.Element => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M2 7h10M8 3l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function LiquidSculptureHero({
  src = "/assets/aeris-sculpture-light.png",
  darkSrc = "/assets/aeris-sculpture-dark.png",
  mobileSrc,
  mobileDarkSrc,
  imageAlt = "AERIS aerodynamic atmospheric particle sculpture",
  brand = "AERIS",
  navLinks = [
    { label: "How It Works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "About", href: "#about" },
    { label: "Get Started", href: "/dashboard" },
  ],
  navCta = { label: "Launch Monitor", href: "/dashboard" },
  showNav = true,
  eyebrow = "Intelligent Air Quality Companion",
  headline = "Know your air.\nShape your day.",
  headlineAccent = "Shape your day.",
  body = "Understand the air around you and discover practical, personalized ways to plan healthier routines and more sustainable everyday choices.",
  primaryCta = { label: "Check My Air", href: "/dashboard" },
  secondaryCta = { label: "Explore Features", href: "#features" },
  hint = "Move across the atmospheric flow",
  hintTouch = "Touch to disturb the air currents",
  background = "#F8F9FA",
  darkBackground = "#0B0F17",
  textColor = "#0F172A",
  theme: controlledTheme,
  onThemeChange,
  className = "",
  backdropWord = "AERIS",
  enableCredit = false,
}: SculptureHeroProps): React.JSX.Element {
  const [internalTheme, setInternalTheme] = useState<ThemeMode>("light");
  const currentTheme = controlledTheme ?? internalTheme;

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [hasInteracted, setHasInteracted] = useState(false);
  const [canvasKey] = useState(() => Math.random().toString(36).slice(2));

  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackImgRef = useRef<HTMLImageElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ParticleEngine | null>(null);
  const activeImageRef = useRef<HTMLImageElement | null>(null);
  const aspectRef = useRef<number>(2.5);
  const themeOptionsRef = useRef({ background, darkBackground, currentTheme });
  useEffect(() => {
    themeOptionsRef.current = { background, darkBackground, currentTheme };
  });

  const layoutParams = useMemo(
    () => ({
      scale: 1.0,
      mobileScale: 1.0,
      x: 0,
      y: 0,
    }),
    []
  );

  const activeSrc = useMemo(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      if (currentTheme === "dark") {
        return mobileDarkSrc ?? darkSrc;
      }
      return mobileSrc ?? src;
    }
    return currentTheme === "dark" ? darkSrc : src;
  }, [currentTheme, darkSrc, mobileDarkSrc, mobileSrc, src]);

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = currentTheme === "dark" ? "light" : "dark";
    if (onThemeChange) {
      onThemeChange(next);
    } else {
      setInternalTheme(next);
    }
  }, [currentTheme, onThemeChange]);

  const updateDimensions = useCallback(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const fallback = fallbackImgRef.current;
    if (!root) return;

    const rootRect = root.getBoundingClientRect();
    const navHeight = navRef.current?.offsetHeight ?? 60;
    const contentTop =
      (contentRef.current?.getBoundingClientRect().top ?? rootRect.bottom) -
      rootRect.top;

    const bounds = {
      top: navHeight,
      bottom: Math.max(navHeight + 100, contentTop),
    };

    const rect = computeRect(
      rootRect.width,
      rootRect.height,
      aspectRef.current,
      bounds,
      layoutParams
    );

    if (fallback) {
      fallback.style.left = `${rect.x}px`;
      fallback.style.top = `${rect.y}px`;
      fallback.style.width = `${rect.w}px`;
      fallback.style.height = `${rect.h}px`;
    }

    if (canvas && engineRef.current) {
      engineRef.current.resize(rootRect.width, rootRect.height, rect);
    }
  }, [layoutParams]);

  const applyImageToEngine = useCallback(
    (engine: ParticleEngine, img: HTMLImageElement) => {
      const root = rootRef.current;
      if (!root) return;

      aspectRef.current = img.naturalWidth / img.naturalHeight || 2.5;
      updateDimensions();

      try {
        engine.onFirstFrame = () => {
          root.dataset.gl = "on";
          delete root.dataset.swap;
        };
        engine.setImage(img);
        updateDimensions();
        if (engine.isReady()) {
          root.dataset.gl = "on";
          delete root.dataset.swap;
        }
      } catch {
        root.dataset.gl = "off";
        delete root.dataset.swap;
      }
    },
    [updateDimensions]
  );

  // Initialize WebGL2 Particle Engine
  useEffect(() => {
    if (!mounted) return;
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const { background: bg, darkBackground: darkBg, currentTheme: theme } =
      themeOptionsRef.current;
    const bgRgb = hexToRgb(theme === "dark" ? darkBg : bg);

    const initialOptions: EngineResolvedOptions = {
      radius: 120,
      strength: 1.0,
      spread: 1.0,
      turbulence: 1.0,
      returnSpeed: 1.0,
      speed: 1.0,
      density: 1.0,
      dotSize: 1.0,
      streaks: true,
      ambient: true,
      ambientIntensity: 0.8,
      liquid: 1.0,
      restStyle: "image",
      bg: bgRgb,
      interactive: true,
      intro: true,
      reducedMotion,
    };

    let engine: ParticleEngine | null = null;
    try {
      engine = new ParticleEngine(canvas, initialOptions, () => {
        root.dataset.gl = "off";
      });
      engineRef.current = engine;
    } catch {
      root.dataset.gl = "off";
      return;
    }

    // Immediately bind preloaded or cached image if already available
    if (
      activeImageRef.current &&
      activeImageRef.current.complete &&
      activeImageRef.current.naturalWidth > 0
    ) {
      applyImageToEngine(engine, activeImageRef.current);
    }

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(root);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        engine?.setVisible(entry?.isIntersecting ?? true);
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(root);

    const handleVisibility = (): void => {
      engine?.setVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const getRelativeCoords = (e: PointerEvent): [number, number] => {
      const r = root.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };

    const onPointerMove = (e: PointerEvent): void => {
      const [x, y] = getRelativeCoords(e);
      const isTouch = e.pointerType === "touch";
      if (isTouch && e.buttons === 0 && e.pressure === 0) return;
      engine?.pointer("move", x, y, isTouch);
      setHasInteracted((prev) => (prev ? prev : true));
    };

    const onPointerDown = (e: PointerEvent): void => {
      const [x, y] = getRelativeCoords(e);
      engine?.pointer("down", x, y, e.pointerType === "touch");
      setHasInteracted((prev) => (prev ? prev : true));
    };

    const onPointerUp = (e: PointerEvent): void => {
      const [x, y] = getRelativeCoords(e);
      engine?.pointer("up", x, y, e.pointerType === "touch");
    };

    const onPointerLeave = (e: PointerEvent): void => {
      const [x, y] = getRelativeCoords(e);
      engine?.pointer("leave", x, y, e.pointerType === "touch");
    };

    root.addEventListener("pointermove", onPointerMove, { passive: true });
    root.addEventListener("pointerdown", onPointerDown, { passive: true });
    root.addEventListener("pointerup", onPointerUp, { passive: true });
    root.addEventListener("pointercancel", onPointerUp, { passive: true });
    root.addEventListener("pointerleave", onPointerLeave, { passive: true });

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = (e: MediaQueryListEvent): void => {
      engine?.setOptions({ reducedMotion: e.matches });
    };
    mediaQuery.addEventListener("change", handleMotionChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMotionChange);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);

      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerUp);
      root.removeEventListener("pointerleave", onPointerLeave);

      engine?.destroy();
      engineRef.current = null;
      delete root.dataset.gl;
      delete root.dataset.swap;
    };
  }, [mounted, applyImageToEngine, updateDimensions]);

  // Load and swap sculpture image texture
  useEffect(() => {
    if (!mounted) return;
    const root = rootRef.current;
    if (!root) return;

    let canceled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    const isGlOn = root.dataset.gl === "on";
    if (isGlOn) {
      root.dataset.swap = "1";
    }

    img.onload = () => {
      if (canceled) return;
      activeImageRef.current = img;

      const engine = engineRef.current;
      if (engine && root.dataset.gl !== "off") {
        applyImageToEngine(engine, img);
      } else {
        aspectRef.current = img.naturalWidth / img.naturalHeight || 2.5;
        updateDimensions();
        delete root.dataset.swap;
      }
    };

    img.onerror = () => {
      if (canceled) return;
      delete root.dataset.swap;
      root.dataset.gl = "off";
    };

    const timer = window.setTimeout(() => {
      img.src = activeSrc;
    }, isGlOn ? 200 : 0);

    return () => {
      canceled = true;
      window.clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };
  }, [mounted, activeSrc, applyImageToEngine, updateDimensions]);

  // Update theme & performance options when theme changes
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const bgRgb = hexToRgb(currentTheme === "dark" ? darkBackground : background);

    engine.setOptions({
      bg: bgRgb,
      reducedMotion,
    });
  }, [currentTheme, background, darkBackground]);

  const cssVariables = useMemo(
    () =>
      ({
        "--sh-bg": currentTheme === "dark" ? darkBackground : background,
        "--sh-fg": currentTheme === "dark" ? "#F8FAFC" : textColor,
        "--sh-acc": currentTheme === "dark" ? "#38BDF8" : "#0D9488",
        "--sh-h": "100vh",
      } as React.CSSProperties),
    [currentTheme, darkBackground, background, textColor]
  );

  const headlineElements = useMemo(() => {
    return headline.split("\n").map((line, idx) => {
      let content: React.ReactNode = line;
      if (headlineAccent && line.includes(headlineAccent)) {
        const parts = line.split(headlineAccent);
        content = (
          <>
            {parts[0]}
            <span className="sh-accent">{headlineAccent}</span>
            {parts[1]}
          </>
        );
      }
      return (
        <span key={idx} className="sh-line">
          {content}
        </span>
      );
    });
  }, [headline, headlineAccent]);

  return (
    <section
      ref={rootRef}
      className={`sh-root ${className}`}
      style={cssVariables}
      data-touched={hasInteracted ? "1" : "0"}
    >
      {/* Background Word Art */}
      {backdropWord && (
        <div className="sh-backdrop" aria-hidden="true">
          {backdropWord}
        </div>
      )}

      {/* WebGL2 & Fallback Stage */}
      <div className="sh-stage" aria-hidden="true">
        <canvas key={canvasKey} ref={canvasRef} className="sh-canvas" />
        {/*
          Raw <img> is required here for WebGL canvas alignment, exact pixel sampling,
          and DOM-synchronized bounding rect calculation.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={fallbackImgRef}
          className="sh-fallback"
          src={activeSrc}
          alt={imageAlt}
          crossOrigin="anonymous"
          draggable={false}
        />
      </div>

      {/* Visually Hidden Text for Screen Readers */}
      <span className="sr-only">
        {brand} — {eyebrow}. {headline}. {body}
      </span>

      {/* Primary Accessible Navigation Bar */}
      {showNav && (
        <header>
          <nav ref={navRef} className="sh-nav" aria-label="Main Navigation">
            <Link className="sh-brand font-semibold text-lg" href="/">
              {brand}
            </Link>

            <ul className="sh-links">
              {navLinks.map((item, i) => (
                <li key={i}>
                  {item.href.startsWith("/") ? (
                    <Link className="sh-link" href={item.href}>
                      {item.label}
                    </Link>
                  ) : (
                    <a className="sh-link" href={item.href}>
                      {item.label}
                    </a>
                  )}
                </li>
              ))}

              {/* Theme Toggle Button */}
              <li className="sh-keep">
                <button
                  type="button"
                  className="sh-theme"
                  aria-label={
                    currentTheme === "dark"
                      ? "Switch to light theme"
                      : "Switch to dark theme"
                  }
                  onClick={toggleTheme}
                >
                  {currentTheme === "dark" ? <SunIcon /> : <MoonIcon />}
                </button>
              </li>

              {/* Header Action Button */}
              {navCta?.label && (
                <li className="sh-keep">
                  <Link className="sh-navcta" href={navCta.href}>
                    {navCta.label}
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </header>
      )}

      {/* Ambient Interaction Hint */}
      <div className="sh-hint" aria-hidden="true">
        {mounted && window.matchMedia("(pointer: coarse)").matches ? hintTouch : hint}
      </div>

      <div className="sh-spacer" />

      {/* Editorial Content Section */}
      <div ref={contentRef} className="sh-content">
        <div>
          {eyebrow && <p className="sh-eyebrow">{eyebrow}</p>}
          <h1 className="sh-h1">{headlineElements}</h1>
        </div>

        <div className="sh-aside">
          {body && <p className="sh-body">{body}</p>}
          <div className="sh-ctas">
            {primaryCta?.label && (
              <Link className="sh-btn" href={primaryCta.href}>
                <span>{primaryCta.label}</span>
                <ArrowIcon />
              </Link>
            )}
            {secondaryCta?.label && (
              <a className="sh-txt" href={secondaryCta.href}>
                <span>{secondaryCta.label}</span>
                <ArrowIcon />
              </a>
            )}
          </div>
        </div>
      </div>

      {enableCredit && (
        <span className="sh-credit" aria-hidden="true">
          Atmospheric Engine
        </span>
      )}
    </section>
  );
}
