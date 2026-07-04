# Remotion animation reference

All animation is a pure function of `useCurrentFrame()`. Compute a value for the
current frame and apply it to styles/props.

## interpolate

Maps a value from an input range to an output range.

```tsx
import { interpolate, Easing } from "remotion";

interpolate(frame, [0, 30], [0, 1]); // linear

// Multi-segment ranges (must be monotonically increasing input):
interpolate(frame, [0, 30, 60, 90], [0, 1, 1, 0]); // fade in, hold, fade out

// Easing:
interpolate(frame, [0, 30], [0, 1], {
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
```

Options: `extrapolateLeft`/`extrapolateRight` ∈ `"extend"` (default) | `"clamp"` |
`"identity"` | `"wrap"`. **Clamp by default** unless you intentionally want the
value to keep moving past the range.

### Easing

`Easing.linear`, `Easing.ease`, `Easing.quad`, `Easing.cubic`, `Easing.sin`,
`Easing.circle`, `Easing.exp`, `Easing.bounce`, `Easing.elastic(n)`,
`Easing.bezier(x1,y1,x2,y2)`. Wrap with `Easing.in()`, `Easing.out()`,
`Easing.inOut()` (e.g. `Easing.out(Easing.cubic)`).

## spring

Physics-based motion. Returns ~0 → ~1 by default.

```tsx
import { spring } from "remotion";

const value = spring({
  frame,
  fps,                       // from useVideoConfig()
  config: {
    damping: 200,            // higher = less oscillation (10 = bouncy)
    mass: 1,
    stiffness: 100,
    overshootClamping: false,
  },
  durationInFrames: 30,      // optional: stretch the spring to N frames
  delay: 10,                 // optional: start after N frames
  from: 0,
  to: 1,
});
```

Combine with `interpolate` to map the 0→1 spring onto any range:
```tsx
const progress = spring({ frame, fps });
const x = interpolate(progress, [0, 1], [-200, 0]);
```

Use `measureSpring({ threshold, fps, config })` to know how many frames a spring
needs to settle.

## interpolateColors

```tsx
import { interpolateColors } from "remotion";
const color = interpolateColors(frame, [0, 30], ["#ff0000", "#0000ff"]);
```

## random (deterministic)

Never use `Math.random()` — it breaks determinism across frames/renders.

```tsx
import { random } from "remotion";
const jitter = random("particle-3") * 10; // stable per seed
```

## Measuring DOM (text/layout)

Use `@remotion/layout-utils` `measureText(...)` or a ref + `getBoundingClientRect`
inside `useEffect`. When measurement gates the first frame, wrap with
`delayRender`/`continueRender` so the frame isn't captured before layout is ready.

## Transforms

Prefer CSS `transform` (GPU-friendly, subpixel accurate):
```tsx
style={{ transform: `translateX(${x}px) scale(${scale}) rotate(${deg}deg)` }}
```
