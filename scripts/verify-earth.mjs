import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { JSDOM, VirtualConsole } from 'jsdom';

const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let assertions = 0;
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); assertions++; };
const check = (actual, message) => { assert.ok(actual, message); assertions++; };
const closeTo = (actual, expected, message) => { check(Math.abs(actual - expected) < 1e-8, message); };
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
async function eventually(predicate, message) {
  for (let attempt = 0; attempt < 100; attempt++) { if (predicate()) return; await tick(); }
  assert.fail(message);
}

// Import the production controller; these tests exercise the same clock used by DesktopEarth.
const runtimeBuild = await build({ entryPoints: [path.join(project, 'src/components/earthRuntime.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent' });
const { createEarthRotationLoop, EARTH_ANGULAR_VELOCITY } = await import(`data:text/javascript;base64,${Buffer.from(runtimeBuild.outputFiles[0].text).toString('base64')}`);
function scheduler() {
  let id = 0;
  const pending = new Map();
  return {
    pending,
    requestFrame(callback) { pending.set(++id, callback); return id; },
    cancelFrame(handle) { pending.delete(handle); },
    step(time) {
      const [handle, callback] = pending.entries().next().value || [];
      assert.ok(callback, 'Expected one pending animation frame');
      pending.delete(handle); callback(time);
    },
  };
}
{
  const frames = scheduler();
  let state;
  const errors = [];
  const loop = createEarthRotationLoop({ ...frames, initialAngle: 0, onFrame: frame => { state = frame; }, onError: error => errors.push(error) });
  loop.setActive(true); loop.setActive(true); loop.setActive(true);
  equal(frames.pending.size, 1, 'Repeated activation owns exactly one RAF');
  frames.step(0);
  for (let index = 1; index <= 10800; index++) frames.step(index * 1000 / 60);
  closeTo(state.angle, 2 * Math.PI, 'Production controller completes one rotation in 180 simulated seconds');
  equal(frames.pending.size, 1, '180-second simulation does not duplicate RAFs');
  const beforePause = state.angle;
  loop.setActive(false); loop.setActive(false);
  equal(frames.pending.size, 0, 'Pause cancels the scheduled frame');
  loop.setActive(true); frames.step(600000);
  closeTo(state.angle, beforePause, 'Resume after seven hidden minutes does not jump');
  equal(state.deltaSeconds, 0, 'First resumed delta is reset');
  frames.step(600016);
  closeTo(state.angle - beforePause, EARTH_ANGULAR_VELOCITY * 0.016, 'Rotation resumes using elapsed frame time');
  frames.step(620016);
  equal(state.deltaSeconds, 0.1, 'Long active-frame stalls are capped to 100ms');
  loop.dispose(); loop.setActive(true);
  equal(frames.pending.size, 0, 'Disposal cancels RAF and prevents reactivation');
  equal(errors.length, 0, 'Normal lifecycle has no animation error');
}
{
  const frames = scheduler(); let errors = 0;
  const loop = createEarthRotationLoop({ ...frames, onFrame() { throw new Error('GPU failure'); }, onError() { errors++; } });
  loop.setActive(true); frames.step(0);
  equal(errors, 1, 'Frame failures reach the fallback callback');
  equal(frames.pending.size, 0, 'A failed frame does not schedule more rendering');
  loop.dispose();
}

const desktopStub = `import { useEffect } from 'react';
  globalThis.__imports++;
  export default function Desktop(props) {
    useEffect(() => { globalThis.__mounts++; globalThis.__controls = props; return () => { globalThis.__unmounts++; }; }, []);
    return <div className="test-desktop" />;
  }`;
const threeStub = `
  export class Group { rotation={x:0,y:0,z:0};children=[];add(item){this.children.push(item)} }
  export class Scene extends Group {}
  export class Vector3 {constructor(){} normalize(){return this} }
  export class PerspectiveCamera {position={z:0};updateProjectionMatrix(){} }
  export class SphereGeometry {dispose(){globalThis.__disposed.geometry++} }
  export class ShaderMaterial {constructor(options){this.options=options}dispose(){globalThis.__disposed.material++} }
  export class Mesh {rotation={x:0,y:0,z:0};scale={setScalar(){}};constructor(geometry,material){this.geometry=geometry;this.material=material} }
  export class TextureLoader {load(url,success,progress,error){queueMicrotask(()=>{if(globalThis.__textureFailure && url.includes('night'))error(new Error('Texture failed'));else success({anisotropy:0,dispose(){globalThis.__disposed.texture++}})})} }
  export class WebGLRenderer {
    domElement=document.createElement('canvas');debug={};capabilities={getMaxAnisotropy(){return 4}};
    constructor(){globalThis.__allocations++;if(globalThis.__constructionFailure)throw new Error('WebGL2 refused')}
    setPixelRatio(value){globalThis.__pixelRatio=value}setClearColor(){}setSize(){}
    render(scene){globalThis.__renderCount++;globalThis.__globe=scene.children[0].children[0];globalThis.__tilt=scene.children[0];if(globalThis.__shaderFailure)this.debug.onShaderError?.()}
    getContext(){return {isContextLost(){return Boolean(globalThis.__contextLost)}}}
    dispose(){globalThis.__disposed.renderer++}forceContextLoss(){globalThis.__disposed.context++}
  }
  export const BackSide=1;export const AdditiveBlending=2;
`;
async function bundle(entry, mock) {
  const built = await build({
    stdin: { contents: entry, resolveDir: project, sourcefile: 'earth-test.tsx', loader: 'tsx' },
    bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2022', jsx: 'automatic',
    loader: { '.css': 'empty' }, define: { 'process.env.NODE_ENV': '"test"' }, logLevel: 'silent',
    plugins: [{ name: 'earth-test-boundary', setup(builder) {
      if (mock === 'desktop') builder.onLoad({ filter: /DesktopEarth\.tsx$/ }, () => ({ contents: desktopStub, loader: 'tsx', resolveDir: project }));
      if (mock === 'three') {
        builder.onResolve({ filter: /^three$/ }, () => ({ path: 'three-test', namespace: 'mock' }));
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: threeStub, loader: 'js' }));
      }
    } }],
  });
  return built.outputFiles[0].text;
}
const gateScript = await bundle(`
  import React, { useEffect } from 'react'; import { createRoot } from 'react-dom/client';
  import EarthVisual from './src/components/EarthVisual';
  function Harness(){useEffect(()=>{globalThis.__mounted=true},[]);return <EarthVisual/>}
  globalThis.__root=createRoot(document.getElementById('root'));globalThis.__root.render(<Harness/>);
`, 'desktop');
const rendererScript = await bundle(`
  import React, { useEffect } from 'react'; import { createRoot } from 'react-dom/client';
  import DesktopEarth from './src/components/DesktopEarth';
  function Harness(){useEffect(()=>{globalThis.__mounted=true},[]);return <DesktopEarth onReady={()=>globalThis.__ready++} onFailure={()=>globalThis.__failures++}/>}
  globalThis.__root=createRoot(document.getElementById('root'));globalThis.__root.render(<Harness/>);
`, 'three');

