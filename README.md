# Solmar Bay — Open-World Crime Game

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/egikumbara/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/egikumbara/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An original 3D open-world crime game in the spirit of GTA 6, built with three.js.
You are **Rico Vale**, a wheelman in the sun-soaked coastal city of **Solmar Bay**.
Steal cars, outrun the Solmar Bay Police, run four story missions for Milo Ferrante
and Sana Reyes, and build your fortune — or get wasted trying.

Everything is original: the city, the characters, the vehicles, the story and the
sounds (all synthesized WebAudio — no audio files, no network requests at runtime).

## Features

- **Open city** — procedural street grid, buildings with lit windows, palms, lamps,
  a park fountain, a beach and the sea, drifting clouds and a day sun.
- **On foot & by car** — third-person walking/running/jumping, and stealable cars
  with arcade physics (acceleration, braking, steering, collisions).
- **Traffic & pedestrians** — AI cars cruise the streets and stop for you;
  pedestrians stroll the sidewalks.
- **Wanted system** — 0–5 stars. Crimes raise the heat; SBPD cruisers chase and
  ram you, officers chase on foot and arrest you. Hide to cool off.
- **Missions & story** — four linked jobs with dialogue, objectives and cash
  rewards: *First Wheels*, *Bayview Getaway*, *Dockside Trouble*, *The Big Score*.
- **Combat** — fists (F) and a pistol (2, click to shoot) against Harbor Boys,
  vault guards and the police.
- **HUD & minimap** — health, money, wanted stars, mission objective, clock,
  live canvas minimap with streets, cars, enemies and the mission blip.
- **Screens & save** — start screen, pause menu, game-over screen, save/load
  via localStorage.
- **Sound** — synthesized engine hum, sirens, gunshots, pickups and a lo-fi
  music loop. No audio files.

## Controls

| Key | Action |
| --- | --- |
| W A S D | Move / drive |
| Shift | Run |
| Space | Jump |
| E | Enter / exit a car (steal parked cars) |
| F | Punch |
| 1 / 2 | Fists / pistol |
| Mouse drag | Orbit camera, click to shoot |
| P | Pause |
| M | Mute |

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no
network requests — every file the game loads is under `game/`.

## Tech

- three.js r160 (vendored under `game/vendor/three.module.min.js`)
- Plain ES modules, Node 22 `main.ts` hands the game in via the make.fun kit
- Deterministic city layout (seeded); traffic and pedestrians use runtime randomness

Entered on [make.fun](https://make.fun/?ref=q1q35jmc&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards
