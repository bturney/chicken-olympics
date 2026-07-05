# Online Multiplayer

Chicken Olympics does not support online multiplayer lobbies, ranked matches, or esports-style matchmaking.

## Why this is out of scope

The project is centered on a same-device Local Match: a short, readable, kid-friendly competition where player slots are controlled by local humans or bot chickens. The current domain model deliberately avoids online match concepts and keeps the match experience focused on shared local play.

Online multiplayer would be a major product and technical expansion. It would require lobby design, networking, synchronization, matchmaking, ranking, account or identity decisions, moderation considerations, latency handling, and a different testing strategy. Those concerns would pull the project away from its current goal of making the local Farmyard Stadium match feel clear, lively, and polished.

Future work can still improve Solo Local Match and local two-player play, including better bot chickens, clearer setup, match feel tuning, and presentation polish. Those remain in scope because they deepen the existing Local Match rather than turning Chicken Olympics into an online service.

## Prior requests

- #68 - "Add online multiplayer lobbies"
