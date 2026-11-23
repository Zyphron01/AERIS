/**
 * AERIS — WebGL2 Particle Simulation Engine
 * High-performance GPGPU particle physics and instanced rendering engine.
 * Strict TypeScript implementation with deterministic GPU resource management.
 */

import {
  QUAD_VS,
  FLOW_FS,
  STATE_FS,
  PARTICLE_VS,
  PARTICLE_FS,
  COMPOSITE_FS,
} from "./shaders.glsl";
import type { RectBounds } from "./types";

export interface ProgramInfo {
  readonly program: WebGLProgram;
  readonly uniforms: Readonly<Record<string, WebGLUniformLocation>>;
}

export interface EngineResolvedOptions {
  radius: number;
  strength: number;
  spread: number;
  turbulence: number;
  returnSpeed: number;
  speed: number;
  density: number;
  dotSize: number;
  streaks: boolean;
  ambient: boolean;
  ambientIntensity: number;
  liquid: number;
  restStyle: "particles" | "image";
  bg: readonly [number, number, number];
  imgBg?: readonly [number, number, number];
  interactive: boolean;
  intro: boolean;
  reducedMotion: boolean;
}

const TEXTURE_WIDTH = 1024;
const SETTLE_FRAMES_THRESHOLD = 270;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function compileProgram(
  gl: WebGL2RenderingContext,
  vsSource: string,
  fsSource: string
): ProgramInfo {
  const createShader = (type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Failed to allocate WebGL shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader) ?? "Unknown compilation error";
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
  };

  const program = gl.createProgram();
  if (!program) throw new Error("Failed to allocate WebGL program");

  const vs = createShader(gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl.FRAGMENT_SHADER, fsSource);

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "aPos");
  gl.linkProgram(program);

  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? "Unknown link error";
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }

  const uniforms: Record<string, WebGLUniformLocation> = {};
  const activeUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < activeUniforms; i++) {
    const uniformInfo = gl.getActiveUniform(program, i);
    if (uniformInfo) {
      const loc = gl.getUniformLocation(program, uniformInfo.name);
      if (loc) {
        uniforms[uniformInfo.name] = loc;
      }
    }
  }

  return { program, uniforms };
}

