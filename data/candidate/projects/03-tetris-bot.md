---
id: tetris-bot
title: StackOverflow — Tetris AI Capstone
role: Team Lead, CS ML Capstone (CS4100)
url: null
start: Jan 2024
end: Jun 2024
priority: 3
tags: [ml, evolutionary-algorithms, neuroevolution, simulation, pytorch, numpy, capstone, feature-engineering, lineage-control, parallel-evaluation, profiling]
---

# StackOverflow — Tetris AI Capstone

## Bullets

- As team lead and **sole code contributor**  on a Northeastern CS4100 CS ML capstone, drove the project through **three Tetris-AI architectures** at progressively higher action-space abstractions — frame-by-frame MLP (PyTorch, `400→200→100`, output over `4 × COLS`), step-level MLP (PyTorch, output over `{left, right, rotate, down}`), and a **place-style action space** that enumerates every reachable terminal piece placement via BFS over `{±x, rot, rot⁻¹, +y}` and picks the lowest-cost terminal. Converged on the place-style abstraction as the right level for evolvable agents.
- Active solution: a linear evaluator over **9 hand-crafted board features** (bumpiness, max/avg/min height, flood-fill hole count, overhang count, normalized score, quadratic-fit surface curvature, "Fear of Death" headroom). Each feature is passed through **5 polynomial basis functions** (`x, x³, x^(1/3), (1-x)³, (1-x)^(1/3)`) with an **independently trained weight per (feature, basis) pair** — 9 × 5 = **45 trained weight scalars** (NOT 45 features). The cost function is **derived analytically** in `GD.md`: a log-normal-PDF-weighted average of per-game costs, with closed-form **partial derivatives** ∂C/∂w_i for every weight AND ∂C/∂σ for the Gaussian-feature width parameters. Per-move gradients are accumulated over each evaluation game (`norm_c_grad += min_w_grad`), score-weighted, and used for an **SGD step** on both the weight matrix and the Gaussian σ vector — this is **proper gradient descent with derived backward-pass derivatives**, not just hint-driven noise. The **EA wrapper** adds population-based global search around the SGD: Gaussian-noise mutation, **70% random restart per generation** for diversity, and **age-factor LR amplification** for stale parents. Decision-time uses **one-piece phantom-game lookahead** with heuristic pruning of the 20% worst intermediate boards.
- Implemented **lineage-aware selection** to prevent the EA from collapsing onto a single ancestor's variants — tracked full ancestry of every model in a parquet store, capped any one lineage to **30% of next-generation children**, and re-ranked across merged training data; abandoned this branch's failure-mode of homogenized populations after 100s of generations.
- Long-game robustness: ranked models by **log-normal MLE** of right-skewed score distributions (variance-penalized expected value, not mean of runs), with an **AIC-adaptive evaluation budget** that kept playing games until log-normal AIC stabilized (Δ < 4%), and **snapshot-based resumable evaluation** starting 60% of plays from stored high-stack mid-game states (skewed sampling toward late-game competence). Parallelized across all CPU cores via `multiprocessing.ProcessPoolExecutor`.
- Built substantial tooling around the EA: **lineage visualizer** (`networkx` + Graphviz family-tree of top-N models with custom generation-ordered layout), **live training monitor** (auto-refreshing matplotlib of best/avg rank across generations), **re-ranker** for re-applying scoring formulas across merged historical data, **seed-population generator**, and **`cProfile`-based per-worker profiling** with merge tooling as a first-class workflow.

## Detail

Northeastern CS4100 ML capstone. Team lead and sole code contributor. Goal: a Tetris agent that survives long games, not just clears lines greedily.

![Trained agent playing — placement decisions, line clears, and late-game survival](/media/projects/tetris-bot/tetris-playing.mov)


| Action abstraction | What the model chooses | Engineering lesson |
| --- | --- | --- |
| Per-step actions | A movement or rotation each tick | Delayed placement rewards made credit assignment difficult |
| Rotation × column | A target placement for a deterministic controller | Learning board representations consumed the search budget |
| Reachable terminal placement | A board evaluated after the piece lands | BFS handles reachability; learned weights focus on board value |

![Illustrative placement and training mechanism; no synthetic training curve or measured performance comparison](/media/case-studies/legacy/tetris-placement.svg)

### Architectural progression

Three action-space abstractions, each chosen at a higher level than the last. The pattern: every step up the abstraction ladder traded a piece of "the agent is learning the game from raw inputs" for "the agent makes one consequential decision per piece, which is the only decision that matters." The final architecture is the one that fit the evolvable-agent budget.

#### 1. `step-tetris` — per-step keystrokes (abandoned earliest)

A PyTorch MLP that took the current board + active piece and emitted one of four actions per game tick: `{left, right, rotate, down}`. The action space matched a human pressing arrow keys — small, intuitive, and a good first reflex.

It died on **credit assignment**. A single piece-placement is the consequence of 5–15 keystrokes; the reward (score) only arrives after the placement lands. The agent had to learn that "rotate, rotate, left, left, down, down" together produce a good outcome — and that the reward at the end belongs to all twelve actions, not the last one. Even with discounted returns, the per-step gradient signal was effectively noise. Killed before the first plateau.

#### 2. `frame-tetris` — per-frame placement grid

A larger PyTorch MLP: input `(COLS·ROWS + 1)` (board + current piece id), two hidden layers `400 → 200 → 100`, output `4·COLS` — a softmax over **(rotation × column)** terminal placements per frame. The network picked a target placement; a deterministic controller drove the piece there.

