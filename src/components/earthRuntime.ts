/** Shared clock and adaptive profiles; importing this module does not load Three.js. */
export type EarthConnection = {
  saveData?: boolean; effectiveType?: string; downlink?: number; rtt?: number;
  addEventListener?: (type: string, listener: EventListener) => void;
  removeEventListener?: (type: string, listener: EventListener) => void;
};
export type EarthCapabilities = {
  wide: boolean; finePointer: boolean; reducedMotion: boolean; webgl2: boolean;
  observers: boolean; memory?: number; cores?: number; connection?: EarthConnection;
};
export function canAnimateEarth({ reducedMotion, webgl2, observers }: Pick<EarthCapabilities, 'reducedMotion' | 'webgl2' | 'observers'>): boolean {
  // Screen size and input type select quality; neither disables rotation.
  return !reducedMotion && webgl2 && observers;
}
export type EarthRenderProfile = {
  mobile: boolean; lowTextures: boolean; pointer: boolean; segments: [number, number];
  initialTier: number; pixelRatios: readonly number[];
};
export function getEarthRenderProfile({ wide, finePointer, memory, cores, connection }: EarthCapabilities): EarthRenderProfile {
  const mobile = !wide || !finePointer;
  const constrained = (memory !== undefined && memory <= 2) || (cores !== undefined && cores <= 2)
    || Boolean(connection?.saveData) || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType || '')
    || Boolean(connection?.downlink && connection.downlink < 1.5);
  return {
    mobile, lowTextures: mobile || constrained, pointer: wide && finePointer,
    segments: mobile || constrained ? [48, 32] : [64, 48],
    initialTier: constrained ? 1 : 0,
    pixelRatios: mobile ? [1.15, 0.9, 0.7] : [1.5, 1.1, 0.8],
  };
}
export const EARTH_ROTATION_PERIOD = 180;
export const EARTH_ANGULAR_VELOCITY = Math.PI * 2 / EARTH_ROTATION_PERIOD;
export const EARTH_FRAME_TARGETS = [60, 30, 24] as const;

type EarthFrame = { angle: number; deltaSeconds: number; now: number; intervalMs: number };
type LoopOptions = {
  onFrame: (frame: EarthFrame) => void; onError: (error: unknown) => void;
  requestFrame: (callback: FrameRequestCallback) => number; cancelFrame: (handle: number) => void;
  initialAngle?: number; getTargetFps?: () => number;
};
/** A single RAF owner. Throttling GPU draws does not throttle angular time. */
export function createEarthRotationLoop({ onFrame, onError, requestFrame, cancelFrame,
  initialAngle = -25 * Math.PI / 180, getTargetFps = () => 60 }: LoopOptions) {
  let active = false, disposed = false;
  let scheduled: number | null = null, lastTime: number | null = null, lastRender: number | null = null;
  let angle = initialAngle, accumulated = 0;
  const cancel = () => {
    if (scheduled !== null) cancelFrame(scheduled);
    scheduled = null; lastTime = null; lastRender = null; accumulated = 0;
  };
  const tick: FrameRequestCallback = now => {
    scheduled = null;
    if (!active || disposed) return;
    const delta = lastTime === null ? 0 : Math.max(0, Math.min((now - lastTime) / 1000, 0.25));
    lastTime = now;
    angle += EARTH_ANGULAR_VELOCITY * delta;
    accumulated += delta;
    const intervalMs = lastRender === null ? 0 : now - lastRender;
    if (lastRender === null || intervalMs >= 1000 / getTargetFps() - 0.5) {
      try { onFrame({ angle, deltaSeconds: accumulated, now, intervalMs }); }
      catch (error) { active = false; cancel(); onError(error); return; }
      accumulated = 0; lastRender = now;
    }
    if (active && !disposed && scheduled === null) scheduled = requestFrame(tick);
  };
  return {
    setActive(next: boolean) {
      if (disposed || next === active) return;
      active = next;
      if (active) scheduled = requestFrame(tick); else cancel();
    },
    dispose() { disposed = true; active = false; cancel(); },
  };
}

/** Measured RAF delivery + render cost, sampled in multi-second windows with hysteresis. */
export function createEarthQualityGovernor(initialTier = 0) {
  let tier = Math.max(0, Math.min(initialTier, 2));
  let start: number | null = null, samples = 0, intervals = 0, costs = 0;
  let badWindows = 0, goodWindows = 0, severeWindows = 0, changedAt = -Infinity;
  const resetSamples = () => { start = null; samples = 0; intervals = 0; costs = 0; };
  return {
    get tier() { return tier; },
    reset() { resetSamples(); badWindows = 0; goodWindows = 0; severeWindows = 0; },
    sample(now: number, intervalMs: number, renderMs: number): 'unchanged' | 'changed' | 'fallback' {
      if (!intervalMs) { resetSamples(); return 'unchanged'; }
      if (start === null) start = now;
      samples++; intervals += intervalMs; costs += renderMs;
      if (now - start < 2000 || samples < 8) return 'unchanged';
      const averageInterval = intervals / samples, averageCost = costs / samples;
      const target = 1000 / EARTH_FRAME_TARGETS[tier];
      const bad = averageInterval > target * 1.6 || averageCost > target * 0.8;
      const good = averageInterval < target * 1.2 && averageCost < target * 0.35;
      const severe = averageInterval > 250 || averageCost > 140;
      badWindows = bad ? badWindows + 1 : 0;
      goodWindows = good ? goodWindows + 1 : 0;
      severeWindows = severe ? severeWindows + 1 : 0;
      resetSamples();
      if (tier === 2 && severeWindows >= 2) return 'fallback';
      if (badWindows >= 2 && tier < 2 && now - changedAt >= 8000) {
        tier++; changedAt = now; badWindows = 0; goodWindows = 0; severeWindows = 0;
        return 'changed';
      }
      if (goodWindows >= 5 && tier > initialTier && now - changedAt >= 15000) {
        tier--; changedAt = now; badWindows = 0; goodWindows = 0;
        return 'changed';
      }
      return 'unchanged';
    },
  };
}
