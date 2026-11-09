import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, stat } from 'node:fs/promises';
import { build } from 'esbuild';
import { JSDOM, VirtualConsole } from 'jsdom';

const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const stylesheet = await readFile(path.join(project, 'src/components/digital-ecosystem.css'), 'utf8');
let assertions = 0;
const check = (value, label) => { assert.ok(value, label); assertions++; };
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); assertions++; };
const tick = () => new Promise(resolve => setTimeout(resolve, 8));
async function eventually(predicate, label) {
  for (let index = 0; index < 100; index++) { if (predicate()) return; await tick(); }
  assert.fail(label);
}
const compiled = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
    import DigitalEcosystem from './src/components/DigitalEcosystem';
    globalThis.__root=createRoot(document.getElementById('root'));
    globalThis.__root.render(<DigitalEcosystem/>);`, sourcefile: 'ecosystem-test.tsx', resolveDir: project, loader: 'tsx' },
  bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2022', jsx: 'automatic', metafile: true,
  loader: { '.css': 'empty' }, define: { 'process.env.NODE_ENV': '"test"' }, logLevel: 'silent',
});
check(!Object.keys(compiled.metafile.inputs).some(file => /(?:EarthVisual|DesktopEarth|earthRuntime|node_modules\/three\/)/.test(file)), 'Ecosystem import graph excludes Earth and Three.js');

async function open(options = {}) {
  const errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', error => errors.push(error.message));
  console.on('error', (...args) => errors.push(args.map(String).join(' ')));
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://elevon.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console });
  const w = dom.window;
  const style = w.document.createElement('style'); style.textContent = stylesheet; w.document.head.appendChild(style);
  if (options.preference !== undefined) w.localStorage.setItem('elevon-motion', options.preference);
  if (options.legacy !== undefined) w.localStorage.setItem('elevon-earth', options.legacy);
  if (options.storageBlocked) Object.defineProperty(w, 'localStorage', { get() { throw new w.DOMException('Storage unavailable', 'SecurityError'); } });
  const queries = new Map();
  w.matchMedia = query => {
    if (!queries.has(query)) {
      const min = query.match(/min-width:\s*(\d+)/);
      const max = query.match(/max-width:\s*(\d+)/);
      const matches = query.includes('prefers-reduced-motion') ? Boolean(options.reduced)
        : (!min || (options.width ?? 1440) >= Number(min[1])) && (!max || (options.width ?? 1440) <= Number(max[1]))
          && (!/pointer:\s*fine|hover:\s*hover/.test(query) || options.finePointer !== false);
      const listeners = new Set();
      queries.set(query, { media: query, matches, listeners,
        addEventListener(type, callback) { listeners.add(callback); },
        removeEventListener(type, callback) { listeners.delete(callback); },
        change(value) { this.matches = value; for (const callback of listeners) callback({ matches: value, media: query }); },
      });
    }
    return queries.get(query);
  };
  const observers = [];
  w.IntersectionObserver = class {
    targets = new Set();
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.targets.add(target); }
    disconnect() { this.targets.clear(); }
    emit(value) { if (this.targets.size) this.callback([...this.targets].map(target => ({ target, isIntersecting: value }))); }
  };
  if (options.noObserver) delete w.IntersectionObserver;
  let hidden = Boolean(options.hidden);
  Object.defineProperty(w.document, 'hidden', { get: () => hidden });
  const visibilityListeners = new Set();
  const originalAdd = w.document.addEventListener.bind(w.document);
  const originalRemove = w.document.removeEventListener.bind(w.document);
  w.document.addEventListener = (type, callback, ...rest) => { if (type === 'visibilitychange') visibilityListeners.add(callback); return originalAdd(type, callback, ...rest); };
  w.document.removeEventListener = (type, callback, ...rest) => { if (type === 'visibilitychange') visibilityListeners.delete(callback); return originalRemove(type, callback, ...rest); };
  const resizeListeners = new Set();
  const pageShowListeners = new Set();
  const pageHideListeners = new Set();
  const windowAdd = w.addEventListener.bind(w);
  const windowRemove = w.removeEventListener.bind(w);
  w.addEventListener = (type, callback, ...rest) => { if (type === 'resize') resizeListeners.add(callback); if (type === 'pageshow') pageShowListeners.add(callback); if (type === 'pagehide') pageHideListeners.add(callback); return windowAdd(type, callback, ...rest); };
  w.removeEventListener = (type, callback, ...rest) => { if (type === 'resize') resizeListeners.delete(callback); if (type === 'pageshow') pageShowListeners.delete(callback); if (type === 'pagehide') pageHideListeners.delete(callback); return windowRemove(type, callback, ...rest); };
  const frames = new Map(); let frameID = 0, requestedFrames = 0;
  w.requestAnimationFrame = callback => { requestedFrames++; frames.set(++frameID, callback); return frameID; };
  w.cancelAnimationFrame = handle => frames.delete(handle);
  let bounds = { x: 0, y: 0, left: 0, top: 0, right: 500, bottom: 500, width: 500, height: 500, ...options.bounds };
  w.HTMLElement.prototype.getBoundingClientRect = () => bounds;
  w.eval(compiled.outputFiles[0].text);
  await eventually(() => w.document.querySelector('.digital-ecosystem'), 'Digital Ecosystem did not mount');
  await tick();
  const element = w.document.querySelector('.digital-ecosystem');
  const select = element.querySelector('select[aria-label="Animação do ecossistema"]');
  check(!select && !element.querySelector('.ecosystem-controls'), 'Animation is automatic without a motion selector');
  return {
    w, element, select, observers, queries, frames,
    get requestedFrames() { return requestedFrames; },
    setBounds(next) { bounds = { ...bounds, ...next }; },
    animation(selector = '.ecosystem-core') { return w.getComputedStyle(element.querySelector(selector)).animation || 'none'; },
    async pageHide() { w.dispatchEvent(new w.Event('pagehide')); await tick(); },
    async pageShow() { w.dispatchEvent(new w.Event('pageshow')); await tick(); },
    async visible(value) { observers.forEach(observer => observer.emit(value)); await tick(); },
    async hidden(value) { hidden = value; w.document.dispatchEvent(new w.Event('visibilitychange')); await tick(); },
    async reduced(value) { for (const [query, media] of queries) if (query.includes('prefers-reduced-motion')) media.change(value); await tick(); },
    async finish() {
      w.__root.unmount(); await tick();
      equal(visibilityListeners.size, 0, 'Unmount releases visibility listeners');
      equal(resizeListeners.size, 0, 'Unmount releases resize listeners');
      equal(pageShowListeners.size, 0, 'Unmount releases page restore listeners');
      equal(pageHideListeners.size, 0, 'Unmount releases page leave listeners');
      check(observers.every(observer => observer.targets.size === 0), 'Unmount disconnects visibility observations');
      check([...queries.values()].every(media => media.listeners.size === 0), 'Unmount releases media-query listeners');
      equal(frames.size, 0, 'Unmount leaves no animation frame scheduled');
      equal(errors, [], 'No React or DOM runtime errors');
      w.close();
    },
  };
}

// Read the real stylesheet, not just the animated label: every normal entry
// must create CSS animations even if an obsolete stored choice says static.
for (const [label, options] of [
  ['new desktop visitor', {}], ['new mobile visitor', { width: 390, finePointer: false }],
  ['old static choice', { preference: 'static' }], ['old animated choice', { preference: 'animated' }],
  ['old invalid choice', { preference: 'invalid' }], ['legacy static choice', { legacy: 'static' }],
  ['both old keys static', { preference: 'static', legacy: 'static' }], ['storage blocked', { storageBlocked: true }],
]) {
  const test = await open(options);
  equal(test.element.dataset.motion, 'animated', `${label}: permanent animation ignores obsolete preferences`);
  equal(test.element.dataset.active, 'true', `${label}: visible hero starts without any interaction or observer event`);
  check(test.animation().includes('ecosystem-core-float'), `${label}: actual core animation is created on entry`);
  check(test.animation('.card-marketing .ecosystem-card').includes('ecosystem-card-float'), `${label}: actual card animation is created on entry`);
  equal(test.requestedFrames, 0, `${label}: no JavaScript frame loop`);
  equal(test.element.querySelectorAll('canvas').length, 0, `${label}: no WebGL canvas`);
  equal(test.element.querySelectorAll('.ecosystem-card').length, 3, `${label}: all category cards stay visible`);
  check(test.element.querySelector('.ecosystem-orbits'), `${label}: orbital connections stay visible`);
  check(![...test.element.querySelectorAll('img,source')].some(image => /\/earth\//.test((image.getAttribute('src') || '') + (image.getAttribute('srcset') || ''))), `${label}: no old Earth texture URLs`);
  await test.pageHide(); await test.pageShow();
  equal(test.element.dataset.active, 'true', `${label}: page restoration restarts automatic motion`);
  await test.finish();
}
{
  const test = await open({ bounds: { top: 1400, bottom: 1900 } });
  equal(test.element.dataset.active, 'false', 'Initially offscreen hero stays stopped');
  equal(test.animation(), 'none', 'Initially offscreen core has no pre-created paused animation');
  test.setBounds({ top: 0, bottom: 500 }); await test.visible(true);
  check(test.animation().includes('ecosystem-core-float'), 'First intersection creates a fresh running animation');
  await test.visible(false); equal(test.animation(), 'none', 'Leaving the viewport releases CSS animations');
  test.setBounds({ top: 1400, bottom: 1900 }); await test.pageHide(); await test.pageShow();
  equal(test.element.dataset.active, 'false', 'Restoring an offscreen page keeps decoration stopped');
  test.setBounds({ top: 0, bottom: 500 }); await test.pageShow();
  equal(test.element.dataset.active, 'true', 'Page restoration rechecks visible bounds');
  check(test.animation().includes('ecosystem-core-float'), 'Page restoration creates running CSS motion');
  await test.finish();
}
{
  const test = await open();
  equal([...test.element.querySelectorAll('.ecosystem-card h3')].map(title => title.textContent), ['Marketing', 'Tecnologia', 'Ferramentas'], 'Category titles remain readable HTML headings');
  check(test.element.textContent.includes('Estratégias') && test.element.textContent.includes('Automação') && test.element.textContent.includes('Recursos digitais'), 'All conceptual category text remains HTML');
  check(!test.element.querySelector('.ecosystem-card a,.ecosystem-card button'), 'Illustrative cards do not become fake controls');
  const core = test.element.querySelector('img');
  check(core && core.alt === '' && core.width > 0 && core.height > 0, 'Decorative core has intrinsic dimensions and empty alt');
  for (const image of test.element.querySelectorAll('img,source')) {
    const source = image.getAttribute('src') || image.getAttribute('srcset');
    check(source && (await stat(path.join(project, 'public', source))).size > 0, 'Referenced core asset exists');
  }
  await test.hidden(true); equal(test.animation(), 'none', 'Hidden browser tab stops animation');
  await test.hidden(false); check(test.animation().includes('ecosystem-core-float'), 'Visible browser tab resumes animation');
  await test.reduced(true);
  equal(test.element.dataset.motion, 'static', 'Reduced-motion preference is still respected without a selector');
  equal(test.element.dataset.active, 'false', 'Reduced motion stops decorative work');
  equal(test.animation(), 'none', 'Reduced motion removes CSS animation');
  await test.reduced(false); check(test.animation().includes('ecosystem-core-float'), 'Normal motion preference resumes automatic animation');
  await test.finish();
}
{
  const test = await open({ reduced: true });
  equal(test.element.dataset.active, 'false', 'Reduced-motion visitor does not animate from the first frame');
  equal(test.animation(), 'none', 'Reduced-motion visitor retains the entire static composition');
  await test.pageHide(); await test.pageShow();
  equal(test.element.dataset.active, 'false', 'Page restoration does not override reduced motion');
  await test.finish();
}
{
  const test = await open({ hidden: true });
  equal(test.element.dataset.active, 'false', 'Initially hidden document stays stopped');
  await test.hidden(false); equal(test.element.dataset.active, 'true', 'Showing the initially hidden tab starts animation');
  await test.finish();
}
{
  const test = await open({ noObserver: true });
  equal(test.element.dataset.active, 'true', 'Observer API fallback keeps automatic motion available');
  equal(test.element.querySelectorAll('.ecosystem-card').length, 3, 'Observer API fallback keeps the full scene');
  await test.finish();
}

function pointerEvent(test, type, pointerType = 'mouse', x = 460, y = 430) {
  const event = new test.w.Event(type, { bubbles: true });
  Object.assign(event, { pointerType, clientX: x, clientY: y, relatedTarget: null });
  test.element.querySelector('.ecosystem-stage').dispatchEvent(event);
}
const pointerValues = test => {
  const style = test.element.querySelector('.ecosystem-stage').style;
  return ['--pointer-x', '--pointer-y', '--pointer-rotate-x', '--pointer-rotate-y'].map(name => Number.parseFloat(style.getPropertyValue(name)) || 0);
};
{
  const test = await open({ width: 1440 });
  pointerEvent(test, 'pointerover'); pointerEvent(test, 'pointermove'); await tick();
  check(pointerValues(test).some(value => value !== 0), 'Fine-pointer desktop gets subtle parallax');
  check(pointerValues(test).every(value => Math.abs(value) <= 30), 'Parallax stays bounded');
  equal(test.requestedFrames, 0, 'Pointer updates do not schedule animation frames');
  test.w.dispatchEvent(new test.w.Event('resize')); await tick();
  equal(pointerValues(test), [0,0,0,0], 'Resize clears stale pointer coordinates');
  pointerEvent(test, 'pointerover'); pointerEvent(test, 'pointermove'); await tick();
  await test.hidden(true); equal(pointerValues(test), [0,0,0,0], 'Hiding the tab resets pointer offsets');
  await test.hidden(false); pointerEvent(test, 'pointerover'); pointerEvent(test, 'pointermove'); await tick();
  pointerEvent(test, 'pointerout'); await tick();
  equal(pointerValues(test), [0,0,0,0], 'Pointer exit resets orientation');
  await test.finish();
}
for (const [label, options, pointerType] of [
  ['reduced motion', { reduced: true }, 'mouse'],
  ['touch-only mobile', { finePointer: false, width: 390 }, 'touch'],
  ['touch event on desktop', { width: 1440 }, 'touch'],
]) {
  const test = await open(options);
  pointerEvent(test, 'pointerover', pointerType); pointerEvent(test, 'pointermove', pointerType); await tick();
  equal(pointerValues(test), [0,0,0,0], `${label}: no desktop pointer interaction`);
  await test.finish();
}
console.log(`PASS: ${assertions} ecosystem assertions. Actual React lifecycle and CSS declarations tested in DOM; no browser layout or GPU measurement.`);
console.log('  ✓ Automatic animation without a selector or stored motion settings; initial entry and page restore');
console.log('  ✓ Reduced motion, visibility pauses, parallax bounds, DOM content, core assets and listener cleanup');
