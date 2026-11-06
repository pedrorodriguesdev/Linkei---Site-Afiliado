import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

async function open(route, theme = null) {
  const console = new VirtualConsole();
  console.on('jsdomError', error => errors.push({ route, message: error.message }));
  console.on('error', (...args) => errors.push({ route, message: args.map(String).join(' ') }));
  const dom = new JSDOM(html, { url: `https://elevon.test${route}`, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: console });
  const { window } = dom;
  window.matchMedia = query => ({
    matches: query.includes('min-width') ? false : query.includes('max-width') ? true : false,
    media: query, onchange: null, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent() { return true; },
  });
  window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
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
  check(!$(dom, 'canvas'), `${route}: mobile uses static Earth without WebGL`);
  if (route === '/redes') equal($$(dom, '.social-card a').map(link => link.href), ['https://www.instagram.com/elevon.n/', 'https://www.tiktok.com/@llooping0', 'https://x.com/LinkouDigital'], 'Exact three official social destinations');
  dom.window.close();
}
messages.push('All 11 valid routes, shared navigation/footer, page metadata, mobile static Earth and official social links');

{
  const dom = await open('/produtos');
  equal($$(dom, '.product-card').length, 6, 'Catalog contains exactly six offers');
  equal($$(dom, '.product-media').length, 6, 'Catalog reserves six media areas');
  check($$(dom, '.product-media').every(media => media.children.length === 0 && !media.textContent.trim()), 'All product image containers remain empty');
  check(!$(dom, '.product-card img'), 'No generated or placeholder product images');
  await type(dom, $(dom, '.catalog-toolbar input'), 'edicao');
  equal($$(dom, '.product-card h3').map(node => node.textContent), ['Edição Dinâmica com CapCut'], 'Search is accent insensitive');
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
equal(errors, [], 'No React runtime or jsdom execution errors');
console.log(`PASS: ${assertions} assertions. DOM integration checks; no browser rendering or Core Web Vitals measurement.`);
for (const message of messages) console.log(`  ✓ ${message}`);
