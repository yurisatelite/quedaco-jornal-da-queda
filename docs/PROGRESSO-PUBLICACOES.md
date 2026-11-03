# Biblioteca de publicações — 01/11/2026

## v0.4.0: Fases 1 e 2

Implementado o primeiro lote recomendado em PLANO-CATEGORIAS-DE-PUBLICACOES.md. O editor por tipo, os quatro novos formatos e as integrações futuras continuam nas Fases 3, 4 e 5.

- Contrato com 11 tipos, políticas sugeridas, `delivery`, `visibility`, `playerSummary`, `playerBlocks` e `links`.
- Normalização dos dados anteriores em memória, sem regravar o arquivo privado em massa. Jornal antigo disponível preserva `delivery: purchase`, mas a audiência inicial é GM. `status` não concede acesso.
- Dados privados nunca entram no índice global. O setting começa vazio e só contém audiências `players` com entrega `show` ou `purchase`.
- Cópia pública usa lista explícita de campos. Documentos que não são jornais usam apenas resumo e blocos escritos para jogadores. Links são omitidos até haver integração com checagem de permissão.
- Cartões de encontro não têm cópia pública, oferta, entrega ou compra.
- Concessões criam Journals com ownership explícito e snapshot sanitizado. A lista dos jogadores combina o índice global com os Journals para os quais o Foundry confirma Observer; destinatários não são enviados a um setting global.
- Os exemplares já entregues não são reescritos ao comprar novamente ou editar o arquivo privado. Novas audiências recebem documentos separados. Alterar a entrega para privada retira do índice; não apaga ou revoga automaticamente exemplares já recebidos. Revogação explícita de Observer é refletida pela lista.
- Compra executada por GM verifica comprador, proprietário da personagem, audiência, tipo, entrega, saldo e disponibilidade. Desconto/Item são revertidos quando a entrega falha. Não há escrita no Item depois da concessão; isso evita uma falha tardia que concederia o Journal sem pagamento. Compras simultâneas da mesma personagem são serializadas.
- Duplicar uma edição gera rascunho privado. Salvar não publica. A ação já existente “Oferecer aos jogadores” é a liberação explícita da venda de jornais disponíveis.

## API QUEDAÇO

ID: `quedaco-jornal-da-queda`. `family: quedaco`, `contractVersion: 1`.

Capabilities: `publicationLibrary`, `grantPublication`, `newspaper`, `createEdition`, `purchaseEdition`, `playerJournalDelivery`.

Métodos: `open()`, `getStatus()`, `getAccessibleJournals()`, `releasePublication(id, options)`. Este último exige GM dentro do módulo. `options` aceita `delivery`, `visibility: {mode, userIds}` e `actorId` para audiência de donos. Somente registros já salvos podem ser liberados. O tipo não é inferido de título.

Integração opcional mantida com `quedaco` para geografia (`worldCatalog`/`getWorldCatalog`); sem ele, catálogo local. Calendário e Criador de Monstros continuam pendentes. Toda a biblioteca e a compra funcionam sem outros módulos QUEDAÇO.

## Verificação e limites

Testes Node usam exclusivamente dados falsos. Cobrem os 11 tipos, migração, valores inválidos, sanitização, audiência global, destinatário/não destinatário, dono, GM, concessão, revogação e recarga, compra e reversões, concorrência e preservação de Journals de outras publicações.

Validação local: 43 testes passando. Executados `npm test`, `npm run lint:css`, `npm run package` e `git diff --check`. Gerar prévias de leitura e editor com as ferramentas locais.

Pendentes dentro do Foundry 13: testar com dois clientes a atualização do índice e oferta por socket, compra real com carteira Skyfall, permissões Observer, recarga/revogação e retorno a uma publicação arquivada. Journals comprados em versões antigas continuam acessíveis nativamente; como não possuem snapshot em flags, não são inseridos retroativamente na nova lista de concessões.

## Próximos lotes

- Fase 3: seletor de tipo/entrega/audiência, versão dos jogadores e ações explícitas no editor. Concessão por usuário/dono já disponível na API, ainda sem esses novos controles de tela.
- Fase 4: layouts de boletim/cartaz, dossiê, registro e cartão técnico.
- Fase 5: referências com permissão, Calendário e Criador de Monstros.


## Atualização 03/11/2026 — v0.5.0

Fases 3 e 4 implementadas na oficina visual em seis etapas, com onze modelos e layouts por formato. A Fase 5 já inclui seleção de dias e registro de compra por API do Calendário; referências especializadas e Criador de Monstros permanecem futuras. Ver `CRIADOR-VISUAL.md` para escopo e verificações no Foundry.
