# AutoBattle

Auto-battler roguelike com mecânicas de card game. Posicione heróis, junte cartas, fortaleça seu time e sobreviva ao maior número possível de waves.

Protótipo web feito em HTML, CSS e JavaScript puros — sem frameworks, sem build, sem dependências.

---

## O Jogo

Você comanda um time de heróis que lutam **automaticamente** contra ondas crescentes de inimigos. Antes da batalha (e nas pausas entre waves), use cartas para:

- Posicionar novos heróis no campo
- Aplicar upgrades (Vida, Dano, Velocidade de Ataque, Velocidade de Movimento)
- Conceder habilidades especiais
- Fundir cartas iguais para criar versões mais fortes (merge)

Cada inimigo abatido solta **orbs douradas de XP** que você precisa coletar movendo o cursor. Subir de nível ou completar uma wave abre um **modal de loot** com 3 cartas — com até 3 rerolls por jogo.

Quando todos os heróis morrem, é Game Over. Tente alcançar a wave mais alta.

---

## Como Jogar

### Setup inicial

Você começa com 3 cartas na mão — uma delas é sempre uma carta de **Herói**. Arraste essa carta até qualquer ponto do campo de batalha para posicionar seu primeiro herói.

Quando houver pelo menos 1 herói no campo, o botão **Iniciar Batalha** fica disponível.

Use o tempo de setup pra aplicar upgrades nos heróis também — arraste cartas como `+Vida` ou `+Dano` em cima do herói (no campo ou no painel da party).

### Batalha

A batalha acontece sozinha:

- Heróis perseguem o inimigo mais próximo e atacam quando entram no alcance
- Inimigos avançam do topo do campo, cada tipo com seu comportamento
- Unidades não se sobrepõem — uma colisão soft-push separa elas naturalmente

A wave acaba quando todos os inimigos morrem. Há uma pausa de 2 segundos antes da próxima wave começar — esse é seu tempo pra coletar orbs restantes e ajustar a party.

### Drag-and-drop

Toda interação com cartas é via arrastar e soltar:

| Carta                | Solta em                           | Resultado                                                              |
| -------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| Herói                | Campo                              | Posiciona um novo aliado na coordenada do cursor                       |
| Upgrade comum        | Herói (campo ou painel)            | Aplica o bônus permanentemente                                         |
| Habilidade           | Herói                              | Concede a habilidade (não pode dar a mesma duas vezes pro mesmo herói) |
| Qualquer carta comum | Outra carta igual e de mesmo nível | Merge — cria carta upada                                               |

Soltar fora de um alvo válido faz a carta voltar para a mão com animação.

### Coleta de XP

Cada inimigo morto solta de 1 a 8 **orbs douradas**, dependendo do XP do kill. As orbs:

- Explodem do ponto da morte com velocidade aleatória
- Desaceleram com fricção
- A partir de **80px** do cursor, são atraídas magneticamente
- Quanto mais perto do cursor, mais rápido elas voam (aceleração progressiva)
- A **18px**, são coletadas e somam XP

Mova o cursor sobre o campo pra puxar as orbs. **Atenção**: orbs não coletadas até o início da próxima wave somem e o XP é perdido.

### Loot e level up

Quando você sobe de nível **ou** completa uma wave, o jogo pausa e abre o modal de loot com 3 cartas:

- **Aceitar** → as 3 cartas voam direto pra mão
- **Rerolar** → sorteia 3 cartas novas (limite de **3 rerolls por jogo inteiro**)

Reaproveite o reroll pra escapar de combinações ruins, mas guarde alguns pra finais de jogo onde o pool importa mais.

---

## Cartas

### Tipos disponíveis

| Tipo         | Cor da borda      | Efeito (nível 0)                       |
| ------------ | ----------------- | -------------------------------------- |
| Herói        | Verde escuro      | Coloca um novo aliado no campo         |
| +Vida        | Azul              | +25 HP                                 |
| +Dano        | Vermelho          | +8 ATK                                 |
| +Vel. Ataque | Laranja           | +0.3 ataques/s                         |
| +Vel.        | Ciano             | +20 de velocidade de movimento         |
| Habilidade   | Cor da habilidade | Concede a habilidade especial sorteada |

