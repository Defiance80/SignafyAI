# Adding Remotion to an existing project

## Fresh standalone project

```bash
npx create-video@latest   # scaffolds a full Remotion project (pick a template)
```

## Add to an existing Next.js / React app (this repo's case)

Install core packages (keep versions identical across all `@remotion/*`):

```bash
npm i remotion @remotion/cli
# optional, per need:
npm i @remotion/player          # in-browser preview component
npm i @remotion/bundler @remotion/renderer   # server-side rendering
npm i @remotion/lambda          # cloud rendering
npm i @remotion/gif @remotion/google-fonts @remotion/shapes @remotion/motion-blur
```

Suggested structure alongside the Next app (keep Remotion source separate from
`app/` route code so the studio bundler doesn't pull in server-only modules):

```
src/remotion/
  index.ts        # registerRoot(RemotionRoot)
  Root.tsx        # <Composition> registrations
  <Video>.tsx     # compositions
remotion.config.ts
```

`remotion.config.ts` (studio/CLI config — NOT used by @remotion/player):

```ts
import { Config } from "@remotion/cli/config";
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Config.setConcurrency(4);
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "remotion:studio": "remotion studio src/remotion/index.ts",
    "remotion:render": "remotion render src/remotion/index.ts"
  }
}
```

### Next.js gotchas

- `@remotion/player` runs client-side only → the file using `<Player>` needs
  `"use client"`.
- Don't import `@remotion/renderer` / `@remotion/bundler` into client bundles or
  edge runtime — they're Node-only. Use them in a Node route handler, a script,
  or a background worker.
- Next may need `serverExternalPackages: ["@remotion/bundler", "@remotion/renderer"]`
  (Next 15+) / `experimental.serverComponentsExternalPackages` (older) so these
  aren't bundled.
- Props passed to compositions must be JSON-serializable.

### Verify it works

```bash
npm run remotion:studio      # opens studio, confirms compositions load
npx remotion compositions src/remotion/index.ts   # lists composition ids
```
