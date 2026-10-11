# Arquitetura

- `src/model.mjs`: esquema puro, normalização, visibilidade e edição de exemplo.
- `src/store.mjs`: arquivo privado em `JournalEntry` sem permissão para jogadores e índice público em `game.settings`; somente Mestre grava.
- `src/purchase.mjs`: carteira Skyfall e entrega transacional de Item `loot`.
- `src/app.mjs`: leitor vertical e editor `ApplicationV2`.
- `src/sidebar.mjs`: botão próprio na barra lateral do Foundry.
- `src/main.mjs`: registro, API pública e sincronização da janela.

O módulo segue o empacotamento dos módulos QUEDAÇO existentes, usa a economia nativa `system.currency.{t,p,k}` e não importa código dos outros módulos. Isso mantém os três instaláveis e atualizáveis de forma independente.