A distribuição no pool é: Herói 23%, Vida 18%, Dano 18%, AtkSpd 17%, MoveSpd 16%, Habilidade 8%.

### Habilidades especiais

São 5 no total. Cada uma muda o herói **visualmente** (cor da unidade no campo) e o comportamento em combate. Um herói com múltiplas habilidades fica com **cor mista** (média RGB).

| Habilidade         | Cor             | Efeito                                          |
| ------------------ | --------------- | ----------------------------------------------- |
| Ataque Duplo       | Azul            | Dispara 2x por ataque (200ms entre os disparos) |
| Ataque à Distância | Amarelo         | Range aumenta para 150px                        |
| Splash             | Roxo            | Dano em raio de 60px do alvo                    |
| Vampirismo         | Vermelho escuro | 30% do dano causado vira HP                     |
| Velocidade         | Ciano           | +25 de velocidade de movimento                  |

Cada herói só pode ter cada habilidade **uma vez**. Se tentar aplicar uma que já tem, a carta volta pra mão.

### Card merge

Junte duas cartas iguais para criar uma versão mais forte:

- Regra: **mesmo tipo + mesmo nível** podem ser mergeadas
- Habilidades **não** são mergeáveis (são atômicas por design)
- Cada nível **dobra** o efeito da carta — sem limite

| Carta    | Efeito  | Badge       |
| -------- | ------- | ----------- |
| +Dano    | +8 ATK  | (sem badge) |
| +Dano+   | +16 ATK | `+`         |
| +Dano++  | +32 ATK | `++`        |
| +Dano+++ | +64 ATK | `+++`       |
| ...      | ...     | ...         |

Heróis também são mergeáveis — Hero+ nasce com **stats base × 2**, Hero++ com × 4, e assim por diante.

Para mergear, arraste uma carta sobre outra carta igual na própria mão. Cartas mergeadas mostram um badge de `+` no canto superior direito.

---

## Inimigos

| Tipo   | Aparece a partir de | Comportamento                              |
| ------ | ------------------- | ------------------------------------------ |
| Básico | Wave 1              | Vai no aliado mais próximo                 |
| Tank   | Wave 3              | Mais HP, prioriza aliado com mais HP       |
| Rápido | Wave 5              | Veloz, prioriza aliado com menos HP        |
| Ranged | Wave 7              | Mantém distância (~120px) e ataca de longe |

Cada wave aumenta os atributos dos inimigos em **18%** e a quantidade segue `2 + floor(wave * 1.2)`.

---

## Painel da party

À esquerda do leque de cartas fica o painel dos seus heróis ativos. Cada herói mostra:

- **Nome** (Herói 1, Herói 2, ...)
- **Mini-cartas** dos upgrades aplicados, com badge `xN` quando há mais de um
- **HP** atual / HP máximo

Cartas mergeadas valem como `2^nível` no contador. Por exemplo, aplicar um `+Vida++` num herói faz a mini-carta de Vida mostrar `x4`.

Habilidades especiais aparecem como mini-cartas separadas (sem badge — são únicas).

---

## Dicas

- Não comece a batalha com 1 herói só. Use o setup pra colocar 2 ou 3.
- Coletar XP exige movimento do cursor — não fique parado durante a batalha.
- Mergeie antes de aplicar. Um `+Dano++` é melhor que 4 `+Dano` separados pelo escalonamento de bônus.
- **Vampirismo + Vida** transforma um herói em tanque quase imortal.
- **Splash + Ataque Duplo** limpa a wave inteira (mas o herói fica cinza pela mistura de cores).
- Reroll é limitado — guarde para finais de jogo, onde o pool importa mais.
- Posicione heróis no fundo do campo se quiser dar tempo de eles ganharem buffs antes de engajar.

---

## Stack técnica

