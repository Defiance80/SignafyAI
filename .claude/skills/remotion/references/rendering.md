# Remotion rendering reference

Three ways to turn a composition into a file: the CLI, server-side rendering
(`@remotion/renderer`), and Remotion Lambda for scale.

## CLI

```bash
npx remotion render <composition-id> out/video.mp4
npx remotion render MyVideo out.mp4 --props='{"title":"Hi"}'
npx remotion render MyVideo out.mp4 --frames=0-59       # partial range
npx remotion render MyVideo out.webm --codec=vp8        # WebM
npx remotion render MyVideo out.gif                     # GIF (set reasonable fps)
npx remotion render MyVideo out.mp4 --scale=2           # 2x resolution
npx remotion still MyVideo out.png --frame=30           # single frame
```

Common flags: `--codec` (h264|h265|vp8|vp9|prores|gif|mp3|aac|wav),
`--crf` (quality), `--concurrency`, `--image-format` (jpeg|png),
`--pixel-format`, `--muted`, `--log=verbose`.

## Server-side rendering (@remotion/renderer)

For rendering from a Node backend / API route. Bundle once, then render.

```ts
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";

const serveUrl = await bundle({
  entryPoint: path.resolve("./src/index.ts"),
  // webpackOverride optional
});

const composition = await selectComposition({
  serveUrl,
  id: "MyVideo",
  inputProps: { title: "Rendered" },
});

await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: "out/video.mp4",
  inputProps: { title: "Rendered" },
});
```

- `getCompositions(serveUrl)` lists all compositions.
- `renderStill({ composition, serveUrl, output, frame })` for a single image.
- `renderMedia` accepts `onProgress`, `concurrency`, `crf`, `imageFormat`, etc.
- Requires a Chromium/Chrome-headless-shell; Remotion downloads one automatically,
  or point at an existing binary via `browserExecutable`.
- **Do not** run heavy renders directly inside a Next.js serverless function
  (memory/time limits) — use a dedicated worker, container, or Lambda.

## Remotion Lambda (@remotion/lambda)

For parallel/scalable cloud rendering (AWS). Deploy a function + a site, then
trigger renders that fan out across Lambda invocations.

```ts
import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";

const { renderId, bucketName } = await renderMediaOnLambda({
  region: "us-east-1",
  functionName,
  serveUrl,        // deployed site url
  composition: "MyVideo",
  inputProps: {},
  codec: "h264",
});

const progress = await getRenderProgress({ renderId, bucketName, functionName, region });
```

Setup: `npx remotion lambda functions deploy`, `npx remotion lambda sites create`.
Needs AWS credentials + IAM permissions (see Remotion Lambda setup docs).

## Output formats quick pick

- MP4 (h264): default, broad compatibility.
- WebM (vp8/vp9): smaller, web-native, supports alpha (vp8/vp9 + `--pixel-format=yuva420p`).
- ProRes: editing/alpha, large files.
- GIF: silent loops; keep fps low (10–15) and dimensions modest.
- MP3/AAC/WAV: audio-only compositions.
