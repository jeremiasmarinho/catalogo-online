# Catálogo Online White-Label

Base single-tenant de catálogo responsivo, sacola de compras, pedidos via WhatsApp e painel administrativo. A identidade da loja fica em `src/config/store.ts`; banco e senha são configurados pelo ambiente.

## Requisitos

- Node.js 22+
- npm
- PostgreSQL externo para a Vercel, ou Docker Compose para o banco local
- Um Vercel Blob store **privado** para upload de imagens

## Desenvolvimento local

```powershell
Copy-Item .env.example .env
```

Edite `.env`:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: credenciais do banco no Compose (o `POSTGRES_PASSWORD` é exigido e só vale na **primeira** criação do volume).
- `DATABASE_URL`: no compose local use `postgresql://USUARIO:SENHA@127.0.0.1:5433/NOME_DA_DB?sslmode=disable` (o serviço `db` publica a porta **5433** apenas em `127.0.0.1`). Codifique caracteres especiais da senha na URL (ex.: `@` → `%40`).
- `ADMIN_PASSWORD`: senha longa e exclusiva do painel (mínimo de 12 caracteres).
- `BLOB_READ_WRITE_TOKEN`: token de leitura e gravação do Blob store privado; necessário para o upload local e na Vercel. Nunca exponha esse token no navegador ou no repositório.
- `TRUST_PROXY`: só `1` se um proxy confiável sempre definir `X-Forwarded-For`; sem isso o rate limit não usa IP do cliente.

O número `whatsappNumber` em `src/config/store.ts` deve usar o formato internacional apenas com dígitos, por exemplo `5511999999999`. Preços são registrados em centavos.

```powershell
npm install
docker compose up -d db
npx prisma migrate deploy
npm run dev
```

Abra `http://localhost:3000`; o painel está em `/admin`. Configure a loja editando somente `src/config/store.ts`.

## Publicação na Vercel