async function open(script, options = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  virtualConsole.on('error', (...args) => errors.push(args.map(String).join(' ')));
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://earth.test', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const w = dom.window;
  Object.assign(w, { __imports: 0, __mounts: 0, __unmounts: 0, __ready: 0, __failures: 0, __allocations: 0, __renderCount: 0,
    __disposed: { texture: 0, material: 0, geometry: 0, renderer: 0, context: 0 }, __shaderFailure: options.shaderFailure,
    __constructionFailure: options.constructionFailure, __textureFailure: options.textureFailure });
  Object.defineProperty(w.navigator, 'hardwareConcurrency', { value: options.cores ?? 8 });
  Object.defineProperty(w.navigator, 'deviceMemory', { value: options.memory ?? 8 });
  const connectionListeners = new Set();
  const connection = { effectiveType: '4g', downlink: 10, rtt: 50, saveData: false, ...options.connection,
    addEventListener(type, listener) { connectionListeners.add(listener); }, removeEventListener(type, listener) { connectionListeners.delete(listener); },
    change(properties) { Object.assign(this, properties); for (const listener of connectionListeners) listener(new w.Event('change')); },
  };
  Object.defineProperty(w.navigator, 'connection', { value: connection });
  if (!options.noWebGL2) w.WebGL2RenderingContext = class {};
  const media = new Map();
  w.matchMedia = query => {
    if (!media.has(query)) {
      const min = query.match(/min-width:\s*(\d+)/);
      const listeners = new Set();
      media.set(query, { media: query, matches: min ? (options.width ?? 1440) >= Number(min[1]) : query.includes('prefers-reduced-motion') ? Boolean(options.reducedMotion) : options.finePointer !== false,
        listeners, addEventListener(type, listener) { listeners.add(listener); }, removeEventListener(type, listener) { listeners.delete(listener); },
        change(matches) { this.matches = matches; for (const listener of listeners) listener({ matches }); },
      });
    }
    return media.get(query);
  };
  const observers = [];
  w.IntersectionObserver = class {
    targets = new Set();
    constructor(callback, settings) { this.callback = callback; this.settings = settings; observers.push(this); }
    observe(target) { this.targets.add(target); } disconnect() { this.targets.clear(); }
    emit(value) { if (this.targets.size) this.callback([...this.targets].map(target => ({ target, isIntersecting: value }))); }
  };
  if (options.noObserver) delete w.IntersectionObserver;
  w.ResizeObserver = class { observe() {} disconnect() {} };
  Object.defineProperties(w.HTMLElement.prototype, { clientWidth: { get() { return 500; } }, clientHeight: { get() { return 500; } } });
  w.HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: 500, bottom: 500, width: 500, height: 500 });
  const frames = scheduler();
  w.requestAnimationFrame = callback => frames.requestFrame(callback);
  w.cancelAnimationFrame = handle => frames.cancelFrame(handle);
  let hidden = false;
  Object.defineProperty(w.document, 'hidden', { get: () => hidden });
  dom.hidden = value => { hidden = value; w.document.dispatchEvent(new w.Event('visibilitychange')); };
  dom.emit = value => observers.forEach(observer => observer.emit(value));
  dom.frames = frames; dom.media = media; dom.observers = observers; dom.errors = errors; dom.connection = connection;
  dom.connectionListeners = connectionListeners;
  dom.narrow = value => w.matchMedia('(min-width: 1024px)').change(!value);
  dom.finish = async () => { w.__root.unmount(); await tick(); equal(errors, [], 'No React/jsdom runtime errors'); w.close(); };
  w.eval(script);
  await eventually(() => w.__mounted, 'Earth harness did not mount');
  await tick();
  return dom;
}

