# Categorias de publicações — Jornal da Queda

Nem toda informação da campanha deve parecer uma edição impressa de jornal.
O módulo pode manter a estética de papel quando fizer sentido, mas precisa
separar **formato ficcional** de **permissão e função de jogo**.

O roteiro técnico para implantar estas categorias está em
[PLANO-CATEGORIAS-DE-PUBLICACOES.md](PLANO-CATEGORIAS-DE-PUBLICACOES.md).

## Categorias a cadastrar

| ID sugerido | Nome visível | Formato | Público | Uso |
| --- | --- | --- | --- |
| `newspaper` | Jornal tradicional | edição impressa | jogadores, por compra/liberação | notícias, fofocas, anúncios, coluna social |
| `bulletin` | Boletim / edital | aviso curto | jogadores | avisos de cidade, Senado, rota, preço ou perigo público |
| `wanted` | Cartaz de procurado | cartaz de uma página | jogadores | alvo, recompensa, última localização e gancho |
| `field-report` | Relatório de campo | dossiê conciso | GM; jogadores se liberado | relatório DIPS/COPA, testemunho e pistas verificadas |
| `bestiary-dossier` | Dossiê de ameaça | ficha de referência | GM; versão editada opcional aos jogadores | aparência, comportamento, habitat, pistas e risco de criatura |
| `mission-brief` | Informe de missão | briefing | grupo designado | objetivo, contato, recompensa, prazo e riscos conhecidos |
| `exploration-log` | Registro de exploração | diário / mapa anotado | grupo que descobriu | hexes, localidades, rotas e descobertas |
| `rumor-sheet` | Bilhete / rumor | fragmento curto | jogadores quando encontrado | boatos, recados e informação de confiabilidade variável |
| `research-note` | Nota de pesquisa | caderno / relatório | GM; jogadores se compartilhado | estudos arcanos, flores, venenos, pesca e enigmas |
| `encounter-card` | Cartão de encontro | ficha técnica | somente GM | composição, ameaça, mapa de combate, gatilhos e ajustes |
| `campaign-record` | Registro de campanha | ata / crônica | conforme a campanha | acontecimentos datados, consequências e decisões dos jogadores |

## Como usar com inimigos

A ficha completa de ameaça fica no Foundry como `Actor.npc` e seu cartão de
preparo fica no QUEDAÇO. No Jornal, use somente o tipo adequado:

- `bestiary-dossier` para a ficha de campo da Mestra;
- `field-report` quando DIPS, COPA ou um pesquisador escreve sobre o perigo;
- `newspaper` ou `bulletin` para o que a população realmente poderia ler;
- `encounter-card` para a preparação de combate, sempre privada da Mestra.

Uma mesma ameaça pode ter os quatro documentos, com informações diferentes.
Por exemplo: a Mestra possui o dossiê integral; os jogadores encontram um
boletim sobre desaparecimentos; depois compram uma edição de jornal com uma
versão incompleta; e o encontro usa um cartão técnico privado.

## Campos comuns recomendados

Todo registro deve ter `id`, `kind`, `title`, `status`, `regionId`, `placeId`,
`tags`, `createdAt`, `updatedAt`, `sourceModule`, `visibility` e `links`.

Campos específicos úteis: `actorUuid` para ameaça/NPC, `sceneUuid` para mapa,
`questUuid` para missão, `reliability` para rumor, `calendarDate` para o futuro
módulo de calendário e `playerSummary` para a versão que pode ser mostrada.

`kind` não deve mudar uma publicação já distribuída: se uma notícia evoluir para
um relatório, crie o relatório e relacione os dois por `links`. Isso preserva o
que os jogadores realmente receberam.

## Regra de permissões

O armazenamento de GM pode ter notas privadas, mas o documento liberado ao
jogador deve ser uma cópia sanitizada: sem `gmNotes`, verdades de rumor, táticas
de combate, estatísticas ocultas ou links privados. `encounter-card` nunca é
oferecido para compra nem entregue a jogadores.
