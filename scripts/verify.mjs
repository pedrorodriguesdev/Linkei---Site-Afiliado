import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM, VirtualConsole } from 'jsdom';

const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = await readFile(path.join(project, 'index.html'), 'utf8');
const built = await build({
  entryPoints: [path.join(project, 'src/main.tsx')], bundle: true,
  format: 'iife', platform: 'browser', target: 'es2022', jsx: 'automatic',
  loader: { '.css': 'empty' }, write: false, logLevel: 'silent',
  define: { 'process.env.NODE_ENV': '"test"' },
});
const script = built.outputFiles[0].text;
const errors = [];
const messages = [];
let assertions = 0;
function check(value, label) { assert.ok(value, label); assertions++; }
function equal(actual, expected, label) { assert.deepEqual(actual, expected, label); assertions++; }
const tick = () => new Promise(resolve => setTimeout(resolve, 8));
async function eventually(predicate, label) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (predicate()) return;
    await tick();
  }
  assert.fail(label);
}

async function open(route, theme = null, options = {}) {
  const console = new VirtualConsole();
  console.on('jsdomError', error => errors.push({ route, message: error.message }));
  console.on('error', (...args) => errors.push({ route, message: args.map(String).join(' ') }));
  const dom = new JSDOM(html, { url: `https://elevon.test${route}`, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console });
  const { window } = dom;
  const mediaQueries = new Map();
  window.matchMedia = query => {
    if (!mediaQueries.has(query)) {
      const listeners = new Set();
      mediaQueries.set(query, {
        matches: query.includes('prefers-reduced-motion') ? Boolean(options.reducedMotion) : query.includes('min-width') ? false : query.includes('max-width') ? true : false,
        media: query, onchange: null,
        addEventListener(_event, listener) { listeners.add(listener); },
        removeEventListener(_event, listener) { listeners.delete(listener); },
        addListener(listener) { listeners.add(listener); }, removeListener(listener) { listeners.delete(listener); },
        dispatchEvent() { return true; },
        change(matches) { this.matches = matches; for (const listener of listeners) listener({ matches, media: query }); },
      });
    }
    return mediaQueries.get(query);
  };
  const observers = [];
  window.IntersectionObserver = class {
    constructor(callback, settings) { this.callback = callback; this.settings = settings; this.targets = new Set(); observers.push(this); }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
    disconnect() { this.targets.clear(); }
    emit(target, isIntersecting, bounds = target.getBoundingClientRect()) {
      if (!this.targets.has(target)) return false;
      this.callback([{ target, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0, boundingClientRect: bounds, intersectionRect: isIntersecting ? bounds : {}, rootBounds: { top: 0, bottom: 768, width: 1024, height: 768 }, time: window.performance.now() }], this);
      return true;
    }
  };
  if (options.missingObserver) delete window.IntersectionObserver;
  if (options.positiveBounds) window.HTMLElement.prototype.getBoundingClientRect = function () {
    return { x: 0, y: 1200, top: 1200, left: 0, right: 320, bottom: 1380, width: 320, height: 180, toJSON() {} };
  };
  dom.observers = observers;
  dom.mediaQueries = mediaQueries;
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = () => {};
  dom.scrollCalls = [];
  window.HTMLElement.prototype.scrollIntoView = function (settings) { dom.scrollCalls.push({ id: this.id, settings }); };
  window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  if (theme) window.localStorage.setItem('elevon-theme', theme);
  const initial = [...window.document.querySelectorAll('script')].find(element => !element.src)?.textContent;
  if (initial) window.eval(initial);
  window.eval(script);
  await eventually(() => window.document.querySelector('h1'), `Route ${route} did not render`);
  await tick();
  return dom;
}
async function click(dom, element) {
  check(element, 'Expected an interactive element');
  element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await tick();
}
async function type(dom, input, value) {
  check(input, 'Expected a search input');
  Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new dom.window.InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
  await tick();
}
const $ = (dom, selector) => dom.window.document.querySelector(selector);
const $$ = (dom, selector) => [...dom.window.document.querySelectorAll(selector)];

