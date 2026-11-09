import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stat } from 'node:fs/promises';
import { build } from 'esbuild';
import { JSDOM, VirtualConsole } from 'jsdom';

const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
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
  const windowAdd = w.addEventListener.bind(w);
  const windowRemove = w.removeEventListener.bind(w);
  w.addEventListener = (type, callback, ...rest) => { if (type === 'resize') resizeListeners.add(callback); return windowAdd(type, callback, ...rest); };
  w.removeEventListener = (type, callback, ...rest) => { if (type === 'resize') resizeListeners.delete(callback); return windowRemove(type, callback, ...rest); };
  const frames = new Map(); let frameID = 0, requestedFrames = 0;
  w.requestAnimationFrame = callback => { requestedFrames++; frames.set(++frameID, callback); return frameID; };
  w.cancelAnimationFrame = handle => frames.delete(handle);
  w.HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: 500, bottom: 500, width: 500, height: 500 });
  w.eval(compiled.outputFiles[0].text);
  await eventually(() => w.document.querySelector('.digital-ecosystem'), 'Digital Ecosystem did not mount');
  await tick();
  const element = w.document.querySelector('.digital-ecosystem');
  const select = element.querySelector('select[aria-label="Animação do ecossistema"]');
  check(select, 'Motion selector has an accessible label');
  return {
    w, element, select, observers, queries, frames,
    get requestedFrames() { return requestedFrames; },
    async choose(value) { select.value = value; select.dispatchEvent(new w.Event('change', { bubbles: true })); await tick(); },
    async visible(value) { observers.forEach(observer => observer.emit(value)); await tick(); },
    async hidden(value) { hidden = value; w.document.dispatchEvent(new w.Event('visibilitychange')); await tick(); },
    async reduced(value) { for (const [query, media] of queries) if (query.includes('prefers-reduced-motion')) media.change(value); await tick(); },
    async finish() {
      w.__root.unmount(); await tick();
      equal(visibilityListeners.size, 0, 'Unmount releases visibility listeners');
      equal(resizeListeners.size, 0, 'Unmount releases resize listeners');
      check(observers.every(observer => observer.targets.size === 0), 'Unmount disconnects visibility observations');
      check([...queries.values()].every(media => media.listeners.size === 0), 'Unmount releases media-query listeners');
      equal(frames.size, 0, 'Unmount leaves no animation frame scheduled');
      equal(errors, [], 'No React or DOM runtime errors');
      w.close();
    },
  };
}

