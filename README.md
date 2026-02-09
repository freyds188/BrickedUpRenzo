# Brick Breaker - Retro Arcade

A brick breaker game built with **HTML, CSS, and JavaScript**. Retro arcade style with neon colors and smooth gameplay.

## How to Run

1. Open `index.html` in a web browser
2. Or run: `python -m http.server 8080` and visit `http://localhost:8080`

## Controls

- **← →** Arrow keys – Move paddle left/right
- **Mouse** – Move paddle (follows cursor)
- **RESTART GAME** – Reset score, lives, level; regenerate bricks

## Features

- **3 levels** with different brick layouts and increasing difficulty
- **Collision detection** – Ball bounces off walls, paddle, and bricks
- **Lives system** – 3 lives; lose one when the ball falls below the paddle
- **Dynamic brick generation** – Bricks are created from level definitions in JavaScript
- **Level progression** – Advance to next level when all bricks are cleared
- **Restart** – Resets everything and starts fresh
- **Retro UI** – Dark background, neon colors, arcade styling

## File Structure

```
BRICKGAME/
├── index.html   # Game structure and UI
├── style.css    # Layout, colors, responsive design
├── game.js      # Game logic, physics, controls
└── README.md    # This file
```
