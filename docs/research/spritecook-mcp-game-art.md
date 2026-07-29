# SpriteCook MCP Game-Art Research

**Research date:** 2026-07-29
**Scope:** First-party SpriteCook material, its npm registry listing, and the official OpenCode MCP documentation only. No SpriteCook account, API key, asset generation, or MCP installation was performed.

## Recommendation

**Conditionally appropriate for a small, review-gated art-slice pilot; do not adopt it yet as the repository's final-art pipeline.** SpriteCook's documented pixel-art generation, transparent-background setting, spritesheet animation output, theme/reference mechanisms, and asset-ID workflow fit much of the requested art slice. Its terms expressly permit use, reproduction, and distribution of generated outputs, which satisfies the brief's requirement for explicit reuse rights at a service-terms level. However, the same terms say outputs may be non-unique, require the user to assess infringement and suitability, and subject use to changeable third-party provider policies. The repository should therefore retain human review and provenance records before committing any output; it must also validate that an exported animation sheet is a PNG before relying on SpriteCook for the brief's PNG-spritesheet requirement. [SpriteCook API reference](https://spritecook.com/api-docs) [SpriteCook terms](https://spritecook.com/terms) [repository art brief](../art-audio-slice-brief.md)

## Verified Findings

### MCP and OpenCode

- SpriteCook officially describes AI-agent integrations as MCP-compatible tools and its agent page presents an `OpenCode` editor option. The same page describes the integration as connecting the SpriteCook account in a browser and adding MCP generation/animation tools. [SpriteCook agent setup](https://spritecook.com/agents) [SpriteCook terms, section 1](https://spritecook.com/terms)
- OpenCode officially supports both local and remote MCP servers, including a remote URL with request headers and a local command with environment variables. That means OpenCode can host a SpriteCook MCP integration once SpriteCook supplies its actual MCP endpoint or local launcher and authentication procedure. [OpenCode MCP server documentation](https://opencode.ai/docs/mcp-servers/)
- SpriteCook's public REST API uses per-account Bearer API keys, and the official API reference directs users to create those keys in the SpriteCook dashboard. [SpriteCook API authentication](https://spritecook.com/api-docs)

### Asset Capabilities

- SpriteCook documents generation of pixel-art characters, props, tilesets, and textures. The generation API defaults to pixel-art and grid-aligned post-processing; its `bg_mode` supports `transparent`. [SpriteCook documentation home](https://spritecook.com/docs) [SpriteCook generation parameters](https://spritecook.com/api-docs)
- SpriteCook documents animation output as a `spritesheet` format. In pixel mode, animation input must be PNG up to 256x256 and supports an even frame count from 2 through 16. [SpriteCook animation API reference](https://spritecook.com/api-docs)
- Its character workflow supports selecting motions such as idle, walk, and run, then exporting each completed motion. The single-animation workflow likewise returns a spritesheet from one source sprite and a motion description. [Create a Character](https://spritecook.com/docs/guide-create-character) [Animate a Sprite](https://spritecook.com/docs/guide-animate-sprite)
- SpriteCook documents two consistency mechanisms: a project theme persists visual context across generations, and the API accepts a `reference_asset_id` for consistent art. It also provides `edit_asset_id` for iterative modification of an existing asset. [Theme System](https://spritecook.com/docs/theme) [SpriteCook API generation parameters](https://spritecook.com/api-docs)
- SpriteCook's generation guide recommends transparent backgrounds and consistent settings for a sprite set, and says its exports include transparent PNGs and spritesheets usable in Phaser. [Generate Sprites](https://spritecook.com/docs/guide-generate-sprites)

### Account, Authentication, and Credits

- API keys are tied to the account and draw from the same credit balance as the web application. The terms prohibit publicly committing API keys or embedding them in client-side code. [SpriteCook terms, section 4](https://spritecook.com/terms)
- The free offering is 40 credits every 30 days without a card. The published monthly paid tiers are Starter at $8 for 800 credits, Adventurer at $30 for 3,000 credits, and Archmage at $70 for 7,000 credits, excluding VAT. [SpriteCook pricing](https://spritecook.com/pricing)
- Pricing says a basic image generation averages 8 credits and an animation about 20 credits. API credit usage varies with model, resolution, quality, dimensions, reference/edit mode, and variation count; every API response reports used and remaining credits. [SpriteCook pricing](https://spritecook.com/pricing) [SpriteCook API billing](https://spritecook.com/api-docs)
- Published pricing includes API and MCP access in all plans. The terms allow rate and concurrency limits to vary by subscription tier and to change. [SpriteCook pricing](https://spritecook.com/pricing) [SpriteCook terms, sections 4 and 9](https://spritecook.com/terms)

### Commercial Use and IP

- The terms state that, subject to the terms and applicable law, users may use, reproduce, and distribute outputs they generate. SpriteCook's public FAQ separately says generated assets may be used commercially, including in games that are sold. [SpriteCook terms, section 6](https://spritecook.com/terms) [SpriteCook FAQ](https://spritecook.com/)
- SpriteCook states outputs may be non-unique and makes the user solely responsible for checking accuracy, suitability, originality, and potential infringement. The service uses third-party model providers, and their policies also apply and may change. [SpriteCook terms, sections 1, 6, 8, and 11](https://spritecook.com/terms)
- Users retain ownership of submitted prompts, references, and uploads, but grant SpriteCook a worldwide, non-exclusive license to process and store that user content for providing and improving the service. Users represent that they hold the necessary submission rights. [SpriteCook terms, section 5](https://spritecook.com/terms)

### Chicken Olympics Fit and Integration

- The art brief calls for bespoke PNG spritesheets, minimal readability-driven animation, a shared recolorable Player Chicken base, yellow Chicks, two readable Hiding Spot types, and restrained Farmyard Stadium framing. SpriteCook's documented pixel PNG and spritesheet capabilities fit the file and animation shape; its theme/reference tools can help establish a shared style. [Art and Audio Slice Brief](../art-audio-slice-brief.md) [SpriteCook API reference](https://spritecook.com/api-docs) [SpriteCook theme documentation](https://spritecook.com/docs/theme)
- The brief requires a creator, source, license, and usage record for each committed runtime asset, and specifically treats AI-generated drafts as concept material unless reuse rights are explicit. The published output-use terms are explicit enough to permit a pilot, but the required manifest must identify SpriteCook, the applicable terms date, prompt/reference inputs, asset ID, export/source location, and the human reviewer because the terms leave originality and infringement assessment to the user. [Art and Audio Slice Brief](../art-audio-slice-brief.md) [Runtime Asset Provenance Manifest](../../public/assets/manifest.md) [SpriteCook terms](https://spritecook.com/terms) [SpriteCook agent setup](https://spritecook.com/agents)
- The generated art should be reviewed in an active Local Match against the brief's readability gate: Player Chickens, Chicks, Hiding Spots, and claim ownership must remain distinguishable at play speed. SpriteCook's capabilities do not verify that gameplay outcome. [Art and Audio Slice Brief](../art-audio-slice-brief.md)

## Unverified or Unresolved

- **No reproducible OpenCode setup was found in the consulted SpriteCook documentation.** SpriteCook's official agent page exposes an OpenCode option, but the retrieved setup instructions do not publish an OpenCode-specific command, MCP server URL, package name, transport, scopes, or API-key mapping. Do not add SpriteCook to `opencode.json` until SpriteCook publishes those details or support confirms them in writing. [SpriteCook agent setup](https://spritecook.com/agents) [OpenCode MCP server documentation](https://opencode.ai/docs/mcp-servers/)
- **PNG spritesheet export is not explicitly verified.** SpriteCook separately documents transparent PNG exports and `spritesheet` animation output, but the animation API does not name PNG as the spritesheet file format. Generate and inspect one representative animation before accepting the tool for the brief's PNG-spritesheet requirement. [Generate Sprites](https://spritecook.com/docs/guide-generate-sprites) [SpriteCook animation API reference](https://spritecook.com/api-docs) [Art and Audio Slice Brief](../art-audio-slice-brief.md)
- **No public official source repository was available to inspect.** The npm listing identifies `https://github.com/spritecook/spritecook` as the repository, but that URL returned GitHub's unavailable/not-found response during this research. The npm package also has no README and is version `0.0.1`; it is therefore not a verified installation source for the MCP integration. [Official npm package listing](https://www.npmjs.com/package/spritecook) [repository URL from npm metadata](https://github.com/spritecook/spritecook)
- **Generated-output exclusivity and clean-chain IP cannot be established from the terms.** The terms explicitly disclaim uniqueness and place infringement review on the user. For final committed assets, retain prompt and reference history, avoid third-party copyrighted style/character references, inspect outputs for accidental similarity, and obtain a human legal review if release risk warrants it. [SpriteCook terms, sections 5, 6, 8, and 11](https://spritecook.com/terms)
- **Exact pilot cost is not predictable from published averages.** It depends on selected models and generation settings, and the API says model costs should be read dynamically from `GET /v1/api/models`. [SpriteCook API billing](https://spritecook.com/api-docs)

## Adoption Guardrails

1. Use only a non-production SpriteCook account/API key stored outside version control; never put the key in browser-delivered code or commit it.
2. Begin with one theme and one approved Player Chicken reference asset. Use `reference_asset_id` and fixed dimensions/palette settings for the Player Chicken, Chick, Hiding Spot, and claim-burst drafts.
3. Generate only the narrow art-slice scope, export PNG spritesheets, and verify frame dimensions, transparent alpha, frame alignment, and readability in the Phaser Local Match before any commitment to a broader pipeline.
4. For every committed asset, add the required entry to `public/assets/manifest.md`, including SpriteCook as creator/tool, the output asset ID, prompt/reference IDs, export/source path, the applicable terms URL/effective date, commercial-use caveats, and the runtime usage.
5. Treat generation as a paid external dependency: enforce a credit budget, retain a manual/repo-owned fallback for the slice, and do not depend on undocumented MCP setup details.

## Sources Consulted

- [SpriteCook home and FAQ](https://spritecook.com/)
- [SpriteCook agent setup](https://spritecook.com/agents)
- [SpriteCook documentation index](https://spritecook.com/docs)
- [SpriteCook API reference](https://spritecook.com/api-docs)
- [SpriteCook pricing](https://spritecook.com/pricing)
- [SpriteCook terms of service](https://spritecook.com/terms)
- [SpriteCook character, animation, generation, and theme guides](https://spritecook.com/docs/guide-create-character)
- [Official npm package listing](https://www.npmjs.com/package/spritecook)
- [Official OpenCode MCP documentation](https://opencode.ai/docs/mcp-servers/)