// Expected values are copied from the supplied catalog, independently of application data.
const catalog = [
  ['seja-seu-chefe', 'Seja Seu Chefe', 'https://kiwify.app/QdHUgoQ?afid=n7WFMNCa', 'https://pay.kiwify.com.br/Z2UpkR6?afid=n7WFMNCa'],
  ['metodo-tiktok-shop', 'Método TikTok Shop', 'https://kiwify.app/BavKMki?afid=CDZf9Pcg', 'https://pay.kiwify.com.br/iUlKLV3?afid=CDZf9Pcg'],
  ['ia-academy', 'IA Academy', 'https://cakto.app/4nxy9Bi/?affiliate=qdE87KzY', 'https://cakto.app/4nxy9Bi/?affiliate=qdE87KzY'],
  ['primeira-venda-24h', 'Primeira Venda em 24H', 'https://cakto.app/AbtYRgv/?affiliate=AEJBT6X4', 'https://cakto.app/AbtYRgv/?affiliate=AEJBT6X4'],
  ['edicao-dinamica-capcut', 'Edição Dinâmica com CapCut', 'https://pay.cakto.com.br/dfrwuik?affiliate=bpY25MGa', 'https://pay.cakto.com.br/dfrwuik?affiliate=bpY25MGa'],
  ['livego-pro', 'LiveGo Pro', 'https://cakto.app/3Y9srR7/?affiliate=F9M4v4aw', 'https://pay.cakto.com.br/9kxhf5b_1037858?affiliate=F9M4v4aw'],
];
const expectedURLs = new Set(catalog.flatMap(product => product.slice(2)));
const seenURLs = new Set();

for (const [slug, name, offer, checkout] of catalog) {
  const dom = await open(`/produtos/${slug}`);
  equal($(dom, 'h1').textContent, name, `${slug}: dedicated heading`);
  check(dom.window.document.title.includes(name), `${slug}: unique page title`);
  check($(dom, 'meta[name="description"]').content.length > 25, `${slug}: meaningful description`);
  equal($(dom, 'link[rel="canonical"]').href, `https://elevon.test/produtos/${slug}`, `${slug}: canonical route`);
  const actions = $$(dom, '.detail-copy .action-row a');
  equal(actions.length, offer === checkout ? 1 : 2, `${slug}: no redundant hero CTA`);
  equal(actions[0].href, offer, `${slug}: exact official affiliate URL`);
  if (offer !== checkout) equal(actions[1].href, checkout, `${slug}: exact external checkout URL`);
  const affiliateLinks = $$(dom, 'main a[href^="https://"]');
  for (const link of affiliateLinks) {
    check(expectedURLs.has(link.href), `${slug}: no invented affiliate URL`);
    seenURLs.add(link.href);
    equal(link.target, '_blank', `${slug}: external new tab`);
    check(['sponsored', 'noopener', 'noreferrer'].every(token => link.relList.contains(token)), `${slug}: affiliate and security attributes`);
  }
  const media = $(dom, '.detail-media');
  check(media && media.children.length === 0 && media.textContent.trim() === '', `${slug}: intentionally blank media`);
  equal($(dom, '.detail-copy .eyebrow').textContent.trim(), slug === 'livego-pro' ? 'Ferramenta digital' : 'Treinamento digital', `${slug}: accurate product category`);
  for (const id of ['visao-geral', 'como-funciona', 'temas', 'para-quem', 'perguntas']) check($(dom, `#${id}`), `${slug}: ${id} section`);
  const faq = $(dom, '.faq-list details');
  check(faq && !faq.open, `${slug}: FAQ starts collapsed`);
  await click(dom, faq.querySelector('summary'));
  check(faq.open, `${slug}: native FAQ expands`);
  if (slug === 'primeira-venda-24h') check($(dom, '.product-note').textContent.includes('não representa uma promessa'), '24H name is not an earnings promise');
  if (slug === 'edicao-dinamica-capcut') check($(dom, '.external-note').textContent.includes('checkout externo'), 'CapCut identifies checkout-only destination');
  dom.window.close();
}
equal([...seenURLs].sort(), [...expectedURLs].sort(), 'Exactly all nine supplied unique affiliate URLs preserved');
messages.push('Six dedicated product routes, exact affiliate URLs and attributes, blank media, categories, CTAs and FAQ controls');

