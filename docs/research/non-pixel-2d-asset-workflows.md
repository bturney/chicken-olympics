# Non-Pixel 2D Asset Workflow Research

**Research date:** 2026-07-29
**Question:** Which AI-assisted and conventional workflows can create coherent, readable non-pixel 2D art for Chicken Olympics' Phaser art slice?
**Method:** First-party product documentation, pricing, terms, API documentation, and official source/documentation only. No account, API key, generation, or implementation was used.

## Scope and Runtime Constraints

The later prototype needs bespoke PNG spritesheets, minimal readability-driven animation, one recolorable Player Chicken base, yellow Chicks, two clearly different Hiding Spot types, and low-contrast Farmyard Stadium framing. It passes only when players can distinguish chickens, chicks, hiding spots, and claim ownership at play speed. AI output remains concept material unless reuse rights are explicit. [Art and Audio Slice Brief](../art-audio-slice-brief.md)

Phaser 4's documented loader supports a PNG plus JSON Aseprite export and can create animations from the export's named tags. Its documentation also specifies the compatible Aseprite export settings. This provides a known runtime target for a human-reviewed asset slice; it does not validate visual readability. [Phaser LoaderPlugin API: `aseprite`](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#aseprite)

## Shortlist

### 1. Recraft API concepts and controlled variants -> human cleanup/animation -> PNG spritesheet

**Workflow.** Establish a compact visual brief and a human-approved reference image for the shared chicken silhouette, then create a reusable Recraft style from approved references. Generate still raster or vector candidates for the chicken, chick, hiding spots, and restrained background; use image-to-image, inpainting, background removal, and vectorization only to revise selected candidates. A human then normalizes silhouette, palette, line weight, alpha edges, and visual hierarchy, and authors the few required frames in a conventional editor before PNG-spritesheet export.

- **Generation and consistency:** Recraft's official API documents raster and vector generation, reusable styles from uploaded reference images, brand-style generation, image-to-image, inpainting, vectorization, and exploration of variations. This is a viable still-art ideation and variation stage, not documented character animation. [Recraft API getting started](https://www.recraft.ai/docs/api-reference)
- **Editing and transparent export:** The same API documents inpainting, erase-region, background replacement, and a background-removal operation that produces a transparent-background cutout. These reduce cleanup work but do not establish game-ready alpha edges or readable silhouettes; human inspection remains required. [Recraft API getting started](https://www.recraft.ai/docs/api-reference)
- **Animation and spritesheets:** The consulted API documentation lists no frame-animation or spritesheet-generation endpoint. Generate or edit stills there, then make the small animation set and sheet conventionally. [Recraft API getting started](https://www.recraft.ai/docs/api-reference)
- **Licensing and provenance:** Free-tier assets are non-commercial and owned by Recraft. Paid subscription and API terms say the customer owns created assets and receives the provider's copyright assignment, subject to the prohibition on using assets to train AI systems. The terms also put clearance responsibility on the user, acknowledge possible accidental similarity to protected material, and permit Recraft to embed provenance metadata. API-created assets are not used for model training except as necessary for support, legal compliance, or policy enforcement. Record the paid plan/API package, terms date, prompt, input/reference files, style ID, output URL or ID, edits, and reviewer for every retained candidate. [Recraft terms](https://www.recraft.ai/legal/terms)
- **Cost:** The public API terms define an API unit as $0.001 and require purchased, non-refundable unit packages; requests are capped at 100 per minute. The public pricing page says per-operation cost varies by action and model rather than presenting a stable all-in workflow cost. Price a bounded pilot from the current unit schedule before generating a set. [Recraft API terms](https://www.recraft.ai/legal/terms) [Recraft pricing](https://www.recraft.ai/pricing)
- **Agent/MCP integration:** Recraft officially documents a Bearer-token REST API and an OpenAI-library-compatible base URL. The consulted official material does **not** document an MCP server, an OpenCode integration, or an agent tool. A REST call made by a purpose-built script is possible later, but must not be represented as an existing MCP integration. [Recraft API getting started](https://www.recraft.ai/docs/api-reference)

### 2. Human-authored Krita frames -> PNG sequence -> sprite-sheet packing

**Workflow.** A human illustrator creates the approved non-pixel chicken base, chicks, hiding spots, and backgrounds as layered raster source files in Krita. Use the animation workspace, keyframes, onion skins, and sparse hand-drawn frames for only the motions that need them. Render an image sequence, then pack reviewed frames into a PNG sheet using a dedicated sheet exporter.

- **Generation and cleanup:** This is conventional authoring rather than AI generation. Krita documents layers, frame-by-frame raster animation, keyframes, onion skinning, and transform masks. That gives the artist direct control of silhouette and color, which is particularly suitable for the art brief's recolorable shared base and readability gates. [Krita animation manual](https://docs.krita.org/en/user_manual/animation.html)
- **Transparent export:** Krita's animation guidance says animated layers must be transparent for onion skinning and directs users to Render Animation for frame-sequence export. Verify the exported PNG alpha against the target background in the prototype; its animation guide does not itself promise a spritesheet layout. [Krita animation manual](https://docs.krita.org/en/user_manual/animation.html)
- **Animation and spritesheets:** Krita provides frame-by-frame animation and frame-sequence/video rendering, but the consulted official guide does not document direct spritesheet packing. Pair it with the Aseprite export stage below, or another reviewed packer, rather than assuming a Krita sheet exporter. [Krita animation manual](https://docs.krita.org/en/user_manual/animation.html)
- **Style consistency:** This route is controlled by a human-owned style board, fixed palette, line/shape rules, and review of the complete set together. It has no generative drift, but requires more illustration time.
- **Licensing, provenance, and cost:** Krita is GPLv3 software, may be used commercially, and states that artwork made with it is the artist's sole property. It needs no account or network connection to function. Its software license does not license third-party reference material, fonts, brushes, or contributor art, so retain those records separately. The official download is free; paid store builds support development but remain GPL. [Krita license](https://krita.org/en/about/license/)
- **Agent/MCP integration:** No official Krita MCP or agent integration was found in the consulted Krita documentation. Do not claim one based on third-party plugins.

### 3. Aseprite as the deterministic sheet-export and Phaser handoff stage

**Workflow.** Use Aseprite to import the human-cleaned non-pixel PNG frames, arrange/tag the short loops, and export a PNG sheet with JSON metadata. It can be used after either the Recraft-assisted or Krita-only route; it should not be evaluated as the source of the non-pixel visual style.

- **Generation and cleanup:** Aseprite is a conventional sprite editor, not an AI generator. Its official documentation says a sheet can be imported with frame size, offsets, and padding, and exported by visible layer and selected tags. This makes it useful for deterministic packing after the art decisions are complete. [Aseprite sprite-sheet documentation](https://www.aseprite.org/docs/sprite-sheet/)
- **Transparent export, animation, and Phaser fit:** Phaser documents an Aseprite export procedure that emits a PNG plus JSON, preserves tags as animations, and loads the result via `this.load.aseprite`; it requires packed layout and non-zero padding. Use an export test before committing to that metadata shape, because the current art brief initially asks for PNG spritesheets and deliberately defers a full atlas pipeline. [Phaser LoaderPlugin API: `aseprite`](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#aseprite) [Art and Audio Slice Brief](../art-audio-slice-brief.md)
- **Style consistency:** Aseprite preserves and packages supplied frames; it does not solve cross-asset design consistency. It is therefore a handoff tool, not an art-direction tool.
- **Licensing, provenance, and cost:** Official Aseprite packages cost a minimum $19.99 per developer for the 1.x series. The official FAQ permits commercial game assets, but the editor's EULA governs the software, not ownership of any imported references or generated candidates. Its source is available for personal compilation, while redistribution of compiled Aseprite is restricted. [Aseprite FAQ: licensing, commercial use, and cost](https://www.aseprite.org/faq/#licensing-commercial) [official source repository](https://github.com/aseprite/aseprite)
- **Agent/MCP integration:** The official documentation describes manual sheet import/export and labels command-line automation as work in progress. No official MCP or agent integration was found; do not plan an agent-operated pipeline around it. [Aseprite sprite-sheet documentation](https://www.aseprite.org/docs/sprite-sheet/)

## Documented MCP Boundary

SpriteCook is the only product in the consulted set with official documentation presenting MCP-compatible agent integrations and an OpenCode option. Its documented generation defaults to pixel art, however, so it is not a direct fit for the requested non-pixel treatment. Its MCP setup also lacks a published OpenCode-specific endpoint or configuration in the available official material. It may be relevant only if the visual direction changes. [SpriteCook agent setup](https://spritecook.com/agents) [SpriteCook API reference](https://spritecook.com/api-docs)

Neither a REST API nor an editor's scripting/CLI documentation is MCP evidence. Until a vendor publishes a server endpoint/package plus authentication and tool documentation, treat any agent connection as bespoke future integration work rather than a shortlist capability.

## Comparison at the Prototype Gate

| Criterion | Recraft-assisted + human animation | Krita + packer | Aseprite handoff |
| --- | --- | --- | --- |
| Generate initial non-pixel concepts | Yes, raster/vector API | No, hand-authored | No |
| Correct/cleanup | API editing plus human work | Direct human work | Limited frame/sheet preparation |
| Transparent output | Documented background removal; inspect alpha | Frame sequence can retain transparent layers; inspect export | PNG export is documented by Phaser's Aseprite instructions |
| Animation/sheet support | No documented animation/sheet endpoint | Frames, but no documented sheet packing in consulted guide | Documented sheet import/export; Phaser PNG+JSON handoff |
| Consistency mechanism | Reusable reference-based style, then human approval | Art direction and source files | Preserves supplied frames only |
| Commercial/provenance position | Paid/API terms grant ownership, but human clearance and records still needed | Artist owns work; track all external inputs | Editor permits commercial assets; track imported inputs |
| Published cost evidence | Variable API-unit consumption; unit is $0.001 | Free software | $19.99 minimum per developer |
| Official agent/MCP evidence | REST API only; no MCP found | No MCP found | No MCP found |

## Decision Criteria for a Human-Reviewed Prototype

1. Create the same four representative assets in each candidate route: recolorable chicken base, yellow chick, bush, and hay bale, plus one short idle/claim loop. Do not compare attractive isolated images.
2. Require a transparent PNG sheet with fixed cell dimensions, no clipped extremities, no visible alpha halo, and a reproducible source-to-export record.
3. Put each candidate into an active local match and judge the existing pass/fail rule at play speed: player identity, chick state, hiding-spot type, and claim ownership must remain readable without the scoreboard.
4. Review the set side by side for silhouette family, palette, line/edge treatment, scale, contrast against the Farmyard Stadium, and the ability to recolor one shared chicken base without loss of readability.
5. Compare total human minutes for one accepted asset and one accepted loop, including prompts, rejected generations, cleanup, frame alignment, packing, runtime import, and provenance entry. Use current vendor price pages at that time; API credit schedules and subscription prices change.
6. Before committing any AI-assisted runtime asset, have a human confirm the applicable paid/API rights, terms date, provenance metadata requirements, inputs' rights, and any visual-similarity concern. Keep source art, generation inputs, output identifiers, exports, and review decision together.

## Unresolved Questions

- What exact non-pixel visual language should the slice test: flat-vector, painted storybook, inked cartoon, or another bounded direction? A reusable AI style cannot replace that human art-direction decision.
- Does a Recraft paid subscription alone cover the intended prototype volume, or should any automated experiment use the separately metered API? Obtain the current plan and unit table immediately before a pilot.
- Can the first Phaser slice accept Aseprite PNG-plus-JSON metadata, or must it use a simple uniform-grid PNG sheet to honor the brief's initial avoidance of a full texture-atlas pipeline? Resolve with one disposable export/import test.
- What source-file and manifest fields will constitute sufficient provenance for human approval, especially for an AI candidate that has been substantially repainted?
- Is any vendor-published MCP configuration available at prototype time? None was established here for the non-pixel shortlist, so manual/API operation is the baseline.

## Sources Consulted

- [Chicken Olympics Art and Audio Slice Brief](../art-audio-slice-brief.md)
- [Phaser 4 LoaderPlugin API](https://docs.phaser.io/api-documentation/class/loader-loaderplugin#aseprite)
- [Recraft API documentation](https://www.recraft.ai/docs/api-reference)
- [Recraft pricing](https://www.recraft.ai/pricing)
- [Recraft terms of service and API terms](https://www.recraft.ai/legal/terms)
- [Krita animation manual](https://docs.krita.org/en/user_manual/animation.html)
- [Krita license](https://krita.org/en/about/license/)
- [Aseprite sprite-sheet documentation](https://www.aseprite.org/docs/sprite-sheet/)
- [Aseprite FAQ](https://www.aseprite.org/faq/#licensing-commercial)
- [Aseprite official source](https://github.com/aseprite/aseprite)
- [SpriteCook agent setup](https://spritecook.com/agents)
- [SpriteCook API reference](https://spritecook.com/api-docs)
