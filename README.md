[![npm version](https://badge.fury.io/js/%40planarally%2Fdice.svg)](https://www.npmjs.com/package/@planarally/dice)

# A babylon.js dice roller

This repository is home to 3d dice roller functionality for the babylon.js framework using havok as physics simulation.

!! This readme & all examples are currently outdated (release 0.5) and the API has drastically changed in 0.6 !!
As further API changes are expected on the short term, this page will be temporary locked to the older docs

## Usage

_For a rough example check the examples folder._

### Installation

`npm i @planarally/dice`

This package uses Ammo.js for the physics, it's however not a direct dependency because ammojs does not provide clean npm version packages.

Make sure you install Ammo.js on your own and pass the Ammo instance to the load function.

To install Ammo.js straight from github you can do:

`npm i github:kripken/ammo.js`

### Setup

1. Instantiate a `DiceThrower` class with either a canvas element or your own babylonjs scene.
2. Call the async `load` method on the instance to load ammojs and the dice meshes\*.

\*At this moment you need to manually specify your meshes e.g.
`await diceThrower.load("http://localhost:9998/some_meshes.babylon");`

A default set of dice meshes and uvs can be found in the examples folder,
in the future the aim is to include them in the core code as a default set without having to manually serve/load them.

### Throwing dice

Call `.throwDice` on your DiceThrower instance and provide it an array of dice to throw. This is a simple interface that has 1 mandatory field 'die' which can be any of the available dice. Some other optional fields are available to instantiate things like position, velocity etc.

The method returns an array of numbers with the results of the dice in the order as they were initially provided to the method.
The method will only return if all dice have stabilized, which currently is determined based on a treshold on what the linear and angular velocities are!

Examples

```typescript
const results = await diceThrower.throwDice([{ die: Dice.D20 }, { die: Dice.D6, position: new Vector3(2, 2, 2) }]);
```

### String format

An alternative and more advanced way is to parse a string representation.
This is done by instantiating a parser specifically for your system.
Currently only a DndParser is available.

```typescript
const parser = new DndParser(diceThrower);
const results = await parser.fromString("3d6 + 1d4 - 3 1d20+2-3d4");
results.length; // 2
results[0].total; // 7
results[0].details; // [{ input: '3d6', output: [1,5,3], type: 'dice' }, {input: '+', type: 'operator'}, ...]
```

What happens here is that a single string is taken as input, split into separate groups and then parsed, thrown and interpreted.
For each group a total and a detailled breakdown is available.

The same die options can be provided in this format by optionally specifying a list after your string that follows order of your dice.
E.g. `("2d6 1d4", [{position: new Vector3(1, 1, 2)}, undefined, {position: new Vector3(0, 1, 2)}])` sets the position for the first d6 and for the d4.

## Available dice

Currently a base set of classic dX dice is available. (d4,d6,d8,d10,d12,d20,d100)

I intend to open this up for other systems, either by simply providing a way to change the uv map of existing models or by providing custom models.
