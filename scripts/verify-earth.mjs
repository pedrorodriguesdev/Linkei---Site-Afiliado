import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, stat } from 'node:fs/promises';
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
const { createEarthRotationLoop, EARTH_ANGULAR_VELOCITY, getEarthRenderProfile, createEarthQualityGovernor } = await import(`data:text/javascript;base64,${Buffer.from(runtimeBuild.outputFiles[0].text).toString('base64')}`);
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
  frames.step(600017);
  closeTo(state.angle - beforePause, EARTH_ANGULAR_VELOCITY * 0.017, 'Rotation resumes using elapsed frame time');
  frames.step(620016);
  equal(state.deltaSeconds, 0.25, 'Long active-frame stalls are capped to 250ms');
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
  export class SphereGeometry {constructor(...args){globalThis.__segments=args}dispose(){globalThis.__disposed.geometry++} }
  export class ShaderMaterial {constructor(options){this.options=options;this.uniforms=options.uniforms}dispose(){globalThis.__disposed.material++} }
  export class Mesh {rotation={x:0,y:0,z:0};scale={setScalar(value){this.value=value}};constructor(geometry,material){this.geometry=geometry;this.material=material} }
  export class TextureLoader {load(url,success,progress,error){globalThis.__textureURLs.push(url);queueMicrotask(()=>{if(globalThis.__textureFailure && url.includes('city-lights'))error(new Error('Texture failed'));else success({anisotropy:0,dispose(){globalThis.__disposed.texture++}})})} }
  export class WebGLRenderer {
    domElement=document.createElement('canvas');debug={};capabilities={getMaxAnisotropy(){return 4}};
    constructor(){globalThis.__allocations++;if(globalThis.__constructionFailure)throw new Error('WebGL2 refused')}
    setPixelRatio(value){globalThis.__pixelRatio=value}setClearColor(){}setSize(width,height){globalThis.__renderSize=[width,height]}
    render(scene){globalThis.__perfTime+=globalThis.__renderCost;globalThis.__renderCount++;globalThis.__globe=scene.children[0].children[0];globalThis.__tilt=scene.children[0];if(globalThis.__shaderFailure)this.debug.onShaderError?.()}
    getContext(){return {isContextLost(){return Boolean(globalThis.__contextLost)}}}
    dispose(){globalThis.__disposed.renderer++}forceContextLoss(){globalThis.__disposed.context++}
  }
  export const BackSide=1;export const AdditiveBlending=2;export const SRGBColorSpace='srgb';export const NoColorSpace='';export const LinearMipmapLinearFilter=3;export const LinearFilter=4;
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

const integratedScript = await bundle(`
 import React,{useEffect} from 'react';import {createRoot} from 'react-dom/client';
 import EarthVisual from './src/components/EarthVisual';
 function Harness(){useEffect(()=>{globalThis.__mounted=true},[]);return <EarthVisual/>}
 globalThis.__root=createRoot(document.getElementById('root'));globalThis.__root.render(<Harness/>);
`, 'three');

