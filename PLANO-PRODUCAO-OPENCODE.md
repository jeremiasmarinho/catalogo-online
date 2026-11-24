# Plano para preparar o catálogo para produção

## Objetivo

Deixar o catálogo pronto para ser publicado com PostgreSQL, preservando as alterações existentes e quaisquer dados que precisem ser mantidos. Não publicar nem alterar um banco de produção sem confirmação explícita do responsável.

## Estado conhecido

- `prisma/schema.prisma` está configurado para PostgreSQL.
- O `DATABASE_URL` atualmente configurado no ambiente local não usa o protocolo PostgreSQL exigido pelo schema; `npx prisma validate` falhou com P1012.
- Não há diretório `prisma/migrations` no diretório de trabalho. As migrações versionadas anteriormente eram para SQLite e aparecem como removidas no Git; não devem ser aplicadas a PostgreSQL sem conversão/recriação.
- `docker-compose.yml` não inicia um banco de dados. A publicação precisa de uma instância PostgreSQL externa ou de uma decisão explícita sobre onde hospedar o banco.
- O README ainda tem instruções de produção para SQLite, incompatíveis com o schema atual.
- `npm run lint` passou. `npm run build` não foi validado: no Windows, o Prisma falhou ao renomear o query engine com `EPERM`.
- O checkout registra o pedido e direciona o cliente ao WhatsApp; não processa pagamento nem frete.

## Regras de execução

1. Antes de editar, revisar `git status` e `git diff`. Preservar todas as alterações locais; não restaurar, descartar ou sobrescrever arquivos alterados sem autorização.
2. Nunca exibir, copiar para o plano, registrar em logs ou versionar valores de `.env`, credenciais de banco ou senhas. Alterar `.env.example` sem tocar no `.env` local.
3. Não apagar nem recriar bancos, tabelas, migrações ou dados para “resolver” incompatibilidades. Fazer backup antes de qualquer migração ou importação de dados.
4. Não inventar provedor, domínio, credenciais, políticas comerciais, endereço, política de entrega ou configuração de pagamento. Se uma decisão do responsável for necessária, parar e solicitá-la.
5. Não executar deploy, migração em produção, push ou alteração de DNS sem aprovação explícita.
6. Se for necessário alterar APIs ou convenções do Next.js, consultar primeiro a documentação instalada em `node_modules/next/dist/docs/`.

## Etapa 1 — Confirmar destino e preservar dados

- Identificar a plataforma de hospedagem pretendida e se o PostgreSQL será gerenciado ou hospedado junto à aplicação.
- Inspecionar o banco local `prisma/prod.db` sem exibir dados pessoais. Determinar se contém produtos, categorias ou pedidos que precisam ser preservados; não presumir que está vazio.
- Confirmar se o catálogo publicado deve começar vazio ou receber os dados existentes. Se for necessário migrar dados do SQLite, elaborar e testar uma estratégia de transferência separada, com backup e reconciliação de contagens.
- Registrar as decisões necessárias antes de executar qualquer operação irreversível.

**Aceite:** destino e estratégia de dados definidos; arquivos e banco locais preservados.

## Etapa 2 — Alinhar PostgreSQL e migrações

- Confirmar que `DATABASE_URL` está definido no ambiente de execução no formato PostgreSQL exigido pelo provedor, usando os secrets da plataforma. Não inserir credenciais reais em arquivos versionados.
- Gerar uma migração inicial compatível com o schema PostgreSQL atual. Não reutilizar SQL SQLite nem marcar migrações como aplicadas sem verificar o schema real.
- Adicionar e revisar `prisma/migrations/migration_lock.toml` com o provider correto.
- Validar o schema e aplicar as migrações primeiro em um banco de staging descartável e vazio.
- Se houver dados SQLite a manter, não executar a migração de dados até que o backup, o mapeamento e a validação de contagens estejam aprovados.

**Aceite:** `npx prisma validate` passa; um banco PostgreSQL de staging vazio é criado com `npm run db:migrate`; tabelas e relações correspondem ao schema.

## Etapa 3 — Corrigir deploy e documentação

