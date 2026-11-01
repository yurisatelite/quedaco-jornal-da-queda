# Plano de ação — tipos de publicação do Jornal da Queda

## Decisão de produto

O Jornal da Queda deixa de ser apenas uma prensa de jornal tradicional. Ele
passa a ser a **biblioteca de publicações da campanha**, mantendo a estética de
jornal para as edições impressas, mas oferecendo formatos adequados para
dossiês, relatórios, missões e cartões de encontro.

Todas as publicações ficam sempre disponíveis para a pessoa Mestre no arquivo
privado. A Mestra escolhe, por publicação, se ela fica só privada, se aparece
para todos os jogadores, se é entregue a pessoas específicas ou se pode ser
comprada. A existência de uma publicação nunca a libera automaticamente.

As categorias e seus propósitos estão em
[CATEGORIAS-DE-PUBLICACOES.md](CATEGORIAS-DE-PUBLICACOES.md).

## Diagnóstico do módulo atual

O módulo já fornece uma boa base:

- `src/model.mjs` guarda edições com blocos, notas de GM e status;
- `src/store.mjs` mantém o arquivo da Mestra em um `JournalEntry` privado e
  publica um índice reduzido em `game.settings`;
- `src/journal.mjs` cria ou atualiza o Journal entregue ao comprador;
- `src/socket.mjs` oferece uma edição e efetua compra via GM;
- `src/app.mjs` já separa editor de leitura e possui modelos de edição;
- `publicEdition()` já remove `gmNotes`, verdades de rumor, facção,
  consequências, ganchos e prazos antes da distribuição.

Hoje, porém, uma edição não tem `kind` (tipo de publicação), modelo visual por
tipo, audiência específica, resumo seguro próprio para jogadores ou política de
entrega. `available` e `archived` são visíveis a qualquer jogador; `draft` e
`soldout` não são. Isso é insuficiente para um dossiê que deve poder ser
mostrado a um grupo, mas nunca vendido ou listado publicamente.

## Modelo de dados alvo

Manter `status` para o ciclo editorial atual e acrescentar campos independentes:

```js
{
  kind: "newspaper",           // categoria, nunca deduzida pelo título
  delivery: "purchase",        // private | show | grant | purchase
  playerSummary: "",           // texto seguro, opcional e explícito
  playerBlocks: [],             // cópia/seleção segura; nunca compartilha o rascunho bruto
  links: [                      // referências; não são expandidas sem permissão
    { kind: "actor", uuid: "Actor...", label: "" },
    { kind: "scene", uuid: "Scene...", label: "" },
    { kind: "quest", uuid: "JournalEntry...", label: "" }
  ],
  visibility: {                 // configuração da Mestra
    mode: "gm",                // gm | players | users | owners
    userIds: []
  }
}
```

Valores iniciais para edições antigas: `kind: "newspaper"`,
`delivery: "purchase"` se já estiver disponível para compra; caso contrário,
`delivery: "private"`, `visibility.mode: "gm"`. A normalização deve aceitar
documentos antigos sem regravar tudo de uma vez.

`status` não é permissão. A publicação pode estar `archived` e ainda ser
mostrada a jogadores; pode estar `available`, mas continuar privada até a
Mestra escolher `delivery: "show"` ou `"purchase"`.

## Tipos e políticas padrão

| Tipo | Visual inicial | Entrega inicial | Compra | Visibilidade sugerida |
| --- | --- | --- | --- | --- |
| Jornal tradicional | jornal em colunas | purchase | sim | jogadores após circular |
| Boletim / edital | aviso de uma página | show | não | jogadores |
| Cartaz de procurado | cartaz vertical | show | não | jogadores |
| Relatório de campo | memorando | private | não | GM; liberar versão sanitizada se desejar |
| Dossiê de ameaça | ficha de referência | private | não | GM; versão reduzida opcional |
| Informe de missão | briefing | grant | não | usuários/grupo designado |
| Registro de exploração | diário / mapa anotado | grant | não | descobridores ou jogadores |
| Bilhete / rumor | papel curto | grant | não | quem o encontrou ou todos |
| Nota de pesquisa | caderno | private | não | GM; liberar cópia opcional |
| Cartão de encontro | cartão técnico | private | nunca | somente GM |
| Registro de campanha | crônica / ata | show | não | jogadores, quando a Mestra decidir |

Nenhum tipo é automaticamente público. `purchase` só deve ser habilitado para
`newspaper` inicialmente; expandir venda para outro tipo exige decisão explícita
e teste de interface.

## Fases de implementação

### Fase 1 — Contrato e migração segura

