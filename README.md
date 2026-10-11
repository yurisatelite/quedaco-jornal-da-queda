# QUEDAÇO - Jornal da Queda

Terceiro módulo independente da família QUEDAÇO para Foundry VTT 13 e Skyfall RPG 1.0.1.

Ele acrescenta um botão de jornal à barra lateral. A pessoa Mestre cria edições de uma a três páginas, associa região, local, vendedor, disponibilidade e preço, e separa o texto público das notas secretas. Jogadores leem edições disponíveis e podem comprar um exemplar para uma personagem controlada; a compra usa a carteira nativa do Skyfall e cria um Item `loot` no inventário.

## Desenvolvimento

```powershell
npm test
npm run package
npm run release -- -Public
```

O módulo não depende dos outros módulos QUEDAÇO e não altera seus dados.
