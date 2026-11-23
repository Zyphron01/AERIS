/**
 * AERIS — Liquid Sculpture Hero Type Contracts
 * Strict TypeScript definitions with zero `any`.
 */

export type ThemeMode = "light" | "dark";

export interface NavLinkItem {
  readonly label: string;
  readonly href: string;
}

export interface CtaItem {
  readonly label: string;
  readonly href: string;
}

export interface RectBounds {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface SculptureHeroProps {
  readonly src?: string;
  readonly darkSrc?: string;
  readonly mobileSrc?: string;
  readonly mobileDarkSrc?: string;
  readonly imageAlt?: string;
  readonly imageBackground?: string;
  readonly brand?: string;
  readonly navLinks?: readonly NavLinkItem[];
  readonly navCta?: CtaItem;
  readonly showNav?: boolean;
  readonly eyebrow?: string;
  readonly headline?: string;
  readonly headlineAccent?: string;
  readonly body?: string;
  readonly primaryCta?: CtaItem;
  readonly secondaryCta?: CtaItem;
  readonly hint?: string;
  readonly hintTouch?: string;
  readonly background?: string;
  readonly darkBackground?: string;
  readonly textColor?: string;
  readonly theme?: ThemeMode;
  readonly onThemeChange?: (nextTheme: ThemeMode) => void;
  readonly className?: string;
  readonly backdropWord?: string;
  readonly enableCredit?: boolean;
}

export interface ParticleEngineOptions {
  readonly radius?: number;
  readonly strength?: number;
  readonly spread?: number;
  readonly turb?: number;
  readonly returnSpeed?: number;
  readonly decay?: number;
  readonly dotSize?: number;
  readonly streak?: number;
  readonly ambient?: number;
  readonly introVis?: number;
  readonly restAlpha?: number;
  readonly tint?: readonly [number, number, number];
  readonly bgRgb?: readonly [number, number, number];
  readonly imgBgRgb?: readonly [number, number, number];
  readonly alphaMode?: number;
  readonly maxParticles?: number;
}

export interface PointerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  presence: number;
  isTouch: boolean;
  lastTime: number;
}
