# Chicken Olympics Game Design

## Goal

Build a simple first playable version of Chicken Olympics: a 2-player local match where colored chickens race around a farmyard stadium to claim peeking chicks before time runs out.

## MVP Shape

- Platform: one browser/device.
- Mode: 2-player local match.
- Match length: 90 seconds.
- Players: Player 1 and Player 2.
- Controls: Player 1 moves with `WASD`; Player 2 moves with arrow keys.
- Movement: diagonal movement is normalized so it is not faster than straight movement.
- Claiming: a player claims a peeking chick automatically by touching it with their chicken cursor.
- Claim tie behavior: the first valid touch processed claims the chick; the MVP does not arbitrate simultaneous touches.
- Sound: generated sound effects play for normal claims, green chick appearance, green chick claims, and the podium ceremony.
- Win condition: most points when the timer reaches zero.

## Setup Flow

1. Show the Chicken Olympics title screen.
2. Player 1 chooses a chicken color from blue, red, purple, and orange buttons.
3. Player 2 chooses a different chicken color from the remaining buttons.
4. Start the local match.

Green is reserved for the green chick and yellow is reserved for normal chicks, so neither should be available as a player chicken color.

## Arena

The arena is a farmyard stadium: an Olympic-style stadium with a farmyard as the field. The MVP uses a fixed authored layout with several visible hiding spots; it does not use procedural spot placement or obstacle collision.

Use visible hiding spots such as:

- Bushes
- Hay bales
- Barrels
- Flower pots
- Little fences
- Nest boxes

Chicks only peek from hiding spots. They do not appear randomly anywhere on the screen.

## Core Loop

1. Three normal yellow chicks are usually peeking at once.
2. Each chick peeks for 5 seconds.
3. If no player touches the chick before the peek ends, it hides again.
4. If a player touches the chick, it turns into that player's color, scores once, does a tiny happy pop, and disappears.
5. The hiding spot becomes available for a future chick.
6. Replacement normal chicks peek after a random delay between 500ms and 1500ms.
7. The players keep racing until the 90-second timer ends.

## Scoring

- Normal chick: 1 point.
- Green chick: 5 points.
- Highest score wins.
- Ties can show both chickens on the gold podium for the first version.

## Green Chick

The green chick is a once-per-match rare chick.

- It appears once at a random hiding spot.
- It appears at a random scheduled time between 20 seconds and 70 seconds in a 90-second match.
- It appears as an extra peek alongside the three normal yellow chicks when a hiding spot is free.
- If no hiding spot is free at its scheduled time, it waits for the next free hiding spot.
- It peeks like a normal chick.
- It is worth 5 points if claimed.
- If nobody claims it, it hides and does not return during that match.

## End Screen

When time runs out, show a podium ceremony.

- Winner chicken on the gold podium.
- Other chicken on the silver podium.
- Final score for both players.
- `Play Again` button that returns to the setup screen for a fresh color selection.
- If tied, show both chickens sharing the gold podium.

## First Build Acceptance Checklist

- Two players can choose different non-green colors.
- Both players can move at the same time on one keyboard.
- Chicks peek from visible hiding spots for 5 seconds.
- Touching a peeking chick claims it automatically.
- The score updates immediately after each claim.
- Exactly one green chick appears per match and is worth 5 points.
- The match ends after 90 seconds.
- The podium ceremony correctly shows the winner or tie.

## Version 2 Ideas

- Configurable match length for solo, small group, and bigger group play.
- More than 2 local players.
- Online multiplayer with rooms.
- Winner upgrades between matches.
- Speed upgrade for the winner.
- Longer-peek upgrade where chicks stay visible longer for one player.
- More farmyard stadium themes.
- More detailed sound effects and music.
