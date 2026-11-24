# Catálogo Online White-Label

Base single-tenant de catálogo responsivo, sacola de compras, pedidos via WhatsApp e painel administrativo. A identidade da loja fica em `src/config/store.ts`; banco e senha são configurados pelo ambiente.

## Requisitos

- Node.js 22+
- npm
- Docker e Docker Compose (para o banco PostgreSQL e para publicar com o compose)

## Desenvolvimento local

```powershell
Copy-Item .env.example .env
```

Edite `.env`:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: credenciais do banco no Compose (o `POSTGRES_PASSWORD` é exigido e só vale na **primeira** criação do volume).
- `DATABASE_URL`: no compose local use `postgresql://USUARIO:SENHA@127.0.0.1:5433/NOME_DA_DB?sslmode=disable` (o serviço `db` publica a porta **5433** no host).
- `ADMIN_PASSWORD`: senha longa e exclusiva do painel (mínimo de 12 caracteres).

O número `whatsappNumber` em `src/config/store.ts` deve usar o formato internacional apenas com dígitos, por exemplo `5511999999999`. Preços são registrados em centavos.

```powershell
npm install
docker compose up -d db
npx prisma migrate deploy
npm run dev
```

Abra `http://localhost:3000`; o painel está em `/admin`. Configure a loja editando somente `src/config/store.ts`.

## Produção com Docker / Easypanel

1. Copie `.env.example` para `.env` e preencha valores reais e exclusivos (não use os placeholders). Mantenha o `.env` fora do controle de versão.
2. Em `src/config/store.ts`, personalize identidade e `whatsappNumber`.
3. Suba a stack:

```powershell
docker compose up -d --build
```

Comportamento:

- O serviço `db` (PostgreSQL 16) usa o volume nomeado `pgdata` e não expõe porta no host em produção (só a rede interna do Compose; a publicação `5433:5432` é para ferramentas locais).
- O container da aplicação roda `prisma migrate deploy` **antes** de iniciar o servidor; se a migração ou a conexão falharem, o container não sobe e o erro aparece nos logs.
- `DATABASE_URL` deve apontar para o host `db` dentro do Compose, por exemplo `postgresql://USUARIO:SENHA@db:5432/NOME_DA_DB?sslmode=disable`.
- Configure o proxy/domínio HTTPS na hospedagem para a porta 3000 da aplicação. Cookies do painel em produção exigem HTTPS.

### Backup e restauração

- **Banco:** `docker compose exec db pg_dump -U USUARIO -d NOME_DA_DB > backup_$(Get-Date -Format yyyyMMddHHmm).sql`
- **Imagens:** faça backup do diretório `public/uploads` no host (o Compose monta esse volume).
- **Restauração:** `docker compose exec -T db psql -U USUARIO -d NOME_DA_DB < backup.sql` e restaure `public/uploads`.
- Teste a restauração em ambiente separado antes de confiar no backup.
- Trocar `POSTGRES_PASSWORD` depois da primeira subida não altera a senha já gravada no volume; use `ALTER USER` no banco ou recrie o volume apenas em ambiente descartável.

## Funcionalidades

- Vitrine com busca, filtro de categoria, detalhes de produto e carrinho responsivo.
- Checkout cria o pedido no PostgreSQL e abre uma conversa `wa.me` com o resumo; o lojista confirma pagamento e entrega diretamente com o cliente.
- Painel `/admin` com login, relatório de pedidos, status, categorias, edição de produtos, estoque e upload local de imagens (JPG, PNG, WEBP ou GIF até 5 MB).
- Uma única senha `ADMIN_PASSWORD` cria uma sessão assinada de oito horas em cookie `HttpOnly`; em produção, o cookie exige HTTPS. A senha não é guardada no navegador.
- O estoque é opcional: deixe o campo vazio para não controlar; com estoque definido, os pedidos reservam unidades, cancelamentos devolvem as unidades e produtos sem estoque não aparecem na vitrine.
- O plano de evolução e refinamento mobile está em [PLANEJAMENTO-MOBILE-E-PAINEL.md](./PLANEJAMENTO-MOBILE-E-PAINEL.md).
- O plano visual específico da Shopomega, baseado no manual de marca, está em [PLANEJAMENTO-DESIGN-SHOPOOMEGA.md](./PLANEJAMENTO-DESIGN-SHOPOOMEGA.md).

## Observações operacionais

- Configure HTTPS no proxy reverso; não exponha o painel administrativo em HTTP público.
- `public/uploads` deve ficar em armazenamento persistente no host (já montado pelo Compose).
- O preço e a disponibilidade dos itens são relidos no servidor ao criar pedidos; o pedido é um registro de intenção de compra, não uma cobrança ou confirmação de pagamento.
- O schema é PostgreSQL (`prisma/schema.prisma`). Migrações versionadas ficam em `prisma/migrations/`. Não reaplique SQL antigo de SQLite.
- Arquivo legado `prisma/prod.db` (SQLite antigo) não é usado; não é apagado automaticamente. Dados de produção em PostgreSQL partem de banco vazio, a menos que exista migração de dados explícita e aprovada.