async function open(script, options = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  virtualConsole.on('error', (...args) => errors.push(args.map(String).join(' ')));
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: options.debug ? 'https://earth.test/?globeDebug=1' : 'https://earth.test', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const w = dom.window;
  if(options.preference)w.localStorage.setItem('elevon-earth',options.preference);
  Object.defineProperty(w.performance, 'now', { value: () => w.__perfTime });
  Object.defineProperty(w, 'devicePixelRatio', { value: 3, configurable: true });
  Object.assign(w, { __imports: 0, __mounts: 0, __unmounts: 0, __ready: 0, __failures: 0, __allocations: 0, __renderCount: 0,
    __textureURLs: [], __perfTime: 0, __renderCost: options.renderCost ?? 1, __disposed: { texture: 0, material: 0, geometry: 0, renderer: 0, context: 0 }, __shaderFailure: options.shaderFailure,
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
  ['missing observer API', { noObserver: true }],
]) {
  const dom = await open(gateScript, options);
  dom.emit(true); await tick();
  equal(dom.window.__imports, 0, `${label}: renderer is never imported`);
  check(dom.window.document.querySelector('.earth-static img'), `${label}: static fallback remains present`);
  check(!dom.window.document.querySelector('.earth-visual--ready'), `${label}: fallback is never hidden`);
  await dom.finish();
}
for (const [label, options] of [
  ...[320,360,390,430,768,1024,1440].map(width => [`${width}px viewport`, {width, finePointer: width >= 1024}]),
  ['constructor probe missing but real renderer works', {noWebGL2:true}],
  ['coarse input on wide screen', {finePointer:false}], ['two-core 2GB phone', {width:390,memory:2,cores:2}],
  ['data saver', {width:390,connection:{saveData:true}}], ['3g mobile', {width:390,connection:{effectiveType:'3g'}}],
  ['slow downlink', {connection:{downlink:0.8}}], ['high latency', {connection:{rtt:800}}],
]) {
  const dom = await open(gateScript, options); const w = dom.window;
  equal(w.__imports, 0, `${label}: lazy load waits for visibility`);
  dom.emit(true); await eventually(() => w.__mounts === 1, `${label}: animated renderer did not mount`);
  equal(w.__imports, 1, `${label}: animated renderer loads once`);
  check(!w.document.querySelector('.earth-visual--ready'), `${label}: fallback stays until a valid frame`);
  w.__controls.onReady(); await tick();
  check(w.document.querySelector('.earth-visual--ready'), `${label}: animated canvas replaces fallback`);
  await dom.finish();
}
{
  const dom = await open(gateScript, {width:1440}); const w = dom.window;
  dom.emit(true); await eventually(() => w.__mounts === 1, 'Initial renderer did not mount');
  dom.narrow(true); await tick();
  equal(w.__mounts, 1, 'Resizing to mobile retains the single mounted renderer');
  equal(w.__unmounts, 0, 'Viewport size alone does not unmount animation');
  dom.connection.change({saveData:true}); await tick();
  equal(w.__mounts, 1, 'Data saver changes quality without disabling rotation');
  w.matchMedia('(prefers-reduced-motion: reduce)').change(true); await tick();
  equal(w.__mounts,1,'Changing reduced-motion preference does not allocate another renderer');
  await eventually(()=>w.__unmounts===1,'Reduced motion immediately releases the existing renderer');
  w.matchMedia('(prefers-reduced-motion: reduce)').change(false); await tick();dom.emit(true);
  await eventually(()=>w.__mounts===2,'Animation resumes when motion is allowed');
  w.__controls.onFailure(); await eventually(() => w.__unmounts === 2, 'Actual rendering failure releases renderer');
  dom.emit(true); await tick(); equal(w.__mounts,2,'A graphics failure does not start an uncontrolled retry loop');
  await dom.finish();
  check([...dom.media.values()].every(query => query.listeners.size === 0), 'Media-query listeners cleaned up');
  equal(dom.connectionListeners.size, 0, 'No network listener leaked');
  check(dom.observers.every(observer => observer.targets.size === 0), 'Lazy-load observations disconnected');
}
{
  const dom = await open(gateScript); const w = dom.window;
  dom.emit(true); dom.emit(false); await tick(); await tick();
  equal(w.__mounts,0,'Lazy import resolving after Earth leaves viewport does not allocate an invisible renderer');
  dom.emit(true); await eventually(()=>w.__mounts===1,'Cached import starts automatically when Earth becomes visible');
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
  check(w.__tilt.children[1].material.uniforms.pointerPresence.value > 0.9, 'Atmosphere responds gradually to desktop pointer presence');
  element.dispatchEvent(new w.Event('pointerleave'));
  for (let index = 61; index <= 240; index++) dom.frames.step(1000000 + index * 1000 / 60);
  check(Math.abs(w.__tilt.rotation.z) < 0.00001, 'Pointer leave smoothly resets orientation response');
  check(w.__tilt.children[1].material.uniforms.pointerPresence.value < 0.0001, 'Atmosphere returns to rest after pointer leaves');
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
for (const fps of [60,30,24,15]) {
  const frames=scheduler(); let state; let count=0;
  const loop=createEarthRotationLoop({...frames,initialAngle:0,getTargetFps:()=>fps,onFrame:value=>{state=value;count++},onError:error=>{throw error}});
  loop.setActive(true);frames.step(0);
  for(let index=1;index<=10800;index++)frames.step(index*1000/60);
  closeTo(state.angle,2*Math.PI, `${fps}fps target: angular speed remains one turn per 180 seconds`);
  if(fps<60)check(count<10801,`${fps}fps: GPU draws are throttled`);
  loop.dispose();equal(frames.pending.size,0,`${fps}fps: throttled loop disposes`);
}
{
  const capabilities={wide:false,finePointer:false,reducedMotion:false,webgl2:true,observers:true,memory:4,cores:4};
  const mobile=getEarthRenderProfile(capabilities);
  check(mobile.mobile&&mobile.lowTextures&&!mobile.pointer,'Mobile profile uses small textures and no pointer tracking');
  check(mobile.pixelRatios[0]<=1.25,'Mobile internal pixel ratio is capped');
  const low=getEarthRenderProfile({...capabilities,memory:2});
  equal(low.initialTier,1,'Constrained devices start at a lower rendering tier');
  const desktop=getEarthRenderProfile({...capabilities,wide:true,finePointer:true});
  check(!desktop.lowTextures&&desktop.pointer,'Desktop retains detailed textures and pointer response');
}
{
  const governor=createEarthQualityGovernor(0); let now=0; const changes=[];
  function sampleWindows(count,interval,cost){for(let index=0;index<count;index++){now+=interval;const result=governor.sample(now,interval,cost);if(result!=='unchanged')changes.push([result,now,governor.tier]);}}
  sampleWindows(50,50,25);equal(governor.tier,0,'A short slow window does not switch quality');
  sampleWindows(50,50,25);equal(governor.tier,1,'Sustained measured slowness reduces quality');
  sampleWindows(80,50,25);equal(governor.tier,1,'Hysteresis prevents rapid repeated quality changes');
  sampleWindows(120,80,40);equal(governor.tier,2,'Continued poor rendering reaches the lightweight tier');
  sampleWindows(80,300,160);check(changes.some(([result])=>result==='fallback'),'Severe sustained constraints trigger compatibility fallback');
  check(changes.filter(([result])=>result==='changed').every((entry,index,list)=>!index||entry[1]-list[index-1][1]>=8000),'Quality transitions respect cooldown');
  const recover=createEarthQualityGovernor(0);let time=0;
  for(let index=0;index<100;index++){time+=50;recover.sample(time,50,25)}
  equal(recover.tier,1,'Recovery scenario first lowers quality');
  for(let index=0;index<650;index++){time+=33.333;recover.sample(time,33.333,1)}
  equal(recover.tier,0,'Sustained healthy frames recover quality after the longer cooldown');
}
for(const [width,options] of [[390,{finePointer:false}],[768,{finePointer:false}],[1440,{finePointer:true}]]){
  const dom=await open(rendererScript,{width,...options});const w=dom.window;
  await eventually(()=>dom.observers.length>0,'Profile renderer setup');dom.emit(true);dom.frames.step(0);
  equal(w.__allocations,1,`${width}px: one live renderer`);
  equal(w.__ready,1,`${width}px: valid first frame`);
  equal(w.__textureURLs.length,3,`${width}px: exactly three texture requests`);
  if(width<1024){
    check(w.__textureURLs.every(url=>url.includes('-mobile.webp')),`${width}px: no desktop texture downloads`);
    check(w.__pixelRatio<=1.25,`${width}px: lower pixel ratio`);
    equal([...w.__segments],[1,48,32],`${width}px: lighter sphere geometry`);
    const initial=w.__globe.rotation.y;dom.frames.step(1000/60);check(w.__globe.rotation.y>initial,`${width}px: mobile/tablet mesh actually advances`);
    const element=w.document.querySelector('.earth-canvas');element.dispatchEvent(new w.Event('pointerenter'));
    const pointer=new w.Event('pointermove');Object.assign(pointer,{pointerType:'mouse',clientX:490,clientY:490});element.dispatchEvent(pointer);
    for(let index=2;index<=60;index++)dom.frames.step(index*1000/60);
    closeTo(w.__tilt.rotation.z,0,`${width}px: pointer tracking remains disabled`);
    dom.narrow(false);await tick();equal(w.__allocations,1,`${width}px: resizing does not recreate the renderer`);
  }else check(w.__textureURLs.every(url=>!url.includes('-mobile')), 'Desktop uses retained detailed textures');
  await dom.finish();equal(w.__disposed.renderer,1,`${width}px: renderer released`);
}
{
 const dom=await open(rendererScript,{width:390,finePointer:false,renderCost:40});const w=dom.window;
 await eventually(()=>dom.observers.length>0,'Adaptive renderer setup');dom.emit(true);
 for(let index=0;index<=1400;index++)dom.frames.step(index*1000/60);
 equal(w.__allocations,1,'Adaptive quality uses the same renderer');
 equal(w.document.querySelector('.earth-canvas').dataset.earthQuality,'2','Measured slow rendering lowers actual renderer quality');
 check(w.__pixelRatio<1,'Adaptive mode reduces the internal rendering resolution');
 equal(w.__globe.children[1].visible,false,'Lowest tier removes separate cloud overdraw');
 equal(w.__globe.children[0].material.uniforms.integratedClouds.value,1,'Lowest tier retains clouds inside the surface shader');
 equal(w.__failures,0,'Moderate slow rendering retains animation');await dom.finish();
}

for (const renderCost of [1,200]) {
 const dom=await open(integratedScript,{width:390,finePointer:false,renderCost});const w=dom.window;
 dom.emit(true);await eventually(()=>w.__allocations===1,'Mobile integration lazy allocation');
 await eventually(()=>dom.observers.length>=2,'Mobile integration renderer observer');dom.emit(true);dom.frames.step(0);await tick();
 check(w.document.querySelector('.earth-visual--ready'),'Integrated mobile globe reveals a valid animated canvas');
 const start=w.__globe.rotation.y;
 if(renderCost===1){
  for(let index=1;index<=60;index++)dom.frames.step(index*1000/60);
  check(w.__globe.rotation.y>start,'Integrated mobile globe rotation advances');
  equal(w.__allocations,1,'Integrated animation owns one renderer');
 }else{
  for(let index=1;index<=1500&&dom.frames.pending.size;index++)dom.frames.step(index*1000/60);
  await eventually(()=>!w.document.querySelector('canvas'),'Severe performance fallback releases mobile canvas');
  check(!w.document.querySelector('.earth-visual--ready'),'Severe performance fallback restores static image visibility');
  await eventually(()=>w.__disposed.renderer===1,'Severe fallback resource cleanup');
  equal(w.__disposed.renderer,1,'Severe fallback disposes the renderer');
  equal(dom.frames.pending.size,0,'Severe fallback leaves no RAF loop');
 }
 await dom.finish();
}
{
 const css=await readFile(path.join(project,'src/components/earth.css'),'utf8');
 check(!/\.earth-canvas\s*\{[^}]*display\s*:\s*none/.test(css),'Shipped Earth CSS never hides the canvas by viewport width');
 let bytes=0;
 for(const name of ['day','city-lights','clouds'])bytes+=(await stat(path.join(project,`public/earth/${name}-mobile.webp`))).size;
 check(bytes>0&&bytes<160000,'Mobile texture set stays within its compressed asset budget');
}

{
 const dom=await open(integratedScript,{width:1440,debug:true});const w=dom.window;
 dom.emit(true);await eventually(()=>w.__allocations===1,'Earth starts automatically without clicking');
 await eventually(()=>dom.observers.length>=2,'Automatic renderer observer');dom.emit(true);dom.frames.step(0);await tick();
 equal(w.document.querySelector('.earth-visual').dataset.earthStatus,'running','Automatic startup reaches a valid running frame');
 equal(w.document.querySelectorAll('.earth-visual button').length,0,'Visitors never need a start or pause button');
 const host=w.document.querySelector('.earth-canvas');equal(host.dataset.earthState,'running','Renderer reports actual running state');
 equal(host.dataset.earthFrames,'1','Diagnostic counter starts on valid GPU draw');
 const before=w.__globe.rotation.y;
 for(let index=1;index<=21600;index++)dom.frames.step(index*1000/60);
 closeTo(w.__globe.rotation.y-before,Math.PI*4,'Automatic rotation continues for two complete turns without any user event');
 equal(dom.frames.pending.size,1,'Continuous rotation retains one RAF');
 equal(w.__allocations,1,'Continuous rotation retains the original renderer');
 equal(w.__failures,0,'Healthy automatic rotation never enters a stopped state');
 const uniforms=w.__globe.children[0].material.uniforms;
 equal(uniforms.nightMap.value.colorSpace,'','Emission data is not accidentally darkened by color decoding');
 equal(uniforms.dayMap.value.colorSpace,'srgb','Daylight albedo keeps correct sRGB decoding');
 check(w.__textureURLs.some(url=>url.includes('city-lights.webp')),'Renderer requests the dedicated geographic light map');
 check(w.__globe.children[1].visible,'Cloud layer remains present at normal quality');
 equal(w.__globe.children[1].scale.value,1.008,'Clouds float above the Earth surface');
 await dom.finish();equal(dom.frames.pending.size,0,'Page disposal still releases automatic RAF');
}
{
 const dom=await open(integratedScript,{width:1440,shaderFailure:true,debug:true});const w=dom.window;
 dom.emit(true);await eventually(()=>w.__allocations===1,'Failure diagnostic allocation');
 await eventually(()=>dom.observers.length>=2,'Failure diagnostic observer');dom.emit(true);dom.frames.step(0);await tick();
 equal(w.document.querySelector('.earth-visual').dataset.earthStatus,'shader','Shader failures retain a distinct observable reason');
 check(w.document.querySelector('.earth-diagnostics').textContent.includes('Estado: shader'),'Diagnostic panel reports a real renderer failure rather than generic readiness');
 equal(w.document.querySelectorAll('.earth-visual button').length,0,'Even diagnostic failures do not add visitor controls');
 check(!w.document.querySelector('canvas'),'Failed shader canvas is removed');await dom.finish();
}

for (const options of [{preference:'static'},{reducedMotion:true},{preference:'animated',reducedMotion:true}]) {
 const dom=await open(integratedScript,options);dom.emit(true);await tick();
 equal(dom.window.__allocations,0,'Static/reduced motion allocates no renderer');
 equal(dom.frames.pending.size,0,'Static/reduced motion has no animation loop');
 check(dom.window.document.querySelector('.earth-static img'),'Static fallback remains visible');
 await dom.finish();
}
{
 const dom=await open(integratedScript);const w=dom.window;
 dom.emit(true);await eventually(()=>w.__allocations===1,'Preference test starts renderer');
 await eventually(()=>dom.observers.length>=2,'Preference test renderer observer');dom.emit(true);dom.frames.step(0);await tick();
 const select=w.document.querySelector('select[aria-label="Movimento do globo"]');
 select.value='static';select.dispatchEvent(new w.Event('change',{bubbles:true}));
 await eventually(()=>w.__disposed.renderer===1,'Selecting static disposes GPU resources');
 equal(w.localStorage.getItem('elevon-earth'),'static','Static choice persists');
 equal(dom.frames.pending.size,0,'Static selection cancels frame loop');
 select.value='animated';select.dispatchEvent(new w.Event('change',{bubbles:true}));await tick();dom.emit(true);
 await eventually(()=>w.__allocations===2,'Animated selection resumes renderer');
 equal(w.localStorage.getItem('elevon-earth'),'animated','Animated choice persists');
 await dom.finish();
}

console.log(`PASS: ${assertions} Earth assertions. Actual React gate, production clock and renderer lifecycle tested with DOM/Three mocks.`);
console.log('  ✓ Automatic renderer on mobile, tablet and desktop; static and reduced-motion preferences');
console.log('  ✓ Same rotation speed at different draw targets, one RAF, pause/resume, mobile textures and no mobile pointer tracking');
console.log('  ✓ Measured quality adaptation with hysteresis, renderer reuse, error recovery and resource disposal');
console.log('LIMIT: No browser/GPU renderer available; real WebGL shader compilation, visual smoothness and frame rate are not measured.');
