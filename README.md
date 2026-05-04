# Auto Battler Roguelike Card Game (Protótipo)

Protótipo web de um jogo auto battler roguelike com mecânicas de card game. O jogador monta um time, evolui heróis com upgrades em cartas e enfrenta waves crescentes de inimigos.

## Stack

- HTML5
- CSS3 (modular, sem frameworks)
- JavaScript puro com módulos ES6 (sem dependências externas)

## Como rodar

Como o projeto usa módulos ES6, é necessário servir os arquivos por um servidor HTTP (não basta abrir o `index.html` direto pelo `file://`).

Opções rápidas:

```bash
# Python 3
python -m http.server 8000

# Node (npx serve)
npx serve .
```

Depois acesse `http://localhost:8000` no navegador.

## Estrutura

```
/
├── index.html
├── styles/         # CSS modular (uma responsabilidade por arquivo)
└── scripts/        # Módulos ES6
    ├── main.js     # Entry point
    ├── constants.js  # Todos os números de balanceamento
    ├── state.js    # Estado global (única fonte de verdade)
    ├── combat.js   # Loop de batalha (não toca no DOM)
    ├── ui.js       # Renderização (lê o estado)
    └── ...
```
