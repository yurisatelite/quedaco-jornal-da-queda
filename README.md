# QUEDAÇO - Jornal da Queda

Terceiro módulo independente da família QUEDAÇO para Foundry VTT 13 e Skyfall RPG 1.0.1.

Ele acrescenta um botão de jornal à barra lateral. A pessoa Mestre cria edições de uma a três páginas, associa região, local, vendedor, disponibilidade e preço, e separa o texto público das notas secretas. Modelos marcáveis criam seções de notícia quente, procurado, rumores, comércio, avisos e presságio. A capa aceita seleção ou arraste de imagem e cada página pode ser exportada em PNG.

Jogadores leem edições disponíveis e podem comprar um exemplar para uma personagem controlada. A pessoa Mestre também pode oferecer a edição nas telas dos jogadores. A compra usa a carteira nativa do Skyfall, cria um Item `loot` no inventário e libera automaticamente um Journal na pasta `QUEDAÇO — Jornais dos Jogadores`. Se a entrega falhar, o item e o desconto são desfeitos.

## Desenvolvimento

```powershell
npm test
npm run package
npm run release -- -Public
```

O módulo não depende dos outros módulos QUEDAÇO e não altera seus dados.
