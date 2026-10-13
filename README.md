# QUEDAÇO - Jornal da Queda

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