for (const [route, title] of [['/', 'Descubra ferramentas'], ['/produtos', 'Explore nossas'], ['/sobre', 'Sobre a'], ['/normas', 'Normas e'], ['/redes', 'Conecte-se']]) {
  const dom = await open(route);
  check($(dom, 'h1').textContent.includes(title), `${route}: correct main content`);
  equal($$(dom, 'header .desktop-nav a').length, 5, `${route}: shared navigation`);
  check($(dom, 'footer'), `${route}: shared footer`);
  check(!$(dom, 'canvas'), `${route}: unavailable WebGL API retains the static fallback`);
  if (route === '/redes') equal($$(dom, '.social-card a').map(link => link.href), ['https://www.instagram.com/elevon.n/', 'https://www.tiktok.com/@llooping0', 'https://x.com/LinkouDigital'], 'Exact three official social destinations');
  dom.window.close();
}
messages.push('All 11 valid routes, shared navigation/footer, page metadata, WebGL-unavailable fallback and official social links');

{
  const dom = await open('/produtos');
  equal($$(dom, '.product-card').length, 6, 'Catalog contains exactly six offers');
  check($(dom,'.catalog-experience'), 'Catalog keeps a continuous hero/storefront wrapper');
  equal($(dom,'#catalog-heading').textContent,'Encontre seu próximo passo.','Catalog discovery heading preserved');
  equal($$(dom,'.product-card').map(card=>card.style.getPropertyValue('--reveal-delay-mobile')), ['0ms','50ms','100ms','0ms','50ms','100ms'], 'Mobile cards use short row-based stagger delays');
  equal($$(dom,'footer [data-reveal]').length,2,'Footer groups use progressive reveals');
  equal($$(dom, '.product-media').length, 6, 'Catalog reserves six media areas');
  check($$(dom, '.product-media').every(media => media.children.length === 0 && !media.textContent.trim()), 'All product image containers remain empty');
  check(!$(dom, '.product-card img'), 'No generated or placeholder product images');
  await type(dom, $(dom, '.catalog-toolbar input'), 'edicao');
  equal($$(dom, '.product-card h3').map(node => node.textContent), ['Edição Dinâmica com CapCut'], 'Search is accent insensitive');
  equal($(dom,'.product-card').dataset.revealState,'visible','Search results appear immediately without waiting for animation');
  await type(dom, $(dom, '.catalog-toolbar input'), '');
  await click(dom, $$(dom, '.filter-button').find(button => button.textContent.includes('Ferramentas')));
  equal($$(dom, '.product-card h3').map(node => node.textContent), ['LiveGo Pro'], 'Tools filter shows the one tool');
  await click(dom, $$(dom, '.filter-button').find(button => button.textContent.includes('Treinamentos')));
  equal($$(dom, '.product-card').length, 5, 'Training filter shows five trainings');
  await type(dom, $(dom, '.catalog-toolbar input'), 'nada-corresponde-123');
  equal($$(dom, '.product-card').length, 0, 'Nonmatching search excludes all offers');
  check($(dom, '.empty-state').textContent.includes('Nenhuma oferta'), 'No-results state explains the result');
  await click(dom, $(dom, '.empty-state button'));
  equal($$(dom, '.product-card').length, 6, 'Clear filters restores all offers');
  equal($(dom, '.catalog-toolbar input').value, '', 'Clear filters resets search');
  check($(dom, '.filter-button[aria-pressed="true"]').textContent.includes('Todos'), 'Clear filters resets category');
  await click(dom, $(dom, '.theme-switch'));
  equal(dom.window.document.documentElement.dataset.theme, 'light', 'Theme toggles without reload');
  equal(dom.window.localStorage.getItem('elevon-theme'), 'light', 'Theme choice saved locally');
  await click(dom, $(dom, '.desktop-nav a[href="/sobre"]'));
  await eventually(() => dom.window.location.pathname === '/sobre', 'Theme route navigation');
  equal(dom.window.document.documentElement.dataset.theme, 'light', 'Theme preserved after navigation');
  dom.window.close();
  const persisted = await open('/', 'light');
  equal(persisted.window.document.documentElement.dataset.theme, 'light', 'Persisted theme read on new visit');
  persisted.window.close();
}
messages.push('Accent-insensitive search, category filters (five trainings/one tool), empty-state reset, theme toggle and persistence');

