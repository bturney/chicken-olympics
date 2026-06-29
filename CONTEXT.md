# Chicken Olympics

Chicken Olympics is a simple competitive game about colored chickens racing to claim hiding chicks before time runs out.

## Language

**Match**:
A timed round of Chicken Olympics where players compete to claim the most chicks.
_Avoid_: Game, session, race

**Local Match**:
A match played by multiple players on the same device.
_Avoid_: Online match, room

**Farmyard Stadium**:
The Chicken Olympics arena: an Olympic-style stadium whose field is a farmyard filled with hiding spots.
_Avoid_: Pitch, backyard, arena

**Podium Ceremony**:
The end-of-match screen that shows the final scores and celebrates the winner on an Olympic-style podium.
_Avoid_: Results screen, game over screen

**Player Chicken**:
The non-green, non-yellow colored chicken chosen by a player for a match.
_Avoid_: Avatar, character, chicken color

**Chicken Cursor**:
A player's movable on-screen chicken used to claim peeking chicks by touching them during a local match.
_Avoid_: Mouse cursor, pointer, selector

**Chick**:
A yellow baby chicken that hides, peeks out temporarily, and can be claimed by a player chicken.
_Avoid_: Target, enemy, item

**Hiding Spot**:
A visible place on the playfield where a chick may peek out during a match.
_Avoid_: Spawn point, hole, target location

**Peek**:
The temporary moment when a chick is visible and available to be claimed.
_Avoid_: Spawn, appear, reveal

**Claim**:
The act of touching a peeking chick with a chicken cursor so it turns into that player's color and scores once.
_Avoid_: Capture, tag, collect

**Green Chick**:
A once-per-match rare chick worth five points when claimed.
_Avoid_: Bonus chick, rare target

**Match Runtime**:
The deep module that owns match state — scores, elapsed time, normal peeks, the green chick, and spot occupancy — behind a small stateful interface (advance, claim, query) that emits match events. Scenes drive it and never reach inside. Replaces the former bag of pure rules functions.
_Avoid_: Rules module, game state, engine

**Arena**:
The single source of truth for hiding-spot occupancy inside the match runtime: it holds which spots are taken, enforces at most one occupant per spot, and allocates a free spot to a peeking chick on request.
_Avoid_: Spot map, grid, board

**Match Event**:
A discrete thing the match runtime reports as it advances — a chick was claimed, the green chick appeared, the green chick was missed. Scenes consume these to play sound and animate, instead of polling and edge-detecting state changes.
_Avoid_: Signal, notification, message
