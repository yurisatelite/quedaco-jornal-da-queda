# Revisão da interface — 15/10/2026

Compatibilidade preservada: Foundry VTT 13 (manifesto 0.3.6).

## Causas e correções

- CSS incremental repetia seletores de folha, cabeçalho, assinatura e cards. Consolidado por componente, sem `!important`, com escopo `.qd-app`.
- A grade da lista podia distribuir altura livre entre poucos cards. Lista convertida para flex com itens que não crescem.
- Campos, fieldsets e filhos de flex/grid herdavam dimensões mínimas e alturas do Foundry. Dimensões locais, `min-width: 0`, linhas automáticas e colunas `minmax(0, 1fr)` evitam o vazamento.
- Responsividade dependia da largura do navegador. Container queries respondem à largura da janela e da área de leitura/edição.
- Ações grandes competiam com informações na barra fixa. A barra de leitura participa do fluxo e quebra linhas; o rodapé de edição fica acessível na base da rolagem.
- Cabeçalho do jornal podia quebrar o nome em letras. Tamanho tipográfico e grade se adaptam ao espaço disponível.
- Captura de cliques alcançava controles do cabeçalho nativo e renderizava novamente ao fechar. Delegação restrita a `.qd-shell`.
- Confirmação usa `foundry.applications.api.DialogV2`, com título em `window.title` e fechamento tratado como cancelamento. FilePicker usa namespace compatível com v13.

## Verificação reproduzível

`npm run preview` gera `.local/preview.html` com leitura, lista de edições, assinatura e textos longos. `node tools/preview.mjs --editor` gera `.local/preview-editor.html` com formulário completo. Dados são falsos; não conecta ao servidor nem altera documentos. A prévia inclui dimensões padrão de controles para expor conflitos de altura/largura.

Não há infraestrutura de testes visuais automatizados no projeto. O navegador da ferramenta bloqueou a abertura do arquivo local; não houve validação por screenshot nesta rodada.

No Foundry, conferir leitura e edição em 1120×860, 800×700, 600×650 e 360×600: lista sem sobreposição; textos longos quebrando; campos contidos; rodapé acessível; assinatura à direita; título inteiro; rolagem independente; cabeçalho nativo fecha e minimiza sem reabrir. Conferir exportação PNG, diálogos e integração com os temas/módulos da mesa. Ícones dependem do Font Awesome fornecido pelo Foundry.

Testes de Node incluem regressão da propagação de cliques nativos, fechamento pelo conteúdo e seleção de edição. Testes existentes, lint CSS, pacote e diff devem passar antes da entrega.
