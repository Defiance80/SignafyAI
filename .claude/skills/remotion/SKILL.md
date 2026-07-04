---
name: remotion
description: >-
  Build programmatic videos with Remotion — the React framework for rendering
  MP4/WebM/GIF from components. Use when creating, editing, or rendering videos
  in code: motion graphics, animated explainers, data-driven video, social clips,
  or embedding a video preview in a React/Next.js app with @remotion/player.
  Triggers on "Remotion", "render a video", "programmatic video", "animated
  video from React", "useCurrentFrame", "Composition", "@remotion/player".
---

# Remotion

Remotion renders real MP4/WebM/GIF/audio from React components. Every frame is a
React render at a specific frame number; animation is a pure function of the
current frame. There is no imperative timeline — you compute what the screen
looks like at frame `f` and Remotion captures frames sequentially with headless
Chromium.

## Mental model (read first)

- **Time is a number.** `useCurrentFrame()` returns the current frame (0-indexed).
  Convert to seconds with `frame / fps`. Never use `setTimeout`, `Date.now()`,
  `requestAnimationFrame`, or wall-clock time to drive animation — renders run
  faster/slower than realtime and must be deterministic.
- **Everything is deterministic.** Same frame → same pixels. Avoid `Math.random()`
  (use `random("seed")` from `remotion`), and don't mutate state across frames.
- **Composition = the video's config.** `<Composition>` declares `id`, the React
  `component`, `durationInFrames`, `fps`, `width`, `height`, and default `props`.
- **Layout is absolute.** Use `<AbsoluteFill>` (a full-frame absolutely-positioned
  div) as the base layer and stack layers on top.

## Project layout

```
src/
  index.ts        # registerRoot(RemotionRoot)
  Root.tsx        # <Composition> registrations
  MyVideo.tsx     # the actual video component
public/           # assets referenced via staticFile()
remotion.config.ts
```

`src/index.ts`:
```ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";
registerRoot(RemotionRoot);
```

`src/Root.tsx`:
```tsx
import { Composition } from "remotion";
import { MyVideo } from "./MyVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MyVideo"
      component={MyVideo}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ title: "Hello" }}
    />
  );
};
```

## Animating: interpolate and spring

Read `references/animation.md` for the full API. The two workhorses:

```tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Linear/eased mapping of frame → value. ALWAYS clamp unless you want extrapolation.
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});

// Natural physics-based motion (0 → 1 by default).
const scale = spring({ frame, fps, config: { damping: 200 } });
```

## Sequencing

- `<Sequence from={30} durationInFrames={60}>` shifts children's timeline so their
  `useCurrentFrame()` starts at 0 when the sequence begins, and only mounts them
  within the window.
- `<Series>` / `<Series.Sequence durationInFrames={n}>` plays children
  back-to-back without computing offsets by hand.
- `<Loop durationInFrames={n}>` repeats children.
- `<Freeze frame={n}>` pins children to a single frame.

## Assets

- Reference bundled files with `staticFile("logo.png")` (files in `public/`).
- Media components: `<Img>`, `<Audio>`, `<Video>` / `<OffthreadVideo>` (prefer
  `OffthreadVideo` when rendering — it's more accurate/faster), `<IFrame>`, `<Gif>`
  (from `@remotion/gif`).
- Load remote/async data with `delayRender()` + `continueRender()`:

```tsx
const [handle] = useState(() => delayRender("fetching data"));
useEffect(() => {
  fetch(url).then(r => r.json()).then(d => { setData(d); continueRender(handle); });
}, []);
```

## CLI (verify commands before claiming they work)

```bash
npx remotion studio                 # interactive preview/editor at localhost:3000
npx remotion render <id> out.mp4    # render a composition to file
npx remotion render <id> out.mp4 --props='{"title":"Hi"}'
npx remotion still <id> out.png --frame=42
npx remotion compositions           # list composition ids
npx remotion upgrade                # bump all @remotion/* packages together
```

**Version rule:** every `@remotion/*` and `remotion` package MUST share the exact
same version. Never bump one in isolation — use `npx remotion upgrade`.

## Embedding a preview in React / Next.js

Use `@remotion/player` — this renders in the browser, no server needed:

```tsx
"use client";
import { Player } from "@remotion/player";
import { MyVideo } from "../remotion/MyVideo";

<Player
  component={MyVideo}
  durationInFrames={150}
  fps={30}
  compositionWidth={1920}
  compositionHeight={1080}
  inputProps={{ title: "Hello" }}
  controls
  style={{ width: "100%" }}
/>
```

In Next.js the Player must be a Client Component (`"use client"`). For
server-side rendering of actual files, use `@remotion/renderer`
(`renderMedia` / `selectComposition` / `getCompositions`) or Remotion Lambda
(`@remotion/lambda`) — see `references/rendering.md`.

## Common mistakes

- Using wall-clock time or `requestAnimationFrame` instead of `useCurrentFrame()`.
- Forgetting `extrapolateLeft/Right: "clamp"` on `interpolate`, so values overshoot.
- Hardcoding fps/dimensions instead of reading `useVideoConfig()`.
- Passing non-serializable props (functions, class instances) via `defaultProps`/
  `inputProps` — props must be JSON-serializable to survive the render boundary.
- Mismatched `@remotion/*` versions.
- Referencing files by relative path instead of `staticFile()`.
- Animation state that depends on previous frames rather than being a pure
  function of the current frame.

## Reference files

- `references/animation.md` — interpolate, spring, Easing, interpolateColors, measuring.
- `references/rendering.md` — SSR (`@remotion/renderer`), Lambda, GIF/audio output.
- `references/setup.md` — adding Remotion to an existing (Next.js) project from scratch.