1. Criar constantes `PUBLICATION_KINDS`, rótulos, políticas e validação em
   `src/model.mjs`.
2. Estender `normalizeEdition()` e `publicEdition()` com valores padrão
   retrocompatíveis. A cópia pública deve usar somente `playerSummary` e
   `playerBlocks` quando a publicação não for jornal tradicional.
3. Implementar testes de normalização, cópia sanitizada e migração de edição
   antiga. Nenhuma tela muda nesta fase.

**Pronto quando:** edição antiga continua legível; nenhum campo privado aparece
na cópia devolvida por `publicEdition()`.

### Fase 2 — Permissões e entrega

1. Criar uma função pura que decide se o usuário pode listar, ler ou comprar
   uma publicação com base em `visibility` e `delivery`.
2. Manter o índice de `game.settings` estritamente para publicações globais
   (`visibility.mode: "players"`). Um world setting é igual para todos os
   clientes e **não pode** conter títulos, IDs ou metadados de concessões
   individuais.
3. Alterar `src/journal.mjs` para criar Journal público ou concedido a IDs
   específicos. A lista do jogador será a união do índice global com os
   `JournalEntry` aos quais ele já tem permissão de Observador; a permissão do
   próprio Foundry é a fonte de verdade para concessões individuais.
4. Manter o socket GM-autoritativo para mostrar, conceder e vender.

**Pronto quando:** uma publicação privada nunca chega a `game.settings` público;
uma publicação concedida aparece apenas para o destinatário; uma compra continua
atômica e não muda permissões de outro Journal.

### Fase 3 — Editor da Mestra

1. Adicionar no topo do editor: tipo, forma de entrega e audiência.
2. Mostrar campos de preço/tiragem/vendedor somente quando `delivery` for
   `purchase`.
3. Criar seção “Versão dos jogadores”, com prévia sanitizada e indicador claro
   de que notas de GM não serão entregues.
4. Acrescentar ações explícitas: **Manter privada**, **Mostrar a jogadores**,
   **Conceder a…**, **Oferecer à venda**. Não transformar “Salvar” em publicação.
5. Filtrar modelos de blocos pelo `kind`; o tipo pode ser trocado somente antes
   de qualquer entrega, ou mediante confirmação que preserve a versão já dada.

**Pronto quando:** a Mestra enxerga o estado e a audiência de cada publicação
sem depender de cor ou de um texto ambíguo.

### Fase 4 — Renderização por formato

Começar com quatro layouts reutilizando a identidade visual atual:

1. `newspaper`: layout de jornal existente.
2. `bulletin` e `wanted`: folha curta, título forte, região/local e assinatura.
3. `field-report`, `bestiary-dossier`, `research-note`: memorando/dossiê com
   cabeçalho, metadados e seções — sem colunas de jornal.
4. `mission-brief`, `exploration-log`, `rumor-sheet`, `campaign-record`:
   formulário de briefing, diário, bilhete ou crônica.

`encounter-card` fica como cartão técnico compacto, com selo **Somente Mestra**
na própria renderização; não deve usar o botão de oferta nem o fluxo de compra.

**Pronto quando:** o layout não é escolhido por CSS frágil ou pelo texto do
título, e cada tipo se mantém legível em janelas pequenas.

### Fase 5 — Integrações opcionais

1. Referências opcionais para `Actor`, `Scene`, missão e região/localidade.
2. Consulta ao QUEDAÇO principal apenas quando ele estiver ativo; manter
   fallback local para geografia.
3. Integração opcional com Calendário para `calendarDate`, sem dependência no
   `module.json`.
4. Integração futura com o Criador de Monstros: um dossiê pode apontar para um
   `Actor.npc`, mas nunca copiar estatísticas secretas para a versão pública.

## Testes obrigatórios

- `npm test` e `npm run package` antes de cada commit.
- Testes unitários para cada `kind`, valores inválidos e migração dos dados
  anteriores.
- Testes de autorização: GM, jogador comum, destinatário e não destinatário.
- Teste de regressão de compra: apenas jornal vendável cria Item `loot`, desconta
  trocados e concede o Journal.
- Conferência dentro do Foundry: editor, troca de tipo, botão de mostrar,
  concessão específica, compra, recarga e retorno à edição arquivada.

## Ordem recomendada

Implementar Fases 1 e 2 juntas em uma atualização pequena; depois Fase 3; por
fim Fase 4 com quatro layouts iniciais. Fase 5 pode esperar os outros módulos.
Isso mantém o Jornal utilizável durante a expansão e evita transformar uma
mudança visual em uma mudança silenciosa de permissão.