This was a real architecture: trained across successive generations of the EA wrapper. It learned to clear lines and avoid the most obvious holes. But it plateaued — survival rates didn't climb past a ceiling that hand-tuned heuristics already cleared. The MLP was spending capacity re-deriving features (column heights, hole counts) that we could compute in microseconds, and the EA was burning generations on weights that didn't matter. The diagnosis: too much representation under-determined by too little signal.

#### 3. `place-tetris` — terminal-placement search *(active)*

Scrap the MLP entirely. For each piece, **enumerate every terminal placement reachable by BFS** over `{±x, rot, rot⁻¹, +y}` — typically 30–40 candidates per piece, including overhang slides and tucks the per-frame grid couldn't represent. Score each candidate board with a fast hand-crafted cost function ([45 trained weights over 9 features × 5 polynomial basis](#9-features-5-polynomial-basis-45-trained-weights)), prune the worst 20%, run a one-piece phantom-game lookahead on the survivors, and pick the lowest-cost terminal.

One decision per piece. Deterministic. Profileable. The EA evolves only the 45 cost-function weights + a handful of σ parameters — a tiny enough search space that population-based global search actually converges.

:::stats
- 45 trained weights · 9 features × 5 polynomial basis
- 30% lineage cap · prevents ancestral monoculture
:::

What this progression bought: removing the MLP didn't give up expressiveness — BFS terminal enumeration covers placements an `(rotation × column)` grid literally can't represent (slides under overhangs). It traded "learn pixels → keystrokes" for "learn how to value a board," which is the only thing the agent actually has to be good at.

### Heuristic pruning

:::callout
**BFS over `{±x, rot, rot⁻¹, +y}` enumerates every reachable placement** — score, prune the worst 20%, then a one-piece phantom-game lookahead on the survivors.
:::

![Every placement option being evaluated, ranked, and pruned in real time](/media/projects/tetris-bot/heuristic-pruning.mp4)

### 9 features × 5 polynomial basis = 45 trained weights

| Feature family | Board property represented |
| --- | --- |
| Minimum, average and maximum height | Overall stack level and remaining room |
| Bumpiness | Uneven adjacent column heights |
| Flood-fill holes | Empty spaces blocked from the top |
| Overhangs | Board structures that constrain future access |
| Normalized score | Progress already achieved |
| Quadratic surface fit | Large-scale shape of the stack |
| Fear of Death | Headroom near the ceiling |

The nine scalar features become a weighted basis representation; the weight count describes model structure, not a measured score improvement.

Pure NumPy linear cost over nine board-state features: bumpiness, min/avg/max height, flood-fill hole count, overhangs, normalized score, quadratic-fit curvature, and **Fear of Death** (headroom from stack top to ceiling, clipped to 4). Each board below shows the feature drawn in red over a live position.

![Min/Max height, average height, overhangs, and points — annotated on a live board](/media/projects/tetris-bot/height-features.png)

![Bumpiness — summed absolute height differences across the top surface](/media/projects/tetris-bot/bumpiness.png)

![Holes — inaccessible open spaces, found via flood-fill DFS](/media/projects/tetris-bot/holes.png)

![Polynomial fit — first coefficient of a quadratic fit to the column-height surface](/media/projects/tetris-bot/polynomial-fit.png)

![Fear of Death — headroom band from stack top to ceiling](/media/projects/tetris-bot/fear-of-death.png)

Each feature passes through five polynomial basis functions `[x, x³, x^(1/3), (1-x)³, (1-x)^(1/3)]`, one trained weight per (feature, basis) pair — 9×5 = **45 scalar weights**. A subset is wrapped in trainable Gaussian envelopes with co-evolved σ.

![Polynomial basis applied per feature](/media/projects/tetris-bot/polynomial-basis.png)

### SGD with derived gradients, EA wrapper for global search

:::callout
**Closed-form ∂C/∂w and ∂C/∂σ derived by hand** — no autograd. EA escapes local optima where SGD alone would converge to a poor basin.
:::

Cost is a log-normal-PDF-weighted average of per-game costs (derived in `GD.md`). Per-move gradients accumulate score-weighted across each evaluation game, then drive an SGD step on both the weight matrix and the σ vector.

![Cost function — linear over polynomial-transformed features](/media/projects/tetris-bot/cost-function.png)

The EA wrapper: population 100, top-40 truncation, Gaussian-noise mutation, **70% random restart per generation**, age-factor LR amplification for stale parents. **Lineage-aware selection** caps any single ancestor to 30% of next-gen children via a parquet ancestry store — without it, populations collapse onto one early winner within a few hundred generations.

### Long-game robustness

Tetris scores are right-skewed; mean is misleading. Three evaluation choices push the agent toward consistent late-game survival:

- **Log-normal MLE ranking** — `exp(log(scale) − shape/2)` rewards low variance, not lucky runs.
- **AIC-adaptive budget** — keep playing per individual until log-normal AIC stabilizes (Δ < 4%).
- **Snapshot-resumable evaluation** — store mid-game boards with probability `0.12·max_height^8`; 60% of plays resume from a stored high-stack state, skewing samples toward late-game competence.

Parallelized across all CPU cores via `ProcessPoolExecutor`. Tooling alongside the EA: lineage visualizer (networkx + Graphviz), live matplotlib training monitor, re-ranker, seed-population generator, and `cProfile` per-worker merge.
