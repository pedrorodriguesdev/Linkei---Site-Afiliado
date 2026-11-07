# Globo V6 — renderização e validação

## Inspeção da base

O globo existente usa Three.js sob demanda, SphereGeometry compartilhada entre superfície, nuvens e atmosfera, três ShaderMaterials e um controlador de requestAnimationFrame. A câmera perspectiva, o enquadramento e o tilt de 14° foram preservados. Não há normal map, bump map ou mapa de elevação nesta base.

As três texturas de cada perfil continuam sendo as mesmas: albedo geográfico, emissão urbana e nuvens. As fontes e licenças estão em `public/earth/SOURCES.txt`. A superfície usa sRGB para o albedo; emissão e densidade de nuvens são dados lineares. A conversão de saída ocorre uma vez pelo chunk de cores do Three.js. `NoToneMapping` agora é explícito.

## Alterações

- **Oceanos e continentes:** luz ambiente menos plana e iluminação direcional com transição suave. O oceano mantém as variações de profundidade da textura e recebe um reflexo dielétrico discreto, calculado com as direções da luz e da câmera. O albedo mantém florestas, desertos, montanhas e polos da imagem original. Não foi inventado relevo nem adicionada geometria de deslocamento.
- **Cidades:** extração do sinal quente do atlas real, supressão das regiões oceânicas pela cor do albedo e curva de emissão com compressão suave dos picos. Os sinais urbanos fracos são realçados, com ajuste de exposição para celular e gradação de âmbar a branco quente. Não há luzes aleatórias nem point lights. A classificação de oceano é uma aproximação pela cor, não uma nova máscara geográfica.
- **Nuvens:** cobertura, transparência e resposta solar refinadas, sombras suaves por uma amostra deslocada da textura e coordenadas que fecham a emenda longitudinal. As fórmulas de iluminação são compartilhadas conceitualmente entre a camada separada e a versão integrada do perfil econômico. A esfera continua em 1,008 vezes o raio da superfície, com rotação própria.
- **Atmosfera:** shell reduzido de 1,025 para 1,020 vezes o raio; Fresnel com queda suave no contorno externo e interno. Ciano/azul no lado iluminado, influência violeta discreta no lado escuro, sem o preenchimento azul excessivo da superfície anterior.
- **Sol e noite:** direção ajustada de (-0,8; 0,45; 0,4) para (-0,8; 0,45; 0,2), normalizada, para expor melhor a faixa noturna. A noite mantém um pequeno preenchimento azul e detalhes do terreno, enquanto superfície, nuvens e atmosfera usam a mesma direção solar.

## Arquivos modificados

- `src/components/DesktopEarth.tsx`: shaders, direção solar, tamanho da atmosfera e uniform de exposição móvel.
- `scripts/verify-earth.mjs`: suporte a `NoToneMapping` no mock existente do Three.js.
- `docs/globo-v6.md`: este relatório.

Nenhuma textura, dependência de produção, rota, arte de produto, link de afiliação, layout ou comportamento de tema foi alterado. As imagens estáticas de fallback continuam as mesmas.

## Desempenho e comportamento preservados

Os três atlas somam 565.510 bytes no desktop e 112.634 bytes no perfil móvel, sem downloads novos. Não há novas amostras de textura em relação aos caminhos anteriores; há mais algumas operações aritméticas por fragmento. Continuam a mesma geometria, os três materiais, o limite de DPR e o governador adaptativo. O perfil mínimo continua incorporando as nuvens à superfície em vez de desenhar a camada transparente separada.

A volta da Terra continua em aproximadamente 180 segundos; as nuvens, em 210. O único RAF pausa fora da tela e com a aba oculta. As preferências Automático/Animado/Estático continuam persistidas; movimento reduzido e modo estático não alocam o renderer. A interação do mouse mantém seu amortecimento e tilt limitado. Falhas de textura, shader, contexto ou desempenho mantêm o fallback.

## Testes e limites

- `npm run build`: TypeScript, Vite e geração das 11 entradas estáticas.
- `npm run verify`: 250 verificações de integração DOM e 234 do globo, incluindo rotação por tempo, pausas, único RAF, perfis móveis, preferências, fallback e descarte de texturas, materiais, geometria e contexto. A parte do renderer usa mocks e não certifica o WebGL real.
- Comparação visual antes/depois em renders locais de 680 e 340 pixels, sobre fundos claro/escuro, com camada de nuvens separada e integrada. Foram inspecionadas diferentes orientações, incluindo Américas e África/Índia, para avaliar geografia, nuvens, reflexos, cidades e contorno.
- Os três shaders foram compilados e renderizados em EGL/Mesa llvmpipe com as texturas reais, SphereGeometry, câmera/matrizes e chunks de cores do Three.js. A sintaxe GLSL foi adaptada para OpenGL desktop; os testes retornaram `GL_NO_ERROR`. Esse processo valida a lógica dos shaders e ajuda na inspeção visual, mas não equivale a um navegador executando WebGL.

O ambiente não disponibilizou o controle de navegador previsto para o preview do Sites. Não foram medidos FPS em dispositivos reais, uso de GPU física, Lighthouse/Core Web Vitals ou suavidade visual no navegador. Antialiasing, blending e desempenho podem variar por navegador e GPU. Os scripts e renders de inspeção são ferramentas temporárias externas ao repositório, não dependências do site.
