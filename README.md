# Catálogo Online White-Label

Base single-tenant de catálogo responsivo, sacola de compras, pedidos via WhatsApp e painel administrativo. A identidade da loja fica em `src/config/store.ts`; banco e senha são configurados pelo ambiente.

## Requisitos

- Node.js 22+
- npm

## Desenvolvimento local

```powershell
Copy-Item .env.example .env
```

Edite `.env` e defina uma senha longa e exclusiva em `ADMIN_PASSWORD` (mínimo de 12 caracteres). O número `whatsappNumber` em `src/config/store.ts` deve usar o formato internacional apenas com dígitos, por exemplo `5511999999999`. Preços são registrados em centavos.

```powershell
npm install
npx prisma migrate dev --name init
npm run dev
```

Abra `http://localhost:3000`; o painel está em `/admin`. Configure a loja editando somente `src/config/store.ts`.

## Produção sem Docker

Configure `DATABASE_URL="file:./prod.db"` e `ADMIN_PASSWORD` no ambiente do processo. O arquivo SQLite fica em `prisma/prod.db`. Instale dependências, aplique as migrações e compile:

```powershell
npm ci
npm run db:migrate
npm run build
npm start
```

O processo precisa de permissão de escrita em `prisma/` e `public/uploads/`. Faça backup dos dois locais, que guardam respectivamente os pedidos e imagens enviadas.

## Docker / Easypanel

Copie `.env.example` para `.env`, ajuste `ADMIN_PASSWORD` e personalize `src/config/store.ts`. Em seguida:

```powershell
docker compose up -d --build
```

O Compose publica a porta 3000 e persiste `prisma/prod.db` e `public/uploads` no host. Configure o proxy/domínio HTTPS da hospedagem para essa porta. Faça backup dos volumes antes de atualizar a imagem.

## Funcionalidades

- Vitrine com busca, filtro de categoria, detalhes de produto e carrinho responsivo.
- Checkout cria o pedido no SQLite e abre uma conversa `wa.me` com o resumo; o lojista confirma pagamento e entrega diretamente com o cliente.
- Painel `/admin` com login, relatório de pedidos, status, categorias, edição de produtos, estoque e upload local de imagens (JPG, PNG, WEBP ou GIF até 5 MB).
- Uma única senha `ADMIN_PASSWORD` cria uma sessão assinada de oito horas em cookie `HttpOnly`; em produção, o cookie exige HTTPS. A senha não é guardada no navegador.
- O estoque é opcional: deixe o campo vazio para não controlar; com estoque definido, os pedidos reservam unidades, cancelamentos devolvem as unidades e produtos sem estoque não aparecem na vitrine.
- O plano de evolução e refinamento mobile está em [PLANEJAMENTO-MOBILE-E-PAINEL.md](./PLANEJAMENTO-MOBILE-E-PAINEL.md).
- O plano visual específico da Shopomega, baseado no manual de marca, está em [PLANEJAMENTO-DESIGN-SHOPOOMEGA.md](./PLANEJAMENTO-DESIGN-SHOPOOMEGA.md).

## Observações operacionais

- Configure HTTPS no proxy reverso; não exponha o painel administrativo em HTTP público.
- A aplicação e os volumes devem ficar em armazenamento persistente. O diretório `public/uploads` faz parte do artefato servido pelo Next.js.
- O preço e a disponibilidade dos itens são relidos no servidor ao criar pedidos; o pedido é um registro de intenção de compra, não uma cobrança ou confirmação de pagamento.
- Para migrar para PostgreSQL, altere o provider e a URL no `prisma/schema.prisma`, ajuste `DATABASE_URL` e gere/aplique uma migração apropriada.