{
  const dom = await open('/');
  equal($(dom, '.mobile-menu-button').getAttribute('aria-expanded'), 'false', 'Mobile menu starts closed');
  await click(dom, $(dom, '.mobile-menu-button'));
  equal($(dom, '.mobile-menu-button').getAttribute('aria-expanded'), 'true', 'Mobile menu opens accessibly');
  equal($$(dom, '#mobile-navigation a').length, 5, 'Mobile navigation has all routes');
  await click(dom, $(dom, '#mobile-navigation a[href="/produtos"]'));
  await eventually(() => dom.window.location.pathname === '/produtos' && !$(dom, '#mobile-navigation'), 'Mobile menu closes after navigation');
  await click(dom, $(dom, '.search-trigger'));
  check($(dom, '.search-dialog').open, 'Search dialog opens');
  await type(dom, $(dom, '.search-dialog input'), 'micro saas');
  $(dom, '.search-dialog form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await eventually(() => dom.window.location.search.includes('micro%20saas'), 'Search dialog submits to catalog query');
  await eventually(() => $$(dom, '.product-card').length === 1, 'Header search results update after route effect');
  equal($$(dom, '.product-card h3').map(node => node.textContent), ['Primeira Venda em 24H'], 'Header search filters by product theme');
  check(!$(dom, '.search-dialog').open, 'Search dialog closes after submit');
  await click(dom, $(dom, '.search-trigger'));
  await click(dom, $(dom, 'button[aria-label="Fechar busca"]'));
  check(!$(dom, '.search-dialog').open, 'Search dialog explicit close works');
  dom.window.close();
}
messages.push('Accessible mobile menu navigation, header search dialog open/submit/close and query-string search');

for (const route of ['/produtos/oferta-inexistente', '/caminho-inexistente']) {
  const dom = await open(route);
  check(/não foi encontrada|ainda não existe/.test($(dom, 'h1').textContent), `${route}: useful not-found page`);
  check($(dom, 'main a[href="/produtos"]'), `${route}: recovery link to catalog`);
  dom.window.close();
}
messages.push('Unknown product and unknown page have recovery links');

// Render the actual reusable component without running effects: motion is enhancement,
// so markup must remain readable before browser capability and layout are known.
{
  const rendered = await build({
    stdin: { contents: `import {createElement} from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import Reveal from './src/components/RevealOnScroll'; export const html = renderToStaticMarkup(createElement(Reveal, {as: 'article'}, createElement('a', {href: '/produtos'}, 'Conteúdo disponível')));`, resolveDir: project, loader: 'tsx' },
    bundle: true, platform: 'node', format: 'cjs', packages: 'external',
    loader: { '.css': 'empty' }, write: false, logLevel: 'silent', jsx: 'automatic',
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', rendered.outputFiles[0].text)(createRequire(path.join(project, 'package.json')), module, module.exports);
  check(module.exports.html.includes('Conteúdo disponível'), 'Reveal renders meaningful initial content');
  check(!module.exports.html.includes('data-reveal-state='), 'Initial reveal markup has no opacity-hiding state');
}

{
  const dom = await open('/sobre', null, { positiveBounds: true });
  const panels = $$(dom, '.about-intro-grid > article[data-reveal]');
  equal(panels.length, 2, 'About panels preserve semantic articles with individual reveals');
  check(!$(dom, 'h1').closest('[data-reveal-state="pending"]'), 'Critical information-page headline remains initially visible');
  check(panels.every(panel => panel.dataset.revealState === 'pending'), 'Positive offscreen geometry arms reveal elements');
  check(panels.every(panel => !panel.hasAttribute('aria-hidden') && !panel.hasAttribute('hidden')), 'Pending motion does not hide semantic content from assistive technology');
  const observer = dom.observers.find(item => item.targets.has(panels[0]));
  check(observer, 'Offscreen panel has a visibility observer');
  observer.emit(panels[0], true);
  equal(panels[0].dataset.revealState, 'entering', 'Intersection starts reveal');
  equal(panels[1].dataset.revealState, 'pending', 'An unrelated offscreen panel remains pending');
  panels[0].dispatchEvent(new dom.window.Event('animationend', { bubbles: true }));
  equal(panels[0].dataset.revealState, 'visible', 'Animation completion leaves content visible');
  check(!observer.targets.has(panels[0]), 'Completed reveal stops observing');
  observer.emit(panels[0], false);
  equal(panels[0].dataset.revealState, 'visible', 'Completed reveal does not replay on exit');
  const focusTarget = $(dom, '.commitment a');
  const focusPanel = focusTarget.closest('[data-reveal]');
  equal(focusPanel.dataset.revealState, 'pending', 'Keyboard target begins in an offscreen pending panel');
  focusTarget.focus();
  equal(focusPanel.dataset.revealState, 'visible', 'Keyboard focus reveals content immediately');
  dom.mediaQueries.get('(prefers-reduced-motion: reduce)').change(true);
  check($$(dom, '[data-reveal]').every(panel => panel.dataset.revealState === 'visible'), 'Changing motion preference reveals all pending content');
  dom.window.close();
}

{
  const dom = await open('/sobre', null, { positiveBounds: true });
  const aboutPage = $(dom, '.about-page');
  const previousTargets = dom.observers.flatMap(observer => [...observer.targets]).filter(target => aboutPage.contains(target));
  check(previousTargets.length > 0, 'Cleanup scenario includes actively observed pending information panels');
  await click(dom, $(dom, '.desktop-nav a[href="/redes"]'));
  await eventually(() => dom.window.location.pathname === '/redes', 'Leave information route');
  await eventually(() => previousTargets.every(target => dom.observers.every(observer => !observer.targets.has(target))), 'Information-page observers release old pending targets after navigation');
  check(previousTargets.every(target => !target.isConnected), 'Previous information panels leave the document on navigation');
  dom.window.close();
}

for (const options of [{ reducedMotion: true, positiveBounds: true }, { missingObserver: true, positiveBounds: true }]) {
  const dom = await open('/sobre', 'light', options);
  check($$(dom, '[data-reveal]').length >= 6, 'Information page contains progressive reveal targets');
  check($$(dom, '[data-reveal]').every(panel => panel.dataset.revealState === 'visible'), options.reducedMotion ? 'Reduced motion keeps all content immediately visible' : 'Observer-unavailable fallback keeps content immediately visible');
  equal(dom.window.document.documentElement.dataset.theme, 'light', 'Motion fallback preserves light theme');
  dom.window.close();
}
messages.push('Reveal initial markup, independent offscreen entrances, once-only completion, keyboard access, reduced-motion preference and observer-unavailable fallback');

{
  const dom = await open('/produtos/ia-academy', null, { positiveBounds: true });
  const nav = $(dom, 'nav.section-navigation');
  check(nav, 'Product sections use accessible anchor navigation');
  const ids = ['visao-geral', 'como-funciona', 'temas', 'para-quem', 'perguntas'];
  equal($$(dom, 'nav.section-navigation a').map(link => link.getAttribute('href')), ids.map(id => '#' + id), 'Every section anchor matches its existing destination');
  const rectangle = (top, height = 180) => ({ x: 0, y: top, top, left: 0, right: 320, bottom: top + height, width: 320, height, toJSON() {} });
  $(dom, '.site-header').getBoundingClientRect = () => rectangle(0, 69);
  nav.getBoundingClientRect = () => rectangle(69, 52);
  let positions = [-600, -100, 100, 400, 700];
  ids.forEach((id, index) => { $(dom, '#' + id).getBoundingClientRect = () => rectangle(positions[index]); });
  dom.window.dispatchEvent(new dom.window.Event('resize'));
  await eventually(() => $(dom, 'nav.section-navigation [aria-current="location"]')?.getAttribute('href') === '#temas', 'Section navigation initializes from the current document position');
  const observer = [...dom.observers].reverse().find(item => item.settings.threshold === 0 && item.targets.has($(dom, '#temas')));
  check(observer, 'Section navigation uses an intersection observer');
  positions = [-900, -500, -200, 100, 500];
  observer.emit($(dom, '#para-quem'), true);
  await eventually(() => $(dom, 'nav.section-navigation [aria-current="location"]')?.getAttribute('href') === '#para-quem', 'Section navigation follows forward scrolling');
  equal($$(dom, 'nav.section-navigation [aria-current="location"]').length, 1, 'Only one section is active');
  positions = [100, 400, 700, 1000, 1300];
  observer.emit($(dom, '#visao-geral'), true);
  await eventually(() => $(dom, 'nav.section-navigation [aria-current="location"]')?.getAttribute('href') === '#visao-geral', 'Section navigation follows upward scrolling');
  await click(dom, $(dom, 'nav.section-navigation a[href="#perguntas"]'));
  await eventually(() => dom.window.location.hash === '#perguntas', 'Native section link updates the URL hash');
  await eventually(() => dom.scrollCalls.some(call => call.id === 'perguntas'), 'Anchor navigation reaches its destination');
  equal(dom.scrollCalls.findLast(call => call.id === 'perguntas').settings.behavior, 'smooth', 'Anchor navigation is smooth when motion is allowed');
  const detailPage = $(dom, '.product-detail-page');
  const previousTargets = dom.observers.flatMap(observer => [...observer.targets]).filter(target => detailPage.contains(target));
  check(previousTargets.length > 0, 'Cleanup scenario includes actively observed pending product sections');
  await click(dom, $(dom, '.desktop-nav a[href="/sobre"]'));
  await eventually(() => dom.window.location.pathname === '/sobre', 'Leave product route');
  await eventually(() => previousTargets.every(target => dom.observers.every(observer => !observer.targets.has(target))), 'Section and reveal observers clean up after route disposal');
  check(previousTargets.every(target => !target.isConnected), 'Previous product sections leave the document on navigation');
  dom.window.close();
  const reduced = await open('/produtos/ia-academy', null, { reducedMotion: true });
  await click(reduced, $(reduced, 'nav.section-navigation a[href="#perguntas"]'));
  await eventually(() => reduced.scrollCalls.some(call => call.id === 'perguntas'), 'Reduced-motion anchor reaches its destination');
  equal(reduced.scrollCalls.findLast(call => call.id === 'perguntas').settings.behavior, 'instant', 'Reduced motion avoids animated anchor scrolling');
  reduced.window.close();
}
messages.push('Scroll-aware product navigation forward/upward, one active section, valid native anchors, smooth/reduced-motion navigation and observer cleanup');

equal(errors, [], 'No React runtime or jsdom execution errors');
console.log(`PASS: ${assertions} assertions. DOM integration checks; no browser rendering or Core Web Vitals measurement.`);
for (const message of messages) console.log(`  ✓ ${message}`);
