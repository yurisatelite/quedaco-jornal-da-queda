# Arquitetura

- `src/model.mjs`: esquema puro, normalização, visibilidade e edição de exemplo.
- `src/store.mjs`: arquivo privado em `JournalEntry` sem permissão para jogadores e índice público em `game.settings`; somente Mestre grava.
- `src/purchase.mjs`: carteira Skyfall e entrega transacional de Item `loot`.
- `src/journal.mjs`: Journal público por edição e permissões para donos da personagem compradora.
- `src/socket.mjs`: oferta nas telas dos jogadores e execução da compra pela pessoa Mestre conectada.
- `src/app.mjs`: leitor vertical e editor `ApplicationV2`.
- `src/sidebar.mjs`: botão próprio na barra lateral do Foundry.
- `src/main.mjs`: registro, API pública e sincronização da janela.

O módulo segue o empacotamento dos módulos QUEDAÇO existentes, usa a economia nativa `system.currency.{t,p,k}` e não importa código dos outros módulos. Isso mantém os três instaláveis e atualizáveis de forma independente.
