# Planejamento: mobile e painel do lojista

## Objetivo

Facilitar o uso do catálogo no celular e permitir que o único responsável pela loja gerencie pedidos e produtos sem depender de serviços externos.

## Etapa 1 — Prioridade: acesso seguro e simples

- Manter uma única senha definida em `ADMIN_PASSWORD`; não criar contas, papéis ou recuperação de senha.
- Trocar a senha enviada em cada requisição por uma sessão curta, em cookie `HttpOnly`, `SameSite=Strict` e `Secure` em produção.
- Disponibilizar entrada, verificação de sessão e saída no servidor; não guardar a senha no `localStorage` ou `sessionStorage`.
- Proteger no servidor todas as rotas administrativas e encerrar a sessão quando ela expirar.

**Concluído nesta rodada:** sessão assinada com validade de oito horas, logout e proteção das rotas administrativas.

## Etapa 2 — Prioridade: operação de produtos

- Exibir estoque ao lado de cada produto.
- Permitir incluir e editar nome, descrição, preço, categoria e quantidade disponível.
- Permitir manter um produto sem controle de estoque deixando o campo vazio.
- Manter a opção de desativar e excluir produtos.
- Validar a disponibilidade no servidor e reduzir o estoque dentro da mesma transação que registra o pedido.

**Concluído nesta rodada:** edição do produto e estoque opcional; pedidos reservam as quantidades no banco e não podem vender além do estoque.

## Etapa 3 — Prioridade: painel mobile-first

- Usar navegação inferior fixa no celular e manter as abas no topo em telas maiores.
- Reorganizar produtos e pedidos em cartões legíveis, com ações fáceis de tocar e sem rolagem horizontal.
- Dar destaque a ações frequentes — criar produto, ajustar estoque, atualizar status e abrir conversa do pedido.
- Preservar campos e botões com área de toque confortável, rótulos claros e suporte a teclado.

**Concluído nesta rodada:** navegação inferior no celular, cartões de produtos adaptáveis e controles maiores para estoque e edição.

## Próximas melhorias

1. Validar o painel em aparelhos e larguras reais, incluindo leitor de tela e teclado.
2. Adicionar busca e filtros de status/categoria quando o volume de pedidos e produtos justificar.
3. Considerar histórico de movimentações de estoque e exportação de vendas apenas se fizerem parte da rotina do lojista.

## Critérios de aceite

- A senha não aparece em armazenamento acessível por JavaScript nem é enviada em cabeçalho nas operações do painel.
- Após logout ou expiração, as rotas protegidas respondem `401`.
- O dono consegue cadastrar, editar, atualizar estoque, desativar e excluir produtos.
- Um pedido com quantidade superior ao estoque recebe conflito e não altera pedido nem estoque.
- O layout principal do painel funciona em viewport móvel sem exigir rolagem horizontal.
