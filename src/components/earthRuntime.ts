/** Kept independent of React/Three so importing the gate never downloads WebGL code. */
export type EarthConnection = {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  addEventListener?: (type: string, listener: EventListener) => void;
  removeEventListener?: (type: string, listener: EventListener) => void;
};

export type EarthCapabilities = {
  wide: boolean;
  finePointer: boolean;
  reducedMotion: boolean;
  webgl2: boolean;
  observers: boolean;
  memory?: number;
  cores?: number;
  connection?: EarthConnection;
};

export function canAnimateEarth(capabilities: EarthCapabilities): boolean {
  const { wide, finePointer, reducedMotion, webgl2, observers, memory, cores, connection } = capabilities;
  if (!wide || !finePointer || reducedMotion || !webgl2 || !observers) return false;
  if ((memory !== undefined && memory <= 2) || (cores !== undefined && cores <= 2)) return false;
  if (connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType || '')) return false;
  if (connection?.downlink && connection.downlink < 1.5) return false;
  if (connection?.rtt && connection.rtt > 500) return false;
  return true;
}

export const EARTH_ROTATION_PERIOD = 180;
export const EARTH_ANGULAR_VELOCITY = Math.PI * 2 / EARTH_ROTATION_PERIOD;

type EarthFrame = { angle: number; deltaSeconds: number };
type LoopOptions = {
  onFrame: (frame: EarthFrame) => void;
  onError: (error: unknown) => void;
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (handle: number) => void;
  initialAngle?: number;
};

/** The renderer's single RAF owner. Pausing resets the clock, not the orientation. */
export function createEarthRotationLoop({ onFrame, onError, requestFrame, cancelFrame, initialAngle = -25 * Math.PI / 180 }: LoopOptions) {
  let active = false;
  let disposed = false;
  let scheduled: number | null = null;
  let lastTime: number | null = null;
  let angle = initialAngle;
  const cancel = () => {
    if (scheduled !== null) cancelFrame(scheduled);
    scheduled = null;
    lastTime = null;
  };
  const tick: FrameRequestCallback = now => {
    scheduled = null;
    if (!active || disposed) return;
    const deltaSeconds = lastTime === null ? 0 : Math.max(0, Math.min((now - lastTime) / 1000, 0.1));
    lastTime = now;
    angle += EARTH_ANGULAR_VELOCITY * deltaSeconds;
    try { onFrame({ angle, deltaSeconds }); }
    catch (error) { active = false; cancel(); onError(error); return; }
    if (active && !disposed && scheduled === null) scheduled = requestFrame(tick);
  };
  return {
    setActive(next: boolean) {
      if (disposed || next === active) return;
      active = next;
      if (active) scheduled = requestFrame(tick);
      else cancel();
    },
    dispose() { disposed = true; active = false; cancel(); },
  };
}
