# Chicken Olympics

Chicken Olympics is a simple competitive game about colored chickens racing to claim hiding chicks before time runs out.

## Language

**Match**:
A timed round of Chicken Olympics where players compete to claim the most chicks.
_Avoid_: Game, session, race

**Local Match**:
A match played on one device with up to four player slots, where unused slots may be filled by bot chickens so one human can play solo.
_Avoid_: Online match, room, practice mode, four-human keyboard match

**Solo Local Match**:
A local match with one human-controlled player slot and one or more bot chickens, still played as a competition with claims, scores, and a winner.
_Avoid_: Practice mode, high-score mode, single-player mode

**Player Slot**:
A participant position in a local match, controlled either by a human player or a bot chicken.
_Avoid_: Player count, controller, seat

**Keyboard-Friendly Human Count**:
The number of human-controlled player slots that can comfortably share one keyboard in a local match; currently two, with additional player slots filled by bot chickens unless another input approach is added.
_Avoid_: Four players on one keyboard, keyboard crowding, ghosting-prone controls

**Farmyard Stadium**:
The Chicken Olympics arena: an Olympic-style stadium whose field is a farmyard filled with hiding spots.
_Avoid_: Pitch, backyard, arena

**Stadium Reaction**:
A rare Farmyard Stadium response to a high-value match moment, such as a green chick claim or podium ceremony, rather than a reaction to every normal claim.
_Avoid_: Constant crowd noise, background spam

**Podium Ceremony**:
The end-of-match screen that shows the final scores and celebrates the winner on an Olympic-style podium.
_Avoid_: Results screen, game over screen

**Player Chicken**:
The non-green, non-yellow colored chicken chosen by a player for a match.
_Avoid_: Avatar, character, chicken color

**Chicken Cursor**:
A player's movable on-screen chicken used to claim peeking chicks by touching them during a local match.
_Avoid_: Mouse cursor, pointer, selector

**Bot Chicken**:
A cute, visibly mechanical chicken cursor that controls a player slot automatically during a local match, behaving human-ish enough to make solo matches feel lively and winnable rather than optimal.
_Avoid_: NPC, AI opponent, perfect computer player, enemy robot

**Chicken Cursor Personality**:
Lightweight visual character in a chicken cursor's movement, such as bobbing, squash, or tiny footstep motion, without changing movement speed, acceleration, bounds, or claiming rules.
_Avoid_: Movement tuning, collision, physics

**Chicken Cursor Responsiveness**:
How quick and comfortable a chicken cursor feels when chasing chicks across the Farmyard Stadium, adjusted as match feel tuning without adding new claiming rules or movement abilities.
_Avoid_: Dash, stamina, acceleration system, power-up

**Chick**:
A yellow baby chicken that hides, peeks out temporarily, and can be claimed by a player chicken.
_Avoid_: Target, enemy, item

**Hiding Spot**:
A visible place on the playfield where a chick may peek out during a match.
_Avoid_: Spawn point, hole, target location

**Hiding Spot Variety**:
The number and distribution of possible hiding spots in the Farmyard Stadium, which can increase without necessarily increasing simultaneous peeks.
_Avoid_: More active chicks, spawn rate, difficulty

**Peek**:
The temporary moment when a chick is visible and available to be claimed.
_Avoid_: Spawn, appear, reveal

**Peek Anticipation**:
A subtle mostly-visual wiggle, rustle, or similar cue from a hiding spot shortly before a chick peeks, helping players notice that something is about to happen without changing the match rules. Normal peek anticipation should not compete sonically with claim beats.
_Avoid_: Warning, spawn telegraph, alert

**Peek Pressure**:
The amount of active chick-chasing demand in a match, shaped mainly by how many chicks are peeking at once, how long peeks last, and how quickly replacements happen.
_Avoid_: Spawn rate, chaos, difficulty

**Claim**:
The act of touching a peeking chick with a chicken cursor so it turns into that player's color and scores once.
_Avoid_: Capture, tag, collect

**Green Chick**:
A once-per-match rare chick worth five points when claimed.
_Avoid_: Bonus chick, rare target

**Green Chick Claim Beat**:
A claim beat for claiming the green chick that feels about three times more special than a normal claim through a bigger burst and crowd cheer, while the match keeps flowing.
_Avoid_: Cutscene, match pause, super move

**Match Runtime**:
The deep module that owns match state — scores, elapsed time, normal peeks, the green chick, and spot occupancy — behind a small stateful interface (advance, claim, query) that emits match events. Scenes drive it and never reach inside. Replaces the former bag of pure rules functions.
_Avoid_: Rules module, game state, engine

**Arena**:
The single source of truth for hiding-spot occupancy inside the match runtime: it holds which spots are taken, enforces at most one occupant per spot, and allocates a free spot to a peeking chick on request.
_Avoid_: Spot map, grid, board

**Match Event**:
A discrete thing the match runtime reports as it advances — a chick was claimed, the green chick appeared, the green chick was missed. Scenes consume these to play sound and animate, instead of polling and edge-detecting state changes.
_Avoid_: Signal, notification, message

**Moment-to-Moment Feel**:
The immediate sensory and competitive feedback players experience during a match: noticing peeks, chasing chicks, making claims, seeing score impact, and reacting to the other player.
_Avoid_: Game feel, polish, juice

**Celebratory Claim**:
A claim that primarily feels cute and rewarding for the claiming player while remaining readable enough that other players understand what happened.
_Avoid_: Denial, steal, punish

**Claim Beat**:
The paired animation-and-sound moment that confirms a celebratory claim before the score display catches up.
_Avoid_: Score popup, hit effect, notification

**Claim Score Echo**:
A small player-colored score cue near a claim, such as a +1 or +5, paired with a gentle scoreboard bump so players connect the claim beat to scoring without making the scoreboard the main event.
_Avoid_: Score explosion, combo UI, damage number

**Silly-Triumphant Claim Beat**:
A claim beat where the chick gives a playful hop, spin, chirp, or poof without making the claim feel aggressive. Normal claims keep this lightweight; the green chick claim may add a crowd-cheer layer because it is rare.
_Avoid_: Attack, defeat, combat hit