export class ParticleEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private options: EngineResolvedOptions;
  private readonly onFail: () => void;

  public onFirstFrame: (() => void) | null = null;
  public lastImage: HTMLImageElement | null = null;

  private lowPower = false;
  private stateFormat: { internal: number; type: number } = { internal: 0, type: 0 };

  private pFlow!: ProgramInfo;
  private pSim!: ProgramInfo;
  private pPart!: ProgramInfo;
  private pImg!: ProgramInfo;

  private vao: WebGLVertexArrayObject | null = null;
  private quadBuffer: WebGLBuffer | null = null;

  private imgTexture: WebGLTexture | null = null;
  private readonly flowTextures: WebGLTexture[] = [];
  private readonly flowFramebuffers: WebGLFramebuffer[] = [];
  private flowWidth = 256;
  private flowHeight = 104;
  private flowIndex = 0;
  private flowDirty = false;

  private homeTexture: WebGLTexture | null = null;
  private colTexture: WebGLTexture | null = null;
  private readonly stateTextures: WebGLTexture[] = [];
  private readonly stateFramebuffers: WebGLFramebuffer[] = [];
  private stateIndex = 0;
  private texHeight = 1;
  private particleCount = 0;
  private gridWidth = 1;
  private stateDirty = false;

  private alphaMode = false;
  private imgBg: [number, number, number] = [0.918, 0.914, 0.906];
  private flowing = 0;
  private aspectRatio = 2.5;

  private rect: RectBounds = { x: 0, y: 0, w: 1, h: 1 };
  private cssWidth = 1;
  private cssHeight = 1;

  private readonly target = { x: -9999, y: -9999 };
  private readonly mouse = { x: -9999, y: -9999 };
  private readonly prevMouse = { x: -9999, y: -9999 };
  private readonly mouseVelocity = { x: 0, y: 0 };

  private presence = 0;
  private presenceTarget = 0;
  private burst = 0;
  private settle = 1e9;
  private touchRelease = 0;
  private time = 0;
  private introTime = 1;

  private rafId = 0;
  private running = false;
  private lastTimestamp = 0;
  private skipFrame = 0;
  private visible = true;
  private ready = false;
  private destroyed = false;
  private contextLost = false;

  private homeData: Float32Array | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    options: EngineResolvedOptions,
    onFail: () => void
  ) {
    this.canvas = canvas;
    this.options = options;
    this.onFail = onFail;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    });

    if (!gl) {
      throw new Error("WebGL2 unavailable");
    }
    this.gl = gl;

    if (typeof window !== "undefined") {
      const nav = navigator as { hardwareConcurrency?: number; deviceMemory?: number };
      this.lowPower =
        (nav.hardwareConcurrency ?? 8) <= 4 ||
        (nav.deviceMemory ?? 8) <= 4 ||
        window.matchMedia("(pointer: coarse)").matches;
    }

    this.initGL();
    this.canvas.addEventListener("webglcontextlost", this.handleContextLost, false);
    this.canvas.addEventListener("webglcontextrestored", this.handleContextRestored, false);
  }

  private readonly handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.contextLost = true;
    this.stop();
    this.onFail();
  };

  private readonly handleContextRestored = (): void => {
    this.contextLost = false;
    try {
      this.initGL();
      if (this.lastImage) {
        this.setImage(this.lastImage);
      }
    } catch {
      this.onFail();
    }
  };

  private initGL(): void {
    const gl = this.gl;
    const floatExt = gl.getExtension("EXT_color_buffer_float");
    const halfFloatExt = floatExt ? null : gl.getExtension("EXT_color_buffer_half_float");

    if (!floatExt && !halfFloatExt) {
      throw new Error("No float render targets supported");
    }

    this.stateFormat = { internal: gl.RGBA16F, type: gl.HALF_FLOAT };

    this.pFlow = compileProgram(gl, QUAD_VS, FLOW_FS);
    this.pSim = compileProgram(gl, QUAD_VS, STATE_FS);
    this.pPart = compileProgram(gl, PARTICLE_VS, PARTICLE_FS);
    this.pImg = compileProgram(gl, QUAD_VS, COMPOSITE_FS);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    for (let i = 0; i < 2; i++) {
      const tex = this.createTexture(
        gl.RGBA8,
        this.flowWidth,
        this.flowHeight,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
        gl.LINEAR
      );
      const fb = gl.createFramebuffer();
      if (!fb) throw new Error("Failed to create flow framebuffer");
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tex,
        0
      );
      this.flowTextures.push(tex);
      this.flowFramebuffers.push(fb);
    }
    this.clearFlow();
  }

  private createTexture(
    internalFormat: number,
    w: number,
    h: number,
    format: number,
    type: number,
    pixels: ArrayBufferView | null,
    filter: number
  ): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error("Failed to allocate texture");
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, pixels);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  public clearFlow(): void {
    const gl = this.gl;
    for (const fb of this.flowFramebuffers) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0, 0, this.flowWidth, this.flowHeight);
      gl.clearColor(128 / 255, 128 / 255, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.flowDirty = false;
  }

  public clearState(): void {
    const gl = this.gl;
    for (const fb of this.stateFramebuffers) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0, 0, TEXTURE_WIDTH, this.texHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.stateDirty = false;
  }

  public setImage(image: HTMLImageElement): void {
    if (this.destroyed || this.contextLost) return;
    const gl = this.gl;
    this.lastImage = image;
    this.aspectRatio = image.naturalWidth / image.naturalHeight || 2.5;
    this.flowHeight = Math.max(32, Math.round(this.flowWidth / this.aspectRatio));

    for (const tex of this.flowTextures) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        this.flowWidth,
        this.flowHeight,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
    }
    this.clearFlow();

    if (this.imgTexture) gl.deleteTexture(this.imgTexture);
    this.imgTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.imgTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.buildParticles(image);
    this.ready = true;

    if (this.options.intro && !this.options.reducedMotion) {
      this.startIntro();
    }
    this.wake();
  }

  private buildParticles(image: HTMLImageElement): void {
    const gl = this.gl;
    const baseW = this.lowPower ? 640 : 1000;
    const targetW = Math.round(baseW * Math.sqrt(clamp(this.options.density, 0.15, 2)));
    const targetH = Math.max(1, Math.round(targetW / this.aspectRatio));
    this.gridWidth = targetW;

    let pixelData: Uint8ClampedArray;
    try {
      const offscreen = document.createElement("canvas");
      offscreen.width = targetW;
      offscreen.height = targetH;
      const ctx = offscreen.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("2D context unavailable");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, targetW, targetH);
      pixelData = ctx.getImageData(0, 0, targetW, targetH).data;
    } catch {
      throw new Error("Image is not CORS readable");
    }

    let alphaCount = 0;
    for (let i = 3; i < pixelData.length; i += 4 * 7) {
      if (pixelData[i] < 250) alphaCount++;
    }
    this.alphaMode = alphaCount > pixelData.length / (4 * 7) / 20;

    if (this.options.imgBg) {
      this.imgBg = [...this.options.imgBg];
    } else if (!this.alphaMode) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;
      const sampleSize = Math.max(2, Math.round(targetW * 0.012));
      const corners = [
        [0, 0],
        [targetW - sampleSize, 0],
        [0, targetH - sampleSize],
        [targetW - sampleSize, targetH - sampleSize],
      ];
      for (const [cx, cy] of corners) {
        for (let y = cy; y < cy + sampleSize; y++) {
          for (let x = cx; x < cx + sampleSize; x++) {
            const idx = (y * targetW + x) * 4;
            rSum += pixelData[idx];
            gSum += pixelData[idx + 1];
            bSum += pixelData[idx + 2];
            count++;
          }
        }
      }
      this.imgBg = [rSum / count / 255, gSum / count / 255, bSum / count / 255];
    }

    const homePoints: number[] = [];
    const colorPoints: number[] = [];

    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const idx = (y * targetW + x) * 4;
        const r = pixelData[idx] / 255;
        const g = pixelData[idx + 1] / 255;
        const b = pixelData[idx + 2] / 255;

        if (this.alphaMode) {
          const a = pixelData[idx + 3] / 255;
          if (a < 0.12 || (a < 0.5 && Math.random() > a * 2)) continue;
        } else {
          const dist = Math.hypot(
            r - this.imgBg[0],
            g - this.imgBg[1],
            b - this.imgBg[2]
          );
          if (dist < 0.03 || (dist < 0.07 && Math.random() > (dist - 0.03) / 0.04)) {
            continue;
          }
        }

        const jitterX = (Math.random() - 0.5) * 0.6;
        const jitterY = (Math.random() - 0.5) * 0.6;
        homePoints.push(
          (x + 0.5 + jitterX) / targetW,
          (y + 0.5 + jitterY) / targetH,
          Math.random(),
          0.85 + Math.random() * 0.3
        );
        colorPoints.push(pixelData[idx], pixelData[idx + 1], pixelData[idx + 2], 255);
      }
    }

    const numParticles = homePoints.length / 4;
    this.particleCount = numParticles;
    this.texHeight = Math.max(1, Math.ceil(numParticles / TEXTURE_WIDTH));

    const totalTexels = TEXTURE_WIDTH * this.texHeight;
    const homeBuffer = new Float32Array(totalTexels * 4);
    homeBuffer.set(homePoints);

    const colBuffer = new Uint8Array(totalTexels * 4);
    colBuffer.set(colorPoints);

    if (this.homeTexture) gl.deleteTexture(this.homeTexture);
    if (this.colTexture) gl.deleteTexture(this.colTexture);
    for (const tex of this.stateTextures) gl.deleteTexture(tex);
    for (const fb of this.stateFramebuffers) gl.deleteFramebuffer(fb);

    this.stateTextures.length = 0;
    this.stateFramebuffers.length = 0;

    this.homeTexture = this.createTexture(
      gl.RGBA32F,
      TEXTURE_WIDTH,
      this.texHeight,
      gl.RGBA,
      gl.FLOAT,
      homeBuffer,
      gl.NEAREST
    );

    this.colTexture = this.createTexture(
      gl.RGBA8,
      TEXTURE_WIDTH,
      this.texHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      colBuffer,
      gl.NEAREST
    );

    for (let i = 0; i < 2; i++) {
      const tex = this.createTexture(
        this.stateFormat.internal,
        TEXTURE_WIDTH,
        this.texHeight,
        gl.RGBA,
        this.stateFormat.type,
        null,
        gl.NEAREST
      );
      const fb = gl.createFramebuffer();
      if (!fb) throw new Error("Failed to create state framebuffer");
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tex,
        0
      );
      if (
        gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE
      ) {
        throw new Error("Float FBO incomplete");
      }
      this.stateTextures.push(tex);
      this.stateFramebuffers.push(fb);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.homeData = homeBuffer;
    this.clearState();
  }

  public startIntro(): void {
    const gl = this.gl;
    const home = this.homeData;
    if (!home) return;

    const width = this.rect.w > 10 ? this.rect.w : 1300;
    const totalTexels = TEXTURE_WIDTH * this.texHeight;
    const initBuffer = new Float32Array(totalTexels * 4);

    for (let i = 0; i < this.particleCount; i++) {
      const nx = home[i * 4] - 0.5;
      const ny = home[i * 4 + 1] - 0.5;
      const depth = home[i * 4 + 2];
      const angle = (Math.random() - 0.5) * 0.9 + (nx > 0 ? 0 : Math.PI);
      const dist = width * (0.04 + Math.random() * 0.14) * (0.5 + Math.abs(nx) * 1.4);

      initBuffer[i * 4] = Math.cos(angle) * dist + nx * width * 0.25 * depth;
      initBuffer[i * 4 + 1] =
        Math.sin(angle) * dist * 0.55 + ny * 120 * (Math.random() - 0.5);
    }

    gl.bindTexture(gl.TEXTURE_2D, this.stateTextures[this.stateIndex]);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      this.stateFormat.internal,
      TEXTURE_WIDTH,
      this.texHeight,
      0,
      gl.RGBA,
      gl.FLOAT,
      initBuffer
    );
    this.introTime = 0;
    this.stateDirty = true;
  }

  public setOptions(opts: Partial<EngineResolvedOptions>): void {
    const rebuild =
      (opts.density !== undefined && opts.density !== this.options.density) ||
      (opts.imgBg !== undefined &&
        String(opts.imgBg) !== String(this.options.imgBg));

    this.options = { ...this.options, ...opts };

    if (rebuild && this.ready && this.lastImage) {
      try {
        this.buildParticles(this.lastImage);
      } catch {
        this.onFail();
      }
    }
    this.wake();
  }

  public resize(cssW: number, cssH: number, rect: RectBounds): void {
    this.cssWidth = Math.max(1, cssW);
    this.cssHeight = Math.max(1, cssH);
    this.rect = rect;

    let dpr = Math.min(
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      this.lowPower ? 1.5 : 2
    );

    // Limit maximum total canvas pixels to prevent GPU memory pressure
    if (this.cssWidth * this.cssHeight * dpr * dpr > 4.5e6) {
      dpr = Math.max(1, Math.sqrt(4.5e6 / (this.cssWidth * this.cssHeight)));
    }

    const canvasW = Math.round(this.cssWidth * dpr);
    const canvasH = Math.round(this.cssHeight * dpr);

    if (this.canvas.width !== canvasW || this.canvas.height !== canvasH) {
      this.canvas.width = canvasW;
      this.canvas.height = canvasH;
    }
    this.draw();
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) {
      this.wake();
    } else {
      this.stop();
    }
  }

  public isReady(): boolean {
    return this.ready;
  }

  public pointer(
    action: "down" | "move" | "up" | "leave",
    x: number,
    y: number,
    isTouch: boolean
  ): void {
    if (!this.options.interactive || this.contextLost) return;
    const now = performance.now();

    if (action === "leave" || action === "up") {
      if (isTouch) {
        this.touchRelease = now + 260;
      } else {
        this.presenceTarget = 0;
      }
      this.wake();
      return;
    }

    if (this.mouse.x < -9000 || action === "down") {
      this.mouse.x = this.prevMouse.x = x;
      this.mouse.y = this.prevMouse.y = y;
    }

    this.target.x = x;
    this.target.y = y;
    this.presenceTarget = 1;
    this.settle = 0;

    if (action === "down") {
      this.burst = 1;
      this.touchRelease = 0;
    }

    this.wake();
  }

  public wake(): void {
    if (
      !this.ready ||
      this.running ||
      !this.visible ||
      this.destroyed ||
      this.contextLost
    ) {
      if (this.ready && !this.running) {
        this.draw();
      }
      return;
    }
    this.running = true;
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this.renderLoop);
  }

  public stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private radiusPixels(): number {
    return this.options.radius * clamp(this.rect.w / 1400, 0.6, 1.25);
  }

  private dynamicStrength(): number {
    return this.options.strength * (this.options.reducedMotion ? 0.5 : 1);
  }

  private triggerFirstFrame(): void {
    if (this.onFirstFrame) {
      const cb = this.onFirstFrame;
      this.onFirstFrame = null;
      cb();
    }
  }

  private readonly renderLoop = (timestamp: number): void => {
    if (!this.running) return;

    const delta = timestamp - this.lastTimestamp;
    const dt = clamp(delta / 16.6667, 0.25, 3);
    this.lastTimestamp = timestamp;

    const opts = this.options;
    const enableAmbient = opts.ambient && !opts.reducedMotion;

    if (this.touchRelease && timestamp > this.touchRelease) {
      this.presenceTarget = 0;
      this.touchRelease = 0;
    }

    const mouseEase = 1 - Math.pow(1 - 0.22, dt);
    this.mouse.x += (this.target.x - this.mouse.x) * mouseEase;
    this.mouse.y += (this.target.y - this.mouse.y) * mouseEase;

    const deltaX = (this.mouse.x - this.prevMouse.x) / dt;
    const deltaY = (this.mouse.y - this.prevMouse.y) / dt;
    this.prevMouse.x = this.mouse.x;
    this.prevMouse.y = this.mouse.y;

    this.mouseVelocity.x += (clamp(deltaX, -60, 60) - this.mouseVelocity.x) * 0.5;
    this.mouseVelocity.y += (clamp(deltaY, -60, 60) - this.mouseVelocity.y) * 0.5;

    const pRate = this.presenceTarget > this.presence ? 0.1 : 0.035;
    this.presence += (this.presenceTarget - this.presence) * (1 - Math.pow(1 - pRate, dt));
    if (this.presence < 0.001 && this.presenceTarget === 0) {
      this.presence = 0;
    }

    const flowRate = this.presenceTarget > this.flowing ? 0.05 : 0.018;
    this.flowing += (this.presenceTarget - this.flowing) * (1 - Math.pow(1 - flowRate, dt));
    if (this.flowing < 0.002 && this.presenceTarget === 0) {
      this.flowing = 0;
    }

    if (this.introTime < 1) {
      this.introTime = Math.min(1, this.introTime + Math.min(delta, 100) / 3200);
    }

    const hasInput = this.presence > 0.001 || this.burst > 0;
    this.settle = hasInput ? 0 : this.settle + dt;

    if (!hasInput && this.settle >= SETTLE_FRAMES_THRESHOLD && this.introTime >= 1) {
      if (this.flowDirty) this.clearFlow();
      if (this.stateDirty) this.clearState();

      if (!enableAmbient) {
        this.draw();
        this.triggerFirstFrame();
        this.stop();
        return;
      }

      this.rafId = requestAnimationFrame(this.renderLoop);
      if (this.skipFrame++ % 2) return;

      this.time += (dt * 2 * opts.speed) / 60;
      this.draw();
      this.triggerFirstFrame();
      return;
    }

    this.rafId = requestAnimationFrame(this.renderLoop);
    this.time += (dt * opts.speed * (1 + this.flowing * 1.6)) / 60;

    this.stepFlow(dt);
    this.stepSim(dt);

    this.burst = Math.max(0, this.burst - 0.1 * dt);
    this.draw();
    this.triggerFirstFrame();
  };

  private stepFlow(dt: number): void {
    const gl = this.gl;
    const prog = this.pFlow;
    const nextIdx = 1 - this.flowIndex;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.flowFramebuffers[nextIdx]);
    gl.viewport(0, 0, this.flowWidth, this.flowHeight);
    gl.disable(gl.BLEND);
    gl.useProgram(prog.program);

    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.flowTextures[this.flowIndex]);
    gl.uniform1i(prog.uniforms.uPrev, 0);
    gl.uniform2f(prog.uniforms.uTexel, 1 / this.flowWidth, 1 / this.flowHeight);

    const r = this.rect;
    gl.uniform2f(
      prog.uniforms.uMouse,
      (this.mouse.x - r.x) / r.w,
      (this.mouse.y - r.y) / r.h
    );
    gl.uniform2f(
      prog.uniforms.uVel,
      clamp(this.mouseVelocity.x / 40, -1, 1),
      clamp(this.mouseVelocity.y / 40, -1, 1)
    );
    gl.uniform2f(prog.uniforms.uSize, r.w, r.h);
    gl.uniform1f(prog.uniforms.uRadius, this.radiusPixels());
    gl.uniform1f(
      prog.uniforms.uPresence,
      Math.max(this.presence, this.burst)
    );
    gl.uniform1f(prog.uniforms.uDecay, Math.pow(0.968, dt));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.flowIndex = nextIdx;
    this.flowDirty = true;
  }

  private stepSim(dt: number): void {
    if (!this.particleCount) return;
    const gl = this.gl;
    const prog = this.pSim;
    const opts = this.options;
    const r = this.rect;
    const nextStateIdx = 1 - this.stateIndex;
    const introVal =
      opts.reducedMotion || !opts.intro ? 0 : Math.pow(1 - this.introTime, 2);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.stateFramebuffers[nextStateIdx]);
    gl.viewport(0, 0, TEXTURE_WIDTH, this.texHeight);
    gl.disable(gl.BLEND);
    gl.useProgram(prog.program);

    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.stateTextures[this.stateIndex]);
    gl.uniform1i(prog.uniforms.uState, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.homeTexture);
    gl.uniform1i(prog.uniforms.uHome, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.flowTextures[this.flowIndex]);
    gl.uniform1i(prog.uniforms.uFlow, 2);

    gl.uniform2f(prog.uniforms.uSize, r.w, r.h);
    gl.uniform2f(prog.uniforms.uMouse, this.mouse.x - r.x, this.mouse.y - r.y);
    gl.uniform1f(prog.uniforms.uRadius, this.radiusPixels());
    gl.uniform1f(prog.uniforms.uPresence, Math.max(this.presence, this.burst));
    gl.uniform1f(prog.uniforms.uStrength, this.dynamicStrength() * (1 + this.burst * 1.5));
    gl.uniform1f(prog.uniforms.uSpread, clamp(opts.spread, 0, 2));
    gl.uniform1f(
      prog.uniforms.uTurb,
      clamp(opts.turbulence, 0, 2) * (opts.reducedMotion ? 0.3 : 1)
    );
    gl.uniform1f(prog.uniforms.uReturn, clamp(opts.returnSpeed, 0, 2));
    gl.uniform1f(prog.uniforms.uTime, this.time);
    gl.uniform1f(prog.uniforms.uDt, dt);
    gl.uniform1f(prog.uniforms.uIntro, introVal);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.stateIndex = nextStateIdx;
    this.stateDirty = true;
  }

  public draw(): void {
    if (!this.ready || this.contextLost || this.destroyed) return;
    const gl = this.gl;
    const opts = this.options;
    const r = this.rect;
    const isReduced = opts.reducedMotion;
    const introVis =
      isReduced || !opts.intro ? 1 : Math.pow(this.introTime, 2.2);

    const ambientVal =
      (opts.ambient && !isReduced ? clamp(opts.ambientIntensity, 0, 2) : 0) +
      this.flowing * 0.85 * clamp(opts.liquid, 0, 2) * (isReduced ? 0.3 : 1);

    const restMode = opts.restStyle === "particles" ? 1 : 0;
    const [bgR, bgG, bgB] = opts.bg;
    const [imgR, imgG, imgB] = this.imgBg;
    const dpr = this.canvas.width / this.cssWidth;
    const currentPresence = Math.max(this.presence, this.burst);
    const localMouseX = this.mouse.x - r.x;
    const localMouseY = this.mouse.y - r.y;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.bindVertexArray(this.vao);
    gl.disable(gl.BLEND);

    // Pass 1: Background image composite
    const pImg = this.pImg;
    gl.useProgram(pImg.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imgTexture);
    gl.uniform1i(pImg.uniforms.uImg, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.flowTextures[this.flowIndex]);
    gl.uniform1i(pImg.uniforms.uFlow, 1);

    gl.uniform2f(pImg.uniforms.uRes, this.cssWidth, this.cssHeight);
    gl.uniform1f(pImg.uniforms.uDpr, dpr);
    gl.uniform4f(pImg.uniforms.uRect, r.x, r.y, r.w, r.h);
    gl.uniform3f(pImg.uniforms.uBg, bgR, bgG, bgB);
    gl.uniform3f(pImg.uniforms.uImgBg, imgR, imgG, imgB);
    gl.uniform2f(pImg.uniforms.uMouse, localMouseX, localMouseY);
    gl.uniform1f(pImg.uniforms.uPresence, currentPresence);
    gl.uniform1f(pImg.uniforms.uRadius, this.radiusPixels());
    gl.uniform1f(pImg.uniforms.uStrength, this.dynamicStrength());
    gl.uniform1f(pImg.uniforms.uTime, this.time);
    gl.uniform1f(pImg.uniforms.uAmbient, ambientVal);
    gl.uniform1f(pImg.uniforms.uIntroVis, introVis);
    gl.uniform1f(pImg.uniforms.uRest, restMode);
    gl.uniform1f(pImg.uniforms.uAlphaMode, this.alphaMode ? 1 : 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (
      !this.particleCount ||
      (!this.stateDirty && restMode === 0 && introVis >= 1)
    ) {
      return;
    }

    // Pass 2: Instanced particle drawing
    const pPart = this.pPart;
    gl.useProgram(pPart.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.stateTextures[this.stateIndex]);
    gl.uniform1i(pPart.uniforms.uState, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.homeTexture);
    gl.uniform1i(pPart.uniforms.uHome, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.colTexture);
    gl.uniform1i(pPart.uniforms.uCol, 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.flowTextures[this.flowIndex]);
    gl.uniform1i(pPart.uniforms.uFlow, 3);

    gl.uniform1i(pPart.uniforms.uTexW, TEXTURE_WIDTH);
    gl.uniform4f(pPart.uniforms.uRect, r.x, r.y, r.w, r.h);
    gl.uniform2f(pPart.uniforms.uRes, this.cssWidth, this.cssHeight);
    gl.uniform2f(pPart.uniforms.uMouse, localMouseX, localMouseY);
    gl.uniform1f(pPart.uniforms.uRadius, this.radiusPixels());
    gl.uniform1f(pPart.uniforms.uPresence, currentPresence);

    const cellW = r.w / this.gridWidth;
    gl.uniform1f(pPart.uniforms.uDot, cellW * 1.45 * clamp(opts.dotSize, 0.2, 3));
    gl.uniform1f(pPart.uniforms.uTime, this.time);
    gl.uniform1f(pPart.uniforms.uAmbient, ambientVal);
    gl.uniform1f(
      pPart.uniforms.uStreak,
      (opts.streaks ? 1 : 0) * (0.45 + 0.55 * introVis)
    );
    gl.uniform1f(pPart.uniforms.uIntroVis, introVis);
    gl.uniform1f(pPart.uniforms.uRest, restMode);
    gl.uniform1f(pPart.uniforms.uDpr, dpr);

    if (this.alphaMode) {
      gl.uniform3f(pPart.uniforms.uTint, 1, 1, 1);
    } else {
      gl.uniform3f(
        pPart.uniforms.uTint,
        bgR / Math.max(imgR, 0.001),
        bgG / Math.max(imgG, 0.001),
        bgB / Math.max(imgB, 0.001)
      );
    }

    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.particleCount);
    gl.disable(gl.BLEND);
  }

  public destroy(): void {
    this.destroyed = true;
    this.stop();

    this.canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.handleContextRestored);

    const gl = this.gl;
    if (!this.contextLost) {
      if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);
      if (this.vao) gl.deleteVertexArray(this.vao);

      const allTextures = [
        ...this.flowTextures,
        ...this.stateTextures,
        this.imgTexture,
        this.homeTexture,
        this.colTexture,
      ];
      for (const tex of allTextures) {
        if (tex) gl.deleteTexture(tex);
      }

      const allFramebuffers = [...this.flowFramebuffers, ...this.stateFramebuffers];
      for (const fb of allFramebuffers) {
        if (fb) gl.deleteFramebuffer(fb);
      }

      const allPrograms = [this.pFlow, this.pSim, this.pPart, this.pImg];
      for (const prog of allPrograms) {
        if (prog?.program) gl.deleteProgram(prog.program);
      }
    }
  }
}
