# babylonjs-dice

This repository is home to 3d dice roller functionality for the babylon.js framework using ammo.js as physics simulation.

## Usage

_For a rough exampe check the examples folder._

### Setup

1. Instantiate a `DiceThrower` class with either a canvas element or your own babylonjs scene.
2. Call the async `load` method on the instance to load ammojs and the dice meshes.

### Throwing dice

Call `.throwDice` on your DiceThrower instance and provide it an array of dice to throw. This is a simple interface that has 1 mandatory field 'die' which can be any of the available dice. Some other optional fields are available to instantiate things like position, velocity etc.

The method returns an array of numbers with the results of the dice in the order as they were initially provided to the method.
The method will only return if all dice have stabilized, which currently is determined based on a treshold on what the linear and angular velocities are!

Examples

```
const results = await diceThrower.throwDice([{ die: Dice.D20 }, { die: Dice.D6, position: new Vector3(2, 2, 2) } ]);
```

### String format

An alternative way is to parse a string representation.

```
const results = await diceThrower.throwDice(optionsFromString("3d6 + 2d4"));
```

This format is however subject to change very soon as it is very inflexible.

The goal is to create a generic parser class with implementations for various systems out there in such a way that:

input -> parse -> throw dice -> interpret results -> output

## Available dice

Currently a base set of classic dX dice is available. (d4,d6,d8,d10,d12,d20,d100)

I intend to open this up for other systems, either by simply providing a way to change the uv map of existing models or by providing custom models.
