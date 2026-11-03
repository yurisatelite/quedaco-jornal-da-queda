# Criador visual — v0.5.0 — 03/11/2026

O formulário foi substituído por uma oficina em seis etapas, com navegação livre: Formato, Lugar e data, Pessoas, Redação, Capa e prévia, Entrega. Campos fora da etapa são preservados no rascunho. Alterações do mundo não substituem o formulário aberto.

## Entregue

- Onze cartões de formato e onze modelos preenchidos, privados até liberação explícita. Modelo pode substituir o conteúdo do rascunho; registros entregues ou publicados não podem trocar de formato — precisam ser duplicados.
- Apresentações de jornal, boletim/cartaz, memorando/dossiê, registro e cartão técnico. Este último permanece exclusivo da Mestra.
- Galerias de escritor/vendedor com retratos, pesquisa e filtro da região ou todas. Só entram fichas Skyfall `character` que não têm jogador proprietário nem flag de monstro/ameaça; fichas de ameaça `npc` nunca entram. Nenhum Actor é excluído ou alterado.
- Montador local em formato de conversa. Organiza as frases digitadas em manchete, resumo e matérias; não usa IA externa, não cria fatos confirmados e não envia texto a terceiros. O resultado deve ser revisado. A versão para jogadores de documentos que não são jornais exige seleção explícita.
- Capas SVG originais incluídas para as dez regiões do catálogo local e uma genérica. Região personalizada usa a genérica. Troca de imagem e arraste continuam disponíveis.
- Editor de número/ciclo e data narrativa com seletor de dias do Calendário. A navegação entre ciclos e a escolha do dia não alteram o tempo da campanha.
- Apresentação modal do vendedor aos jogadores, retrato, botão grande de compra, fundo desfocado e moeda de prata (Trocado) ou ouro (Pila). Exige vendedor civil escolhido, jornal disponível e quantidade positiva. Oferta usa só o ID no socket; conteúdo vem do índice autorizado. Oferta que chegar antes do índice aguarda sua atualização.
- Compra preserva desconto e entrega atômicos já existentes. Registro no Calendário é posterior: falha de integração não transforma compra concluída em estorno sem revogação. O jogador recebe aviso caso a anotação fique pendente.
- Item guarda o dia narrativo real da compra e a linha do tempo. A data de publicação pode ser outra. O registro de compra no Calendário referencia o Journal e é compartilhado apenas com os donos da personagem compradora.

## Calendário: integração verificada

Fonte consultada: `yurisatelite/opath-calendar`, ID atual `quedaco-calendario`. Nenhum arquivo do outro módulo foi importado ou alterado. Usa apenas a API pública de família `quedaco`, contrato 1: `getCurrentDate`, `dateToWorldTime`, `worldTimeToDate`, `getTimelines` e `linkJournalToDay`. O método de vínculo recebe `absoluteDay`, `timelineId`, `visibility: shared` e `sharedWith`. Sem API ativa, data pode ser digitada e compra/Journal continuam funcionando, mas não se inventa uma data narrativa para o calendário.

## Verificações

- Testes Node com dados falsos: tipos/modelos, todos os passos e formatos, galeria sem ameaças, capas existentes, montador privado, preservação de dados entre etapas, seleção de dias sem mudança do tempo, vínculo com destinatários, compra no dia atual e falha do Calendário sem estorno indevido.
- `npm test`, `npm run lint:css`, `npm run package`, `git diff --check` e geração das prévias de leitura/edição.
- `npm run preview` gera a leitura; `node tools/preview.mjs --editor` gera a oficina. `--step=0` a `--step=5` gera páginas para cada etapa. `--kind=bulletin` (ou outro ID de formato) gera a prévia do modelo. Prévia local serve para conferir aparência; ações de escrita, integração e compra são do Foundry.

Pendente: conferir no Foundry 13 com duas sessões o modal/backdrop, Font Awesome, retratos com permissões dos jogadores, clique nos dias reais, compartilhamento do registro no diário e compra com o sistema Skyfall. Não houve operação no mundo oficial nesta rodada nem validação visual por screenshot.

## Protocolo QUEDAÇO

ID `quedaco-jornal-da-queda`, `contractVersion: 1`. Capabilities preservadas: `publicationLibrary`, `grantPublication`, `newspaper`, `createEdition`, `purchaseEdition`, `playerJournalDelivery`. Métodos preservados: `open`, `getStatus`, `getAccessibleJournals`, `releasePublication` (exige GM).

Integrações opcionais: cadastro geográfico do principal e Calendário. O editor, os modelos, o arquivo, as galerias locais e a compra funcionam sem outros módulos QUEDAÇO. Permanecem futuras as referências especializadas e a integração com Criador de Monstros da Fase 5.
