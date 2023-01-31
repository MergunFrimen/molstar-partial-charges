# Molstar Partial Charges

Molstar plugin for viewing charges of atoms and residues.

This plugin is based on the [Molstar](https://molstar.org/) library and uses the [mmCIF](https://mmcif.wwpdb.org/) format for storing the data about atomic partial charges. It was created for [ACC2](https://acc2.ncbr.muni.cz/) and [αCharges](https://alphacharges.ncbr.muni.cz/), however, it can be used in other projects that uses the same mmCIF format for storing atomic partial charges.

<!--
## Requirements

- [Node.js](https://nodejs.org/en/)

## Install

To add the plugin to your project you have two options:

- You can either install the NPM package and import the plugin:

```bash
$ npm install molstar-partial-charges
```
```js
import { MolstarPartialCharges } from 'molstar-partial-charges';
 ```

- or add it with script tag to your HTML file:

```html
<script src="TODO">
```

## Usage

To initialize the plugin do:

```js
const root = 'root'; // the DOM element to attach the plugin to
const plugin = new MolstarPartialCharges();

plugin.init(root, specs).then(async () => {
    await plugin.load(url);
});
```

To load a structure from

## Development

For development, you need to have Node.js installed. Then, clone the repository and install the dependencies:

```
$ npm i
$ npm run dev
```

## Custom mmCIF categories

In order to use the plugin, you need to provide custom mmCIF categories. The categories are described [here]() **TODO**.

```text
partial_atomic_charges.type_id
partial_atomic_charges.atom_id
partial_atomic_charges.charge

partial_atomic_charges_meta.id
partial_atomic_charges_meta.type
partial_atomic_charges_meta.method
```

## License

MIT
 -->
