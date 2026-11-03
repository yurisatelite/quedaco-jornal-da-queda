# QUEDAÇO - Jornal da Queda

Na v0.5.0, a edição usa um criador visual de seis etapas, com modelos preenchidos por formato, galerias de NPCs civis, conversa com montador local, capas regionais, calendário opcional e apresentação do vendedor aos jogadores. Consulte [o guia e as limitações de validação](docs/CRIADOR-VISUAL.md).

Terceiro módulo independente da família QUEDAÇO para Foundry VTT 13 e Skyfall RPG 1.0.1.

Ele acrescenta um botão de jornal à barra lateral. A pessoa Mestre cria edições de uma a três páginas, associa região Geopaf, localidade, NPC escritor opcional, vendedor, tiragem e preço, e separa o texto público das notas secretas. Regiões e localidades ficam disponíveis em listas; escritor e vendedor usam os NPCs já existentes na mesa, priorizando a região escolhida. Há modelos para Avisos & Ofícios, Notícias locais, Presságio e Comércio, além dos destaques de notícia quente, procurado e rumores. A capa aceita seleção ou arraste de imagem e cada página pode ser exportada em PNG.

Jogadores leem edições disponíveis e podem comprar um exemplar para uma personagem controlada. A pessoa Mestre também pode oferecer a edição nas telas dos jogadores. A compra usa a carteira nativa do Skyfall, cria um Item `loot` no inventário e libera automaticamente um Journal na pasta `QUEDAÇO — Jornais dos Jogadores`. Se a entrega falhar, o item e o desconto são desfeitos.

## Desenvolvimento

```powershell
npm test
npm run package
npm run release -- -Public
```

Rascunhos, edições salvas e seus bastidores ficam no Journal privado `QUEDAÇO — Arquivo da Mestra`, dentro da pasta `QUEDAÇO — Jornal da Queda`. O módulo não depende dos outros módulos QUEDAÇO e não altera seus dados.

## Protocolo de integração QUEDAÇO

No `ready`, o módulo publica em `game.modules.get('quedaco-jornal-da-queda').api` um descriptor com `family: 'quedaco'` e `contractVersion: 1`. As capabilities são `publicationLibrary`, `grantPublication`, `newspaper`, `createEdition`, `purchaseEdition` e `playerJournalDelivery`. Os métodos públicos são `open()`, `getStatus()`, `getAccessibleJournals()` e `releasePublication(id, options)`. O status retorna somente `{ ready: true }`; a liberação exige GM.

O módulo reconhece opcionalmente o catálogo geográfico do QUEDAÇO principal e funciona também sozinho. Ele emite `quedaco:register` para que o QUEDAÇO principal ou outro módulo da família possa descobrir o descriptor quando estiver ativo. Todas as funções continuam disponíveis sozinho; nenhuma API pública expõe dados privados ou documentos do mundo.


## Geografia central (0.3.6)

Com QUEDAÇO 0.18.0 ativo, usa getWorldCatalog para os seletores. Novas gravações guardam IDs de região/local junto aos nomes; edições antigas continuam legíveis e não são regravadas em massa. Sem a API, conserva o catálogo local. Evento de atualização não substitui o formulário aberto.

## Biblioteca de publicações (0.4.0 — Fases 1 e 2)

O contrato reconhece 11 categorias e separa o estado editorial da audiência. Salvar ou duplicar não libera uma publicação. A ação “Oferecer aos jogadores” libera explicitamente a venda de um jornal disponível; somente jornais podem ser vendidos. Edições antigas começam com audiência GM, sem perder seus dados; exemplares entregues continuam no Foundry.

O índice global contém apenas publicações liberadas para todos. Concessões individuais usam Journals com permissão Observer, com cópias sanitizadas e sem divulgar destinatários no setting. A API acrescenta `releasePublication(id, options)` (somente GM) e as capabilities `publicationLibrary` e `grantPublication`. O editor por categoria e os novos layouts serão implementados nas Fases 3 e 4.

Veja [o progresso e os testes](docs/PROGRESSO-PUBLICACOES.md) para o contrato, uso da API e verificações pendentes no Foundry.