for (const [label, options] of [
  ['new visitor', {}], ['saved static', { preference: 'static' }], ['invalid preference', { preference: 'invalid' }],
  ['legacy automatic', { legacy: 'auto' }], ['legacy static', { legacy: 'static' }], ['blocked storage', { storageBlocked: true }],
]) {
  const test = await open(options); await test.visible(true);
  equal(test.select.value, 'static', `${label}: motion defaults static`);
  equal([...test.select.options].map(option => option.value), ['static', 'animated'], `${label}: offers static and animated modes`);
  equal(test.element.dataset.motion, 'static', `${label}: decorative motion is disabled`);
  equal(test.element.dataset.active, 'false', `${label}: no active animation work`);
  equal(test.requestedFrames, 0, `${label}: no JavaScript animation frame requested`);
  equal(test.element.querySelectorAll('canvas').length, 0, `${label}: no WebGL canvas`);
  equal(test.element.querySelectorAll('.ecosystem-card').length, 3, `${label}: full composition remains in static mode`);
  check(test.element.querySelector('.ecosystem-orbits'), `${label}: orbital connections remain visible`);
  check(![...test.element.querySelectorAll('img,source')].some(image => /\/earth\//.test((image.getAttribute('src') || '') + (image.getAttribute('srcset') || ''))), `${label}: no Earth texture URLs`);
  await test.finish();
}
{
  const test = await open(); await test.visible(true);
  equal([...test.element.querySelectorAll('.ecosystem-card h3')].map(title => title.textContent), ['Marketing', 'Tecnologia', 'Ferramentas'], 'Three readable category cards are HTML headings');
  check(test.element.textContent.includes('Estratégias') && test.element.textContent.includes('Automação') && test.element.textContent.includes('Recursos digitais'), 'Conceptual card labels remain readable HTML');
  check(!test.element.querySelector('.ecosystem-card a,.ecosystem-card button'), 'Decorative cards are not fake controls');
  const core = test.element.querySelector('img');
  check(core && core.alt === '' && core.width > 0 && core.height > 0, 'Decorative core has empty alt and intrinsic dimensions');
  for (const image of test.element.querySelectorAll('img,source')) {
    const source = image.getAttribute('src') || image.getAttribute('srcset');
    check(source && (await stat(path.join(project, 'public', source))).size > 0, 'Referenced core art asset exists');
  }
  await test.choose('animated');
  equal(test.w.localStorage.getItem('elevon-motion'), 'animated', 'Explicit animated choice is persisted');
  equal(test.element.dataset.motion, 'animated', 'Explicit choice enables motion');
  equal(test.element.dataset.active, 'true', 'Visible active tab allows CSS animation');
  await test.visible(false); equal(test.element.dataset.active, 'false', 'Leaving viewport pauses decoration');
  await test.visible(true); equal(test.element.dataset.active, 'true', 'Re-entering viewport resumes decoration');
  await test.hidden(true); equal(test.element.dataset.active, 'false', 'Hidden browser tab pauses decoration');
  await test.hidden(false); equal(test.element.dataset.active, 'true', 'Visible browser tab resumes decoration');
  await test.reduced(true); equal(test.element.dataset.active, 'false', 'Reduced-motion preference stops active decoration');
  equal(test.select.value, 'animated', 'Reduced motion preserves the explicit saved selection');
  await test.reduced(false); equal(test.element.dataset.active, 'true', 'Motion resumes when reduced-motion preference is removed');
  await test.finish();
}
for (const options of [{ preference: 'animated' }, { legacy: 'animated' }]) {
  const test = await open(options); await test.visible(true);
  equal(test.select.value, 'animated', 'New or legacy explicit animation choice is restored');
  equal(test.element.dataset.active, 'true', 'Restored animated choice can run in view');
  await test.choose('static');
  equal(test.w.localStorage.getItem('elevon-motion'), 'static', 'Static choice replaces restored animation');
  equal(test.element.dataset.active, 'false', 'Static selection immediately pauses animation');
  equal(test.element.querySelectorAll('.ecosystem-card').length, 3, 'Changing to static retains the whole visual');
  equal(test.requestedFrames, 0, 'CSS-only animation does not introduce a JavaScript frame loop');
  await test.finish();
}
{
  const test = await open({ preference: 'static', legacy: 'animated' }); await test.visible(true);
  equal(test.select.value, 'static', 'New static preference takes precedence over legacy animation');
  await test.finish();
}
{
  const test = await open({ preference: 'animated', reduced: true }); await test.visible(true);
  equal(test.element.dataset.active, 'false', 'Saved animation cannot override reduced motion');
  await test.finish();
}
{
  const test = await open({ storageBlocked: true }); await test.visible(true); await test.choose('animated');
  equal(test.select.value, 'animated', 'Blocked storage does not prevent choosing animation for this visit');
  equal(test.element.dataset.active, 'true', 'Current-visit animation works with blocked storage');
  await test.finish();
}


{
  const test = await open({ preference: 'animated', hidden: true }); await test.visible(true);
  equal(test.element.dataset.active, 'false', 'Initially hidden document does not start decoration');
  await test.hidden(false); equal(test.element.dataset.active, 'true', 'Initial hidden state resumes only when the tab becomes visible');
  await test.finish();
}
{
  const test = await open({ preference: 'animated', noObserver: true });
  equal(test.element.dataset.active, 'true', 'Missing observer API preserves the visible opted-in composition');
  equal(test.element.querySelectorAll('.ecosystem-card').length, 3, 'Missing observer API never blanks the scene');
  await test.finish();
}
{
  const test = await open({ preference: 'static' }); await test.visible(true);
  equal(test.select.value, 'static', 'New document restores a saved static choice');
  equal(test.element.dataset.active, 'false', 'Restored static choice stays stopped after visibility events');
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
  const test = await open({ preference: 'animated', width: 1440 }); await test.visible(true);
  pointerEvent(test, 'pointerover'); pointerEvent(test, 'pointermove'); await tick();
  const values = pointerValues(test);
  check(values.some(value => value !== 0), 'Fine-pointer desktop receives subtle parallax');
  check(values.every(value => Math.abs(value) <= 30), 'Pointer response remains bounded');
  equal(test.requestedFrames, 0, 'Pointer updates do not schedule a JavaScript animation frame');
  test.w.dispatchEvent(new test.w.Event('resize')); await tick();
  equal(pointerValues(test), [0, 0, 0, 0], 'Resize clears stale pointer bounds and orientation');
  pointerEvent(test, 'pointerover'); pointerEvent(test, 'pointermove'); await tick();
  await test.hidden(true); equal(pointerValues(test), [0, 0, 0, 0], 'Hiding the tab resets pointer offset');
  await test.hidden(false); pointerEvent(test, 'pointerover'); pointerEvent(test, 'pointermove'); await tick();
  pointerEvent(test, 'pointerout'); await tick();
  equal(pointerValues(test), [0, 0, 0, 0], 'Pointer exit resets orientation');
  await test.finish();
}
for (const [label, options, pointerType] of [
  ['static choice', { preference: 'static' }, 'mouse'],
  ['reduced motion', { preference: 'animated', reduced: true }, 'mouse'],
  ['touch-only device', { preference: 'animated', finePointer: false, width: 390 }, 'touch'],
  ['touch event on desktop', { preference: 'animated', width: 1440 }, 'touch'],
]) {
  const test = await open(options); await test.visible(true);
  pointerEvent(test, 'pointerover', pointerType); pointerEvent(test, 'pointermove', pointerType); await tick();
  equal(pointerValues(test), [0, 0, 0, 0], `${label}: no desktop pointer motion`);
  await test.finish();
}

console.log(`PASS: ${assertions} ecosystem assertions. Actual React component lifecycle tested in DOM; no browser layout or GPU measurement.`);
console.log('  ✓ Static default, persisted/legacy opt-in, reduced motion, visible/hidden/offscreen pauses and full static composition');
console.log('  ✓ Readable HTML cards, decorative core assets, canvas-free import graph and listener cleanup');