- Atualizar `.env.example` para documentar variáveis necessárias sem incluir credenciais utilizáveis ou uma senha de exemplo que possa ser confundida com valor de produção.
- Ajustar `docker-compose.yml` e instruções de hospedagem ao modelo escolhido. Se PostgreSQL for externo, documentar como injetar `DATABASE_URL`; não adicionar um banco local sem decisão explícita.
- Garantir armazenamento persistente para `public/uploads` e configurar backups do banco e dos uploads, com procedimento de restauração.
- Atualizar o README para refletir PostgreSQL, as migrações reais e os passos corretos de build, start, HTTPS e backup. Remover instruções conflitantes sobre `prisma/prod.db`.
- Revisar a inicialização do container para que a aplicação só inicie após as migrações terem sucesso; falhas de conexão ou migração devem permanecer explícitas nos logs.

**Aceite:** uma pessoa consegue configurar o ambiente de staging seguindo apenas a documentação atualizada; reiniciar/recriar o container não perde banco nem imagens.

## Etapa 4 — Validar aplicação e operação

- Executar `npm run lint`, `npx prisma validate`, `npm run db:migrate` em staging e `npm run build`.
- Investigar o `EPERM` do Prisma no Windows sem apagar dados ou dependências indiscriminadamente. Se persistir, validar o build com `docker build` no ambiente Linux de destino.
- Fazer smoke test em staging: vitrine, login/logout do `/admin`, rotas protegidas, criação/edição de produto, upload de imagem, pedido, atualização/cancelamento de status e comportamento de estoque.
- Confirmar que pedidos inválidos ou produtos indisponíveis não são gravados como pedidos válidos e que erros de banco/migração não aparecem como sucesso.
- Se o negócio exigir cobrança ou cálculo de frete no site, tratar como requisito separado: o fluxo atual é intencionalmente via WhatsApp e não substitui integração de pagamento ou frete.

**Aceite:** build de produção passa; smoke tests passam no staging; um pedido de teste pode ser rastreado no painel e o upload continua acessível após reinício.

## Etapa 5 — Segurança e prontidão para lançamento

- Configurar domínio e HTTPS no proxy/plataforma; confirmar que cookies administrativos seguros funcionam sob HTTPS.
- Gerar uma senha administrativa forte, exclusiva e de produção, com pelo menos 12 caracteres, usando o gerenciador de secrets da plataforma. Não reutilizar a senha de `.env.example`.
- Confirmar backup automático e testar restauração em ambiente separado antes do lançamento.
- Definir monitoramento de disponibilidade, logs e alertas de falha de aplicação, banco e disco; evitar registrar senhas, tokens ou dados pessoais desnecessários.
- Revisar limites contra tentativas repetidas de login, excesso de pedidos e uploads abusivos; implementar controles adicionais apenas de forma compatível com a hospedagem e sem bloquear o fluxo legítimo.
- Publicar aviso de privacidade e definir retenção/acesso aos dados de nome, telefone e observações dos pedidos. Usar textos comerciais de pagamento, entrega e garantia somente após validação pelo responsável.

**Aceite:** acesso administrativo somente por HTTPS; secrets fora do repositório; backup restaurável; monitoramento e informações de privacidade definidos.

## Portão de lançamento

Só considerar pronto quando todos os itens abaixo forem verdadeiros:

- [ ] Provedor PostgreSQL e `DATABASE_URL` de produção configurados como secrets.
- [ ] Migrações PostgreSQL revisadas, versionadas e aplicadas primeiro em staging.
- [ ] Decisão sobre dados do SQLite documentada; se houver transferência, contagens e amostras foram validadas sem expor dados pessoais.
- [ ] Build, lint e smoke tests passaram no ambiente compatível com produção.
- [ ] HTTPS, domínio, armazenamento persistente, backups e restauração foram verificados.
- [ ] Senha administrativa exclusiva configurada; nenhuma credencial foi commitada.
- [ ] README e `.env.example` correspondem à configuração final.
- [ ] Responsável aprovou explicitamente a migração e a publicação em produção.
