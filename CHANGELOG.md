# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

## [0.9.0] - 2026-11-19

Babylonjs engine is upgraded from v8 to v9.

### Changed

-   `@babylonjs/core` and `@babylonjs/havok` are now peer dependencies and must be installed by the consuming project
-   `@babylonjs/inspector` is no longer a dependency
-   [3d] The `tresholds` option and property of `DiceThrower` are renamed to `thresholds`
-   [3d] `loadMeshes` now defaults to the DiceThrower's scene instead of the last created scene
-   The package is now published as native ES modules (`"type": "module"`)
-   [core] `rollString` and `rollParts` infer the roll options type from the dice system and return results typed with the system's parts
-   README and examples are rewritten for the current API, the webpack example is replaced by a Vite example

### Removed

-   [3d] `DiceThrower.loadSystem`, `DiceThrower.rollString` and `DiceThrower.rollParts`, use `rollString` and `rollParts` from `@planarally/dice/core` with the system and the thrower in its options instead

### Fixed

-   [System:Dx] 2D rolls were biased: the lowest and highest value of a die were half as likely as the others
-   [3d] Rolls never finished when using your own render loop instead of `startRenderLoop`
-   [3d] Rolls with many dice could stop being checked before all dice were thrown, never finishing
-   [3d] Rolls never finished when a die didn't settle, they're now rejected after a configurable `timeout` (default 30s)
-   [3d] `remove` and `removeAll` now reject rolls that are still in progress instead of leaving them pending
-   [3d] `remove` and `removeAll` now also remove the dice of finished rolls that are waiting for `clearAfter`
-   [System:Dx] `k` and `p` without `h`/`l` kept or dropped nothing, they now keep the highest and drop the lowest dice
-   [System:Dx] Unsupported input was silently ignored, `parse` now throws instead: dice without a 3D mesh like `1d7` in `DX3` (they still work in 2D), parts not joined by `+`/`-`, unrecognised text, empty input and the `rr`, `ro`, `ra` and `e` modifiers, which were parsed but never evaluated
-   [3d] A die could be judged as stopped at the top of a bounce, it now has to stay below the `thresholds` for `stableFrames` consecutive physics steps (default 10)
-   [3d] Dice thrown without custom physics always flew towards the same corner and spun the same way
-   [3d] Coloured dice leaked their cloned material and textures every roll, dice of the same type and colour now share one material
-   [3d] Failed rolls are rejected with an `Error` describing what went wrong
-   [System:Dx,3d] Importing the 3D dice system no longer pulls the entire babylon.js library into the bundle

## [0.8.0] - 2025-08-09

Babylonjs engine is upgraded from v7 to v8.

### Changed

-   [3d] The raycast to check the hit is now stricter and explicitly only interacts with the mesh it's supposed to check

### Fixed

-   [System:Dx,3d] D4 was not using the correct pick vector, causing arbitrary results

## [0.7.1] - 2025-03-12

### Fixed

-   [System:Dx,3d] D100 handling was not correct when multiple d100s were rolled at once

## [0.7.0] - 2025-01-11

-   [3d] throwDice returns thrown dieName to handle mixed rolls
-   [3d] Add ability to configure dice clear timeout
    -   Setting to a negative timeout disables automatic clearing
-   [3d] Add friction and restitution to dice
-   [System:Dx] Handle d100 rolls properly + support for either 0-99 or 1-100 mode
    -   d100 rolls with 3d dice will now automatically roll a d100 and a d10 and accumulate the results into 1 number, this brings it in line with the 2d behaviour

## [0.6.0] - 2024-08-10

This is a release that changes a lot to the API!
The next minor release will likely do even more changes, by moving this repo to a monorepo.
This will be done in order to offer a fully non-3D package as well as one with 3D features.

### Changed

-   Upgraded babylonjs from 4 to 7
    -   This also changes the physics engine from ammo to havok
-   Almost everything non-3d related has been rewritten
-   Separate parts of the code are now exported on specific exports in the package.json

## [0.5.0] - 2022-05-25

### Added

-   Multi dice throws.
    -   You can pass `resetAllDice: false` as an option to the various throw APIs to not reset previous dice
    -   Only dice with the same `key` will reset in this case
    -   You can pass a specific `key` or let the API generate a unique key

## [0.4.0] - 2022-04-07

### Added

-   `Parser.fromString` now also accepts a single Options object if the same options apply to all dice
-   `tresholds` option to DiceThrower constructor to override the default stop tresholds
-   Optional callback parameter to throwDice and parser functions to modify the die mesh
-   `freezeOnDecision` option to freeze the dice when the stop condition has been reached
-   `engineOptions` option to the DiceThrower constructor to alter the babylonjs Engine creation

### Changed

-   Removed option to pass `undefined` to `Parser` for diceThrower instance
-   Angular stop treshold lowered from 0.1 to 0.075
-   `DiceThrower.reset` made public

## [0.3.0] - 2021-07-24

### Changed

-   DiceThrower.load now takes an `ammo` parameter to pass an ammo instance
-   ammo.js dependency has been moved to a peer dependency and has to be installed separately
-   Improved tree-shakeability of babylonjs

## [0.2.0] - 2021-06-06

### Added

-   DieOptions.color is a new optional parameter (string) that can be passed to set the albedoColor of the mesh.

## [0.1.2] - 2021-06-09

### Fixed

-   Options.position was not being used
-   Options.angular was not being used

## [0.1.1] - 2021-03-28

### Fixed

-   Invert vector for d4 value detection
-   Update d10/d100 value detection code

## [0.1.0] - 2021-03-27

Initial release
