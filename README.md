# Molstar Partial Charges

![npm](https://img.shields.io/npm/v/molstar-partial-charges?color=pink&style=flat-square)
![NPM](https://img.shields.io/npm/l/molstar-partial-charges?color=pink&style=flat-square)

[Mol\* (/'mol-star/)](https://github.com/molstar/molstar) plugin for viewing partial atomic charges.

## Install

    npm i molstar-partial-charges

## Development

    npm i
    npm run dev

### Build for production:

    npm run build

## mmCIF categories

In order for the plugin to work you will need to specify these mmcif categories:

    _sb_ncbr_partial_atomic_charges_meta.id         # id of the charges (e.g. 1)
    _sb_ncbr_partial_atomic_charges_meta.type       # type of the charges (optional, e.g. 'empirical')
    _sb_ncbr_partial_atomic_charges_meta.method     # calculation method name (e.g. 'QEq', 'SQE+qp/Schindler 2021 (PUB_pept)')

    _sb_ncbr_partial_atomic_charges.type_id         # id of the charges (pointer to _sb_ncbr_partial_atomic_charges_meta.id)
    _sb_ncbr_partial_atomic_charges.atom_id         # atom id (pointer to _atom_site.id)
    _sb_ncbr_partial_atomic_charges.charge          # partial atomic charge 

For examples see [here](https://github.com/MergunFrimen/molstar-partial-charges/blob/f38f38d73d8deb0cf8f3c7213d6301f603031617/examples/2_4_dinitrophenol.charges.cif#L59-L68) and [here](https://github.com/MergunFrimen/molstar-partial-charges/blob/f38f38d73d8deb0cf8f3c7213d6301f603031617/examples/3bj1.charges.cif#L7265-L7274).

## License

MIT