for (const [label, options] of [
  ['390px phone', { width: 390 }], ['900px tablet', { width: 900 }], ['1023px boundary', { width: 1023 }],
  ['coarse pointer at desktop width', { finePointer: false }], ['reduced motion', { reducedMotion: true }],
  ['missing WebGL2 API', { noWebGL2: true }], ['2GB device', { memory: 2 }], ['two-core device', { cores: 2 }],
  ['data saver', { connection: { saveData: true } }], ['3g network', { connection: { effectiveType: '3g' } }],
  ['slow downlink', { connection: { downlink: 0.8 } }], ['high network latency', { connection: { rtt: 800 } }],
  ['missing observer API', { noObserver: true }],
]) {
  const dom = await open(gateScript, options);
  dom.emit(true); await tick();
  equal(dom.window.__imports, 0, `${label}: heavy renderer is never imported`);
  check(dom.window.document.querySelector('.earth-static img'), `${label}: static fallback remains present`);
  check(!dom.window.document.querySelector('.earth-visual--ready'), `${label}: fallback is never hidden`);
  await dom.finish();
}
{
  const dom = await open(gateScript, { width: 1024 }); const w = dom.window;
  equal(w.__imports, 0, 'Eligible desktop waits until Earth is near viewport');
  dom.emit(true); await eventually(() => w.__mounts === 1, 'Eligible desktop did not import renderer');
  equal(w.__imports, 1, '1024px fine-pointer desktop imports one renderer module');
  check(!w.document.querySelector('.earth-visual--ready'), 'Fallback remains until renderer confirms a valid frame');
  w.__controls.onReady(); await tick();
  check(w.document.querySelector('.earth-visual--ready'), 'Renderer readiness progressively reveals canvas');
  dom.emit(true); dom.emit(true); await tick(); equal(w.__mounts, 1, 'Repeated intersection does not duplicate renderer');
  dom.narrow(true); await eventually(() => w.__unmounts === 1, 'Resize cleanup did not settle'); equal(w.__unmounts, 1, 'Resize below desktop releases renderer');
  check(!w.document.querySelector('.earth-visual--ready'), 'Narrow resize restores static visual');
  dom.narrow(false); dom.emit(true); await eventually(() => w.__mounts === 2, 'Desktop resize failed to recover');
  equal(w.__imports, 1, 'Desktop resize reuses already-loaded module');
  w.__controls.onFailure(); await eventually(() => w.__unmounts === 2, 'Failure cleanup did not settle'); equal(w.__unmounts, 2, 'Renderer failure falls back safely');
  dom.emit(true); await tick(); equal(w.__mounts, 2, 'Failure does not trigger a retry loop');
  dom.narrow(true); dom.narrow(false); dom.emit(true); await eventually(() => w.__mounts === 3, 'Explicit resize retry failed');
  dom.connection.change({ saveData: true }); await eventually(() => w.__unmounts === 3, 'Data-saver cleanup did not settle'); equal(w.__unmounts, 3, 'Enabling data saver releases renderer');
  dom.connection.change({ saveData: false }); dom.emit(true); await eventually(() => w.__mounts === 4, 'Network capability recovery failed');
  w.matchMedia('(prefers-reduced-motion: reduce)').change(true); await eventually(() => w.__unmounts === 4, 'Reduced-motion cleanup did not settle'); equal(w.__unmounts, 4, 'Enabling reduced motion stops renderer');
  await dom.finish();
  check([...dom.media.values()].every(query => query.listeners.size === 0), 'All media-query listeners cleaned up');
  equal(dom.connectionListeners.size, 0, 'Network listener cleaned up');
  check(dom.observers.every(observer => observer.targets.size === 0), 'All lazy-load observations disconnected');
}
{
  const dom = await open(gateScript); const w = dom.window;
  dom.emit(true); dom.narrow(true); await tick(); await tick();
  equal(w.__mounts, 0, 'Import resolving after a narrow resize cannot mount WebGL');
  dom.narrow(false); dom.emit(true); await eventually(() => w.__mounts === 1, 'Cached import failed to recover after resize race');
  await dom.finish();
}

