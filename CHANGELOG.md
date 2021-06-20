# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Changed

-   DiceThrower.load now takes an optional `ammo` parameter to pass an ammo instance
-   ammo.js dependency has been moved to a peer dependency and will only be dynamically imported if not provided otherwise

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