- **HTML5** — estrutura mínima
- **CSS3 modular** — um arquivo por componente, variáveis globais em `base.css`
- **JavaScript puro com módulos ES6** — sem frameworks
- **Web Audio API** — todos os SFX são sintetizados em runtime, sem assets de áudio
- **Press Start 2P** via Google Fonts (única dependência externa)

Sem bundler, sem npm install, sem step de build.

---

## Estrutura do projeto

```
/
├── index.html
├── styles/                    # CSS modular
│   ├── reset.css
│   ├── base.css               # variáveis globais (cores, tamanhos, font)
│   ├── layout.css             # estrutura macro
│   ├── game-display.css       # campo de batalha
│   ├── unit.css               # heróis e inimigos
│   ├── xp-bar.css             # barra e level do jogador
│   ├── party-panel.css        # painel lateral com mini-cartas
│   ├── hand.css               # leque de cartas
│   ├── card.css               # estilos das cartas
│   ├── hud.css                # wave / score / status
│   ├── modal.css              # level up, loot, game over
│   └── animations.css         # keyframes globais
├── scripts/                   # módulos ES6
│   ├── main.js                # entry point e orquestração
│   ├── constants.js           # todos os números de balanceamento
│   ├── state.js               # estado global (única fonte de verdade)
│   ├── combat.js              # loop de batalha (não toca no DOM)
│   ├── units.js               # criação e upgrades de unidades
│   ├── cards.js               # pool de cartas e sorteio
│   ├── xp.js                  # XP do jogador e level up
│   ├── unit-xp.js             # legado (XP por herói foi removido)
│   ├── waves.js               # geração e escalada de waves
│   ├── effects.js             # texto flutuante e helpers visuais
│   ├── audio.js               # SFX sintetizado via Web Audio API
│   ├── drag.js                # sistema de drag-and-drop genérico
│   └── ui.js                  # renderização e UI
└── README.md
```

---

## Princípios de arquitetura

- **`state.js` é a única fonte de verdade**. Nenhum outro módulo mantém dados próprios.
- **`combat.js` nunca toca no DOM**. Apenas atualiza o estado e empurra eventos para `state.pendingEvents`.
- **`ui.js` lê o estado e atualiza o DOM**. É a única camada com acesso direto à árvore.
- Loop principal com `requestAnimationFrame` + delta time independente de FPS.
- Todos os números de balanceamento centralizados em `constants.js` — nada de magic numbers espalhados.
- Renderização granular: HUD/party/XP atualizados por frame durante batalha, hand/grid só sob mudança de estado.

---

## Tunando o balanceamento

Quer ajustar o feel? Tudo está em `scripts/constants.js`:

| Bloco                        | Controla                                                                  |
| ---------------------------- | ------------------------------------------------------------------------- |
| `GAME`                       | Largura/altura do campo, pausa entre waves, tamanho da mão inicial        |
| `PLAYER_UNIT`                | Stats base de qualquer herói novo                                         |
| `ENEMY_BASE` + `ENEMY_TYPES` | Stats e multiplicadores de cada tipo de inimigo                           |
| `WAVE`                       | Quantidade de inimigos por wave e crescimento                             |
| `XP`                         | XP por kill e bônus de wave                                               |
| `XP_ORB`                     | Velocidade de explosão, fricção, raio do magnet, raio de pickup           |
| `LOOT`                       | Cartas por drop e rerolls por jogo                                        |
| `CARD_POOL`                  | Pesos de sorteio dos tipos de carta                                       |
| `UPGRADES`                   | Bônus base de cada tipo de upgrade                                        |
| `EFFECTS`                    | Parâmetros das habilidades especiais (splash radius, vampire ratio, etc.) |
| `AUDIO`                      | Volume master e throttle de hit                                           |

---

## Status do protótipo

Este é um **protótipo funcional** — todas as mecânicas listadas estão implementadas e jogáveis. O foco do projeto é exercitar arquitetura modular em vanilla JS e validar o gameplay loop antes de qualquer migração de stack.