{
  const dom = await open(rendererScript); const w = dom.window;
  await eventually(() => dom.observers.length > 0, 'Renderer setup did not complete');
  equal(w.__allocations, 1, 'Actual DesktopEarth creates a single renderer');
  equal(dom.frames.pending.size, 0, 'Actual renderer waits for viewport visibility');
  equal(w.__ready, 0, 'Canvas/texture setup alone does not signal readiness');
  dom.emit(true); dom.emit(true); equal(dom.frames.pending.size, 1, 'Renderer visibility events retain one RAF');
  dom.frames.step(0); equal(w.__ready, 1, 'First rendered valid frame signals readiness');
  const initial = w.__globe.rotation.y;
  dom.frames.step(1000 / 60); check(w.__globe.rotation.y > initial, 'Actual mesh rotates through production frame controller');
  const beforePause = w.__globe.rotation.y;
  dom.hidden(true); equal(dom.frames.pending.size, 0, 'Hidden tab pauses actual renderer');
  dom.hidden(false); dom.frames.step(900000); closeTo(w.__globe.rotation.y, beforePause, 'Hidden-tab resume preserves mesh angle');
  dom.emit(false); equal(dom.frames.pending.size, 0, 'Offscreen Earth cancels rendering');
  dom.emit(true); dom.frames.step(1000000); closeTo(w.__globe.rotation.y, beforePause, 'Offscreen resume preserves mesh angle');
  const element = w.document.querySelector('.earth-canvas');
  element.dispatchEvent(new w.Event('pointerenter'));
  const pointer = new w.Event('pointermove'); Object.assign(pointer, { pointerType: 'mouse', clientX: 490, clientY: 490 }); element.dispatchEvent(pointer);
  for (let index = 1; index <= 60; index++) dom.frames.step(1000000 + index * 1000 / 60);
  check(w.__tilt.rotation.z > 0 && w.__tilt.rotation.z < 0.013, 'Local pointer response is damped and limited');
  element.dispatchEvent(new w.Event('pointerleave'));
  for (let index = 61; index <= 240; index++) dom.frames.step(1000000 + index * 1000 / 60);
  check(Math.abs(w.__tilt.rotation.z) < 0.00001, 'Pointer leave smoothly resets orientation response');
  equal(w.__failures, 0, 'Normal renderer lifecycle does not trigger fallback');
  await dom.finish();
  equal(dom.frames.pending.size, 0, 'Unmount cancels actual renderer RAF');
  equal(w.__disposed, { texture: 3, material: 3, geometry: 1, renderer: 1, context: 1 }, 'Actual renderer releases textures, materials, geometry, renderer and context');
}
for (const [label, options] of [['shader compilation failure', { shaderFailure: true }], ['context loss on first frame', {}]]) {
  const dom = await open(rendererScript, options); const w = dom.window;
  await eventually(() => dom.observers.length > 0, `${label}: setup failed`);
  if (!options.shaderFailure) w.__contextLost = true;
  dom.emit(true); dom.frames.step(0);
  equal(w.__ready, 0, `${label}: never hides fallback`);
  equal(w.__failures, 1, `${label}: reports one fallback transition`);
  equal(dom.frames.pending.size, 0, `${label}: stops rendering`);
  await dom.finish();
}
for (const [label, options] of [['renderer construction refused', { constructionFailure: true }], ['texture request failed', { textureFailure: true }]]) {
  const dom = await open(rendererScript, options); const w = dom.window;
  await eventually(() => w.__failures === 1, `${label}: missing failure callback`);
  equal(w.__ready, 0, `${label}: static fallback is retained`);
  equal(dom.frames.pending.size, 0, `${label}: no animation loop starts`);
  await dom.finish();
}
console.log(`PASS: ${assertions} Earth assertions. Actual React gate, production clock and renderer lifecycle tested with DOM/Three mocks.`);
console.log('  ✓ No desktop-module import on phone/tablet/reduced motion/unsupported API/low capability/slow network');
console.log('  ✓ One 180-second rotation, pause/resume without jumps, one RAF, local pointer damping and full disposal');
console.log('  ✓ Valid-frame readiness, shader/context/texture/constructor fallback, resize and import-race recovery');
console.log('LIMIT: No browser/GPU renderer available; real WebGL shader compilation, visual smoothness and frame rate are not measured.');
