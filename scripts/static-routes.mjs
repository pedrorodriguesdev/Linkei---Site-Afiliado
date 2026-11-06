import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
const data=await build({entryPoints:['src/data/products.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {products}=await import('data:text/javascript;base64,'+Buffer.from(data.outputFiles[0].text).toString('base64'));
const origin='https://elevon-digital.sociablegem2.chatgpt.site';
const routes=[{path:'/',title:'Elevon — Novas possibilidades no digital',description:'Explore uma seleção de produtos digitais para aprender, criar e desenvolver novas habilidades.'},{path:'/produtos',title:'Produtos digitais | Elevon',description:'Descubra as seis ofertas de ferramentas e treinamentos selecionadas pela Elevon.'},{path:'/sobre',title:'Sobre a Elevon | Elevon',description:'Conheça a Elevon, uma plataforma de descoberta de ferramentas e treinamentos digitais.'},{path:'/normas',title:'Normas e transparência | Elevon',description:'Entenda os links de afiliados, as responsabilidades dos produtores e a privacidade na Elevon.'},{path:'/redes',title:'Redes e links | Elevon',description:'Encontre os canais oficiais da Elevon no Instagram, TikTok e X.'},...products.map(p=>({path:'/produtos/'+p.slug,title:p.name+' | Elevon',description:p.description}))];
const template=fs.readFileSync('dist/index.html','utf8');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
for(const route of routes){
 const html=template.replace(/<title>[^<]*<\/title>/,`<title>${escape(route.title)}</title>`).replace(/<meta name="description" content="[^"]*"\s*\/?\s*>/,`<meta name="description" content="${escape(route.description)}"/>`).replace(/<meta property="og:title" content="[^"]*"\s*\/?\s*>/,`<meta property="og:title" content="${escape(route.title)}"/>`).replace(/<meta property="og:description" content="[^"]*"\s*\/?\s*>/,`<meta property="og:description" content="${escape(route.description)}"/>`).replace('</head>',`<link rel="canonical" href="${origin+route.path}"/><meta property="og:url" content="${origin+route.path}"/></head>`);
 const target=route.path==='/'?'dist/index.html':path.join('dist',route.path,'index.html');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,html);
}
fs.writeFileSync('dist/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+routes.map(r=>`<url><loc>${origin+r.path}</loc></url>`).join('')+'</urlset>');
fs.writeFileSync('dist/robots.txt',`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
fs.writeFileSync('dist/_redirects','/* /index.html 200\n');
console.log(`Metadata and direct-entry HTML generated for ${routes.length} routes.`);