1. Importe o repositório na Vercel e crie um Blob store com acesso **Private**. Conecte-o ao projeto e habilite **Add a read-write token env var to this connection**, pois o upload direto precisa de `BLOB_READ_WRITE_TOKEN`. Use stores separados para produção e preview.
2. Em **Settings → Environment Variables**, configure `DATABASE_URL` com o PostgreSQL externo, `ADMIN_PASSWORD` com senha exclusiva de pelo menos 12 caracteres e confirme a presença de `BLOB_READ_WRITE_TOKEN`. Configure esses valores separadamente para cada ambiente. Siga os requisitos de TLS e conexão do provedor do banco; para migrações use conexão direta, não um pooler incompatível com migrações.
3. Antes do primeiro deploy, faça backup e confirme o banco de destino. Em ambiente seguro com `DATABASE_URL` apontando para esse banco, execute `npx prisma migrate deploy`. A Vercel **não** aplica migrações automaticamente. No primeiro lançamento planejado o catálogo começa vazio; o SQLite antigo não é importado. Não execute esse comando contra banco existente sem verificar o impacto e a permissão.
4. Configure `TRUST_PROXY=1` somente se as requisições chegarem através da Vercel e a configuração de proxy garantir cabeçalhos confiáveis. A Vercel normalmente substitui `X-Forwarded-For`; configurações de proxy confiável Enterprise exigem avaliação própria. Consulte [os cabeçalhos da Vercel](https://vercel.com/docs/headers/request-headers#x-forwarded-for).
5. Publique o projeto, configure o domínio e confirme HTTPS. Antes de liberar ao público, teste login, cadastro e edição de produto, upload de fotos grandes, transparência/animação, exibição no catálogo, pedidos e limites de requisição no ambiente real.
6. Configure backup e teste de restauração para **PostgreSQL e Blob**, monitore custos/erros, defina retenção e publique a política de privacidade. Não há backup automático configurado por este repositório.

Uploads vão direto do navegador ao Blob **privado**, contornando o limite de corpo das Vercel Functions. JPG e PNG são reduzidos no navegador quando possível; GIF/WEBP podem ser enviados no tamanho original. O arquivo temporário de até 20 MiB não é público: o servidor valida e otimiza antes de criar a imagem definitiva de até 1 MiB e registrar sua URL no banco. O temporário é removido após o processamento ou expira automaticamente (TTL de um dia, sujeito ao horário de expiração do Blob). A rota pública de imagens expõe apenas arquivos definitivos, nunca os temporários. O banco contém somente a URL, não a imagem.

As imagens definitivas usam nomes únicos e cache público. Substituições ou exclusões de produtos não removem automaticamente as imagens antigas: monitore armazenamento e faça a limpeza somente após verificar quais arquivos ainda estão em uso. Os arquivos locais antigos em `public/uploads` não são migrados automaticamente para o Blob.

## Produção com Docker / Easypanel

1. Copie `.env.example` para `.env` e preencha os campos vazios com valores reais e exclusivos. Mantenha o `.env` fora do controle de versão. Em produção, valores ausentes, placeholders `REPLACE_WITH_*` ou `ADMIN_PASSWORD` com menos de 12 caracteres **impedem a aplicação de subir** (falha explícita, sem logar os valores).
2. Em `src/config/store.ts`, personalize identidade e `whatsappNumber`.
3. Suba a stack:

```powershell
docker compose up -d --build
```

Comportamento:

- O serviço `db` (PostgreSQL 16) usa o volume nomeado `pgdata` e publica a porta **5433 somente em 127.0.0.1** do host (ferramentas locais). A aplicação acessa `db:5432` pela rede interna do Compose.
- O container da aplicação roda `prisma migrate deploy` **antes** de iniciar o servidor; se a migração ou a conexão falharem, o container não sobe e o erro aparece nos logs.
- `DATABASE_URL` deve apontar para o host `db` dentro do Compose, por exemplo `postgresql://USUARIO:SENHA@db:5432/NOME_DA_DB?sslmode=disable`.
- A aplicação publica a porta 3000 apenas em `127.0.0.1` do host. Configure um proxy reverso com domínio e HTTPS para essa porta; se o proxy estiver em outro container, conecte-o de forma segura à rede interna do Compose. Cookies do painel em produção exigem HTTPS.

### Imagens e upload

- Formatos aceitos: JPG, PNG, WEBP e GIF.
- Arquivo original: até **20 MiB** (validado no navegador e no servidor).
- No servidor, a imagem é decodificada, redimensionada para no máximo **2048×2048** (sem ampliar), com EXIF/metadados removidos e resultado final de até **1 MiB**. GIF/WEBP animados preservam a animação; se não couber no limite, a API retorna erro e a imagem anterior é mantida.
- Novas imagens ficam no Blob privado da Vercel, inclusive quando a aplicação roda no Docker. Configure `BLOB_READ_WRITE_TOKEN`. O volume `public/uploads` permanece apenas para servir fotos locais legadas.
- O banco guarda apenas a URL da imagem, não os bytes.

### Proteção (rate limit)

| Rota | Limite | Janela | Resposta |
|------|--------|--------|----------|
| Login `/api/admin/session` | 5 tentativas | 15 min | `429` + `Retry-After` |
| POST `/api/orders` | 10 | 1 min | `429` + `Retry-After` |
| POST/PATCH `/api/products` | 30 | 1 min | `429` + `Retry-After` |
| POST `/api/upload` | 30 | 1 min | `429` + `Retry-After` |

Os contadores ficam no PostgreSQL e são compartilhados entre instâncias. Com `TRUST_PROXY=1`, configure o proxy para substituir completamente o cabeçalho `X-Forwarded-For` e impeça acesso direto à porta da aplicação; caso contrário um cliente pode falsificar seu IP. Sem proxy confiável, todas as requisições compartilham um único limite, o que pode bloquear clientes legítimos. Valide o comportamento na hospedagem antes da publicação.

### Backup e restauração

- **Banco (PowerShell 7.4+):** `docker compose exec -T db pg_dump -U USUARIO -d NOME_DA_DB > backup.sql`. Confirme que `$LASTEXITCODE` é zero e proteja o arquivo.
- **Imagens:** faça backup do Blob privado e também do diretório `public/uploads` no host se houver fotos locais legadas.
- **Restauração (PowerShell):** `Get-Content .\backup.sql -Raw | docker compose exec -T db psql -v ON_ERROR_STOP=1 -U USUARIO -d NOME_DA_DB`. Confirme que `$LASTEXITCODE` é zero e restaure `public/uploads`. Execute somente em banco separado e vazio.
- **Restauração (bash):** `docker compose exec -T db psql -v ON_ERROR_STOP=1 -U USUARIO -d NOME_DA_DB < backup.sql`
- Teste a restauração em ambiente separado antes de confiar no backup.
- Trocar `POSTGRES_PASSWORD` depois da primeira subida não altera a senha já gravada no volume; use `ALTER USER` no banco ou recrie o volume apenas em ambiente descartável.

## Funcionalidades

- Vitrine com busca, filtro de categoria, detalhes de produto e carrinho responsivo.
- Checkout cria o pedido no PostgreSQL e abre uma conversa `wa.me` com o resumo; o lojista confirma pagamento e entrega diretamente com o cliente.
- Painel `/admin` com login, relatório de pedidos, status, categorias, edição de produtos, estoque e upload de imagens no Blob (JPG, PNG, WEBP ou GIF; original até 20 MiB, salvo otimizado até 1 MiB).
- Uma única senha `ADMIN_PASSWORD` cria uma sessão assinada de oito horas em cookie `HttpOnly`; em produção, o cookie exige HTTPS. A senha não é guardada no navegador.
- O estoque é opcional: deixe o campo vazio para não controlar; com estoque definido, os pedidos reservam unidades, cancelamentos devolvem as unidades e produtos sem estoque não aparecem na vitrine.

## Observações operacionais

- Configure HTTPS na Vercel ou no proxy reverso; não exponha o painel administrativo em HTTP público.
- Se houver fotos locais legadas, `public/uploads` deve ficar em armazenamento persistente no host (já montado pelo Compose); a Vercel não serve esses arquivos persistentes.
- O preço e a disponibilidade dos itens são relidos no servidor ao criar pedidos; o pedido é um registro de intenção de compra, não uma cobrança ou confirmação de pagamento.
- O schema é PostgreSQL (`prisma/schema.prisma`). Migrações versionadas ficam em `prisma/migrations/`. Não reaplique SQL antigo de SQLite.
- Arquivo legado `prisma/prod.db` (SQLite antigo) não é usado; não é apagado automaticamente. Dados de produção em PostgreSQL partem de banco vazio, a menos que exista migração de dados explícita e aprovada.
- Backups automáticos, retenção, monitoramento de disco e textos de privacidade dependem de configuração e aprovação do responsável — não estão provisionados apenas por este repositório.

## Testes de imagens

Com Node.js 22.6 ou superior, execute `node --experimental-strip-types --test tests\image-optimize.test.mjs` para verificar a otimização e os limites das fotos.
