[![npm version](https://badge.fury.io/js/%40planarally%2Fdice.svg)](https://www.npmjs.com/package/@planarally/dice)

# Planarally Dice

Dice rolling for the browser: parse a roll string like `4d6kh3 + 2`, roll it, and get a total plus a breakdown per part.
Rolls can be resolved with plain random numbers, or by throwing 3D dice in a [babylon.js](https://www.babylonjs.com/) scene with [Havok](https://doc.babylonjs.com/features/featuresDeepDive/physics/havokPlugin) physics.

This library powers the dice in [PlanarAlly](https://github.com/Kruptein/PlanarAlly).

## Installation

```sh
npm i @planarally/dice @babylonjs/core @babylonjs/havok
```

`@babylonjs/core` (v9) and `@babylonjs/havok` are peer dependencies, so your project controls which version is used and only a single copy of Babylon ends up in your bundle.
They are only loaded when you use the 3D dice.

The package is published as ES modules and exposes three entry points:

| Entry point                   | Contents                                                  |
| ----------------------------- | --------------------------------------------------------- |
| `@planarally/dice/core`       | `rollString`, `rollParts`, `SYSTEMS` and the result types |
| `@planarally/dice/3d`         | `DiceThrower`, which runs the 3D dice simulation          |
| `@planarally/dice/systems/dx` | Types and config of the dX dice system                    |

## Rolling without 3D dice

Dice systems are loaded lazily through `SYSTEMS`. The `DX` system handles classic dX notation and rolls using `Math.random`.

```typescript
import { rollString, SYSTEMS } from "@planarally/dice/core";

const { DX } = await SYSTEMS.DX();
const roll = await rollString("4d6kh3 + 2", DX, { d100Mode: 100 });

roll.result; // "14"
roll.parts; // one entry per die group, operator and literal, see "Results" below
```

## Rolling with 3D dice

### 1. Create a dice thrower

```typescript
import { DiceThrower } from "@planarally/dice/3d";

const thrower = new DiceThrower({ canvas: document.getElementById("babylon") as HTMLCanvasElement });

await thrower.loadPhysics();
await thrower.loadMeshes("/meshes/dnd.babylon");
```

- Pass either a `canvas` (a new engine and scene are created) or an existing babylon `scene`. The scene is available as `thrower.scene`.
- `loadPhysics(gravity?)` enables Havok on the scene. It has to run before you create any physics bodies, including your own dice box.
- `loadMeshes(url)` loads the dice meshes. A ready-to-use set of D&D dice is in [`examples/meshes`](examples/meshes), you need to serve those files yourself.

Other constructor options:

| Option         | Default                                        | Description                                                                        |
| -------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `tresholds`    | `{ linear: 0.1, angular: 0.075 }`              | Velocities below which a die counts as stopped                                     |
| `physics`      | `{ mass: 20, friction: 0.5, restitution: 0.3 }` | Physics properties of every die                                                    |
| `clearAfter`   | `5000`                                         | Milliseconds after a roll before its dice are removed, negative to keep them around |
| `antialias`    | -                                              | Passed to the babylon `Engine` when a canvas is provided                           |
| `engineOptions` | -                                             | Passed to the babylon `Engine` when a canvas is provided                           |

### 2. Set up the scene

The thrower only handles the dice. Camera, lights and something to stop the dice from rolling away are up to you:

```typescript
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PhysicsAggregate, PhysicsShapeType } from "@babylonjs/core/Physics";

const scene = thrower.scene;

new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 5, 40, Vector3.Zero(), scene);
new HemisphericLight("light", new Vector3(0, 1, 0), scene);

const ground = MeshBuilder.CreateGround("ground", { width: 20, height: 20 }, scene);
new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 });
// ...and some walls, see examples/basic/environment.ts

thrower.startRenderLoop();
```

### 3. Roll

Use the `DX3` system, which throws a die in the scene for every die in the roll string and reads the result from the face that ends up on top.

```typescript
import { rollString, SYSTEMS } from "@planarally/dice/core";

const { DX3 } = await SYSTEMS.DX3();
const roll = await rollString("2d20kh1 + 5", DX3, {
    thrower,
    d100Mode: 100,
    dieDefaults: { color: "#b83232" },
});
```

`dieDefaults` applies to every thrown die:

- `color`: a hex colour that replaces the die's albedo colour.
- `physics`: a function returning the starting `position`, `rotation`, `linear` and `angular` velocity of a die, any of which may be omitted. By default dice start at `(0, 10, 0)` with a random rotation and velocity.

If you want to throw dice yourself without a dice system, `thrower.throwDice([{ name: "d20" }])` resolves with the mesh face that ended up on top for every die. Mapping faces to values is what the dice systems do for you.

## Roll string syntax (DX)

| Syntax     | Meaning                                                   | Example            |
| ---------- | --------------------------------------------------------- | ------------------ |
| `XdY`      | Roll X dice with Y sides (d4, d6, d8, d10, d12, d20, d100) | `3d6`              |
| `+` / `-`  | Add or subtract the next part                             | `1d20 + 1d4 - 1`   |
| `N`        | A fixed number                                            | `5`                |
| `khN`/`klN` | Keep the N highest/lowest dice                           | `2d20kh1`          |
| `phN`/`plN` | Drop the N highest/lowest dice                           | `4d6pl1`           |
| `k>N`/`k<N`/`k=N` | Keep dice above/below/equal to N                   | `5d10k>7`          |
| `p>N`/`p<N`/`p=N` | Drop dice above/below/equal to N                   | `5d10p<3`          |
| `miN`/`maN` | Raise every die to at least N, or lower to at most N     | `4d6mi2`, `2d8ma6` |

`d100Mode` controls how a d100 result of 00 and 0 is reported: `100` reports it as 100, `0` as 0.

## Results

`rollString` resolves to:

```typescript
{
    result: "25",
    parts: [
        { input: "2d20kh1", shortResult: "20", longResult: "*20*,12", ... },
        { input: "+", shortResult: "+", ... },
        { input: "5", shortResult: "5", ... },
    ],
}
```

- `shortResult` is the value a part contributes to the total.
- `longResult` (dice only) lists every die. Kept dice are wrapped in `*`, dropped dice and values replaced by `mi`/`ma` are wrapped in `~`.

## Bundler notes

Havok loads `HavokPhysics.wasm` relative to its own module. Vite's dependency pre-bundling breaks that path, so exclude it:

```typescript
// vite.config.ts
export default defineConfig({
    optimizeDeps: { exclude: ["@babylonjs/havok"] },
});
```

## Examples

- [`examples/vite`](examples/vite): a runnable page with a roll input, start it with `npm run dev`.
- [`examples/basic`](examples/basic): the minimal code to set up a scene and roll, to drop into your own project.
