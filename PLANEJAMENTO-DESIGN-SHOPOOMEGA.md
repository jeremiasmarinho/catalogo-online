# Planejamento de design — Shopomega Brasil

## Objetivo

Redesenhar a vitrine e o painel do catálogo para representar a Shopomega Brasil com fidelidade ao **Manual de Marca e Marketing Digital** e ao logo oficial fornecido. A experiência deve ser mobile-first, exclusivamente em modo claro, com referências de composição e materiais do iPhone/iOS atual — sem reproduzir telas, ícones proprietários ou a interface da Apple.

## Fontes da verdade

1. Manual de Marca e Marketing Digital — Shopomega Brasil: paleta, usos, tipografia, conteúdo e estrutura do site.
2. Logo oficial Shopomega Brasil anexado pelo usuário: não redesenhar, distorcer, trocar cores ou substituir por texto genérico. Preservar o original; preparar uma cópia otimizada para o site somente quando o arquivo-fonte estiver disponível no projeto.
3. [Apple Human Interface Guidelines — Materials](https://developer.apple.com/design/human-interface-guidelines/materials): referência para hierarquia, camadas e uso contido de materiais translúcidos. Aplicar os princípios à web, não copiar os componentes ou a identidade visual da Apple.

## Regra inviolável: paleta oficial

Usar somente estes cinco valores hexadecimais em cores de interface. Não introduzir preto puro, cinzas extras, tons padrão do Tailwind, outras cores de status ou gradientes fora da exceção indicada.

| Token semântico | Cor oficial | Aplicação |
|---|---|---|
| `brand-action` | `#32A041` | CTA principal, destaque de ação e acentos interativos, conforme o manual. |
| `brand-forest` | `#184E2D` | Elementos institucionais, ícones, foco, navegação secundária e texto sobre fundos claros. |
| `text-primary` | `#2D312E` | Títulos, corpo, dados e contraste; substitui preto puro. |
| `surface-primary` | `#FFFFFF` | Fundo principal, cartões, formulários e áreas de respiro. |
| `surface-secondary` | `#F4F6F4` | Seções alternadas, fundos de apoio, divisórias e contornos sutis. |

O gradiente `#32A041` → `#184E2D` fica reservado ao símbolo da marca quando a arte oficial assim o exigir. Não aplicar gradientes decorativos a banners, botões ou cartões. Transparência pode ser usada apenas como material translúcido derivado de uma cor oficial, principalmente branco, sem adicionar uma nova tonalidade; validar novamente o contraste após a composição sobre o conteúdo.

### Contraste e acessibilidade

- Combinar texto pequeno `#2D312E` ou `#184E2D` com `#FFFFFF` ou `#F4F6F4`.
- `#32A041` com texto branco tem contraste aproximado de **3,37:1**; não usar essa combinação para texto pequeno. Quando o CTA verde vibrante for usado com branco, manter texto em negrito de pelo menos 19 px e confirmar o contraste no componente final. Para ações compactas, usar `#184E2D` com branco ou fundo claro com texto `#184E2D`.
- Não comunicar estado apenas por cor: incluir rótulo, ícone ou descrição. Evitar vermelho/âmbar de bibliotecas; usar os tokens oficiais com texto explícito.
- Validar teclado, foco visível, leitores de tela, ampliação e preferência por movimento reduzido sem introduzir cores fora da paleta.

## Direção visual: iPhone recente, aparência clara

- Usar fundos claros, conteúdo em primeiro plano, hierarquia simples e superfícies com cantos arredondados; a marca e os produtos continuam sendo o foco.
- Reservar o efeito de vidro/translucidez para elementos funcionais flutuantes — cabeçalho fixo, navegação inferior e gavetas — com desfoque moderado e fundo suficiente para preservar legibilidade.
- Não aplicar vidro aos cartões de produto, seções de conteúdo ou a todos os componentes. Usar cartões sólidos `#FFFFFF`, divisórias `#F4F6F4` e sombra muito discreta derivada de `#2D312E`.
- Sobre fotos ricas, limitar o material translúcido à camada de controles e verificar se texto e ícones continuam legíveis em imagens claras e escuras. Não usar transparência forte como decoração.
- Adotar áreas de toque confortáveis, navegação inferior no celular, safe areas, animações curtas e discretas e suporte a `prefers-reduced-motion`.
- Manter somente o modo claro (`color-scheme: light`); não criar paleta escura ou inversões automáticas.
- Não usar SF Symbols, elementos de status bar ou controles da Apple como decoração. Ícones devem seguir os já adotados no projeto ou a linguagem da própria marca.

## Tipografia e forma

- Títulos e destaques: **Sora** em semibold/bold, conforme a recomendação do manual.
- Corpo, preços, formulários e controles: **Inter** em regular/medium; priorizar legibilidade em telas pequenas.
- Escala responsiva e hierarquia clara: título de impacto, subtítulo curto, rótulos concisos e preço fácil de localizar.
- Usar espaçamento generoso, alinhamento consistente e raios coerentes entre botões, cartões, campos e folhas modais. Evitar excesso de cápsulas, sombras, contornos ou microtexto.

## Aplicação por área

### Vitrine

- Cabeçalho branco com logo horizontal oficial à esquerda; busca, catálogo e sacola fáceis de alcançar no celular.
- Hero com a mensagem prevista no manual: **“A tecnologia e variedade que você procura, com a confiança que você merece.”** Subtítulo: **“Soluções selecionadas com entrega ágil e suporte dedicado em todo o Brasil.”**
- CTA principal **“Conheça Nossos Produtos”**, com a cor e o tratamento de contraste definidos acima.
- Faixa de diferenciais e catálogo em cartões brancos, separados por `#F4F6F4`; filtro, busca, estoque, preço e adição à sacola devem continuar claros em telas estreitas.
- Rodapé `#2D312E` ou `#184E2D`, com a versão monocromática branca oficial do logo, dados e políticas somente quando fornecidos/validados pela empresa.
- Não publicar alegações de pagamento seguro, garantia ou entrega nacional como fato do sistema sem confirmar que a operação da empresa realmente oferece esses serviços. O checkout atual registra a intenção e segue pelo WhatsApp.

### Painel do lojista

- Aplicar a mesma identidade, porém com prioridade para leitura e tarefas: pedidos, produtos, estoque, edição e categorias.
- Manter o conteúdo em superfícies sólidas claras; usar a camada translúcida somente na navegação fixa e em sobreposições.
- Diferenciar status com texto e ícone, sem depender de cores adicionais. Dar prioridade visual a estoque baixo/zerado sem esconder o valor numérico.
- Garantir que ações frequentes possam ser alcançadas com uma mão e que formulários/modal de edição não fiquem cobertos pelo teclado ou navegação inferior.

## Plano de execução

1. **Consolidar identidade:** trocar os dados de exemplo Casa Aurora pela marca Shopomega no `src/config/store.ts`; mapear os cinco tokens oficiais e a tipografia recomendada.
2. **Preparar ativos:** adicionar o logo oficial ao diretório público após receber/copiar o arquivo original para o projeto; gerar somente versões necessárias, sem alterar a arte.
3. **Implementar base visual:** atualizar tokens globais, tipografia, superfícies, foco, botões e componentes compartilhados; remover valores de cor antigos e classes de paleta não autorizadas.
4. **Redesenhar a vitrine:** cabeçalho, hero, diferenciais, busca, filtros, grade de produtos, detalhes, sacola, checkout e rodapé.
5. **Harmonizar o painel:** login, resumo, pedidos, produtos/estoque e categorias, mantendo foco em tarefas de uso recorrente.
6. **Validar fidelidade e acessibilidade:** revisar cada estado e breakpoint, checar todas as cores efetivamente renderizadas e os contrastes, testar teclado/leitor de tela e verificar que nenhuma alegação comercial foi inventada.

## Critérios de aceite

- Todos os valores cromáticos de interface pertencem à paleta oficial; a única combinação gradiente é a autorizada para o símbolo.
- O modo claro é consistente em todas as telas; materiais translúcidos aparecem apenas em camadas funcionais e nunca prejudicam leitura.
- Logo e tipografia seguem o manual; nenhum elemento do logo é deformado ou recriado.
- Vitrine e painel funcionam em larguras de celular sem rolagem horizontal, campos cortados ou controles encobertos.
- Estados de foco, erro, disponibilidade e status são compreensíveis sem depender exclusivamente da cor.
- Cores, textos comerciais, logo e comportamento final são revisados no desktop e em pelo menos um viewport móvel antes da publicação.
