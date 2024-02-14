import './style.css';
import MolstarPartialCharges from '../src/viewer';
import { BuiltInTrajectoryFormat } from 'molstar/lib/mol-plugin-state/formats/trajectory';
import { MmcifFormat } from 'molstar/lib/mol-model-formats/structure/mmcif';
import { SbNcbrPartialChargesPropertyProvider } from '../src/extension/property';
import { TargetWebApp } from '../src/types';

/**
 * Example use of the plugin wrapper
 */

let current_example = 0;
let charge = 0;

const url_prefix = 'http://127.0.0.1:5500/examples/';
const examples = ['P00791_added_H.cif', '1c0q.cif.charges.cif', '1tqn.cif'];
const default_structure_url = url_prefix + examples[current_example];

const molstar = await MolstarPartialCharges.create('app', { MAQualityAssessment: true, SbNcbrPartialCharges: true });

let color = 'relative';

// for debugging purposes
declare global {
    interface Window {
        molstar: MolstarPartialCharges;
    }
}
window.molstar = molstar;

// Initialize Mol* and load the default structure
(async () => {
    await load(default_structure_url, 'mmcif', 'ACC2');
})().then(
    () => {},
    (e) => console.error('Molstar Partial Charges initialization failed', e)
);

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

addHeader('View');
addControl('Default\n(=Cartoon)', async () => await molstar.type.default(), 'controls-view-default');
addControl('Surface', async () => await molstar.type.surface());
addControl('Ball and stick', async () => await molstar.type.ballAndStick());

addHeader('', 'controls-charge-header');
addControl('AlphaFold', async () => await molstar.color.alphaFold());
addControl('Default', async () => {
    await molstar.color.default();
    color = 'default';
});
addControl('Relative', async () => {
    await molstar.color.relative();
    color = 'relative';
});
addControl('Reset', async () => {
    const value = molstar.charges.getMaxCharge();
    await updateSliderMax(value);
});
addSlider('charge-slider', 0, 1, 0.01, async () => {
    const slider = document.getElementById('charge-slider') as HTMLInputElement;
    if (!slider) return;
    const chg = Number(slider.value);
    await updateCharge(chg);
});

addHeader('Charge set');
addDropdown('charge-set-dropdown', [], async (value) => {
    if (isNaN(Number(value))) return;
    molstar.charges.setTypeId(Number(value));
    const typeId = molstar.charges.getTypeId();
    console.assert(typeId === Number(value));
    if (color === 'relative') {
        await molstar.color.relative();
    } else if (color === 'default') {
        await molstar.color.default();
    } else if (color === 'absolute') {
        const slider = document.getElementById('charge-slider') as HTMLInputElement;
        if (!slider) return;
        const chg = Number(slider.value);
        await updateCharge(chg);
    } else {
        console.error('Unknown color type');
    }
});

addHeader('Load');
addControl('Previous example', () => nextExample(current_example - 1));
addControl('Next example', () => nextExample(current_example + 1));
addDropdown('examples-dropdown', examples, async (value) => {
    current_example = examples.indexOf(value);
    await load(url_prefix + value, 'mmcif', 'ACC2');
});
addControl('Wrong structure', async () => await loadWrongStructure());

let last_index = -1;
let stop: boolean = true;
addHeader('Test');
addControl('Test loci labels', async () => {
    stop = !stop;
    testLociLabels();
});

async function loadWrongStructure() {
    await molstar.load(url_prefix + 'Q55GB6_added_H.pdb', 'pdb', 'AlphaCharges');
    await molstar.color.default();
    await molstar.type.ballAndStick();
    await molstar.behavior.focus({ labelCompId: 'GLN', labelAtomId: 'CD', labelSeqId: 33 });
}

async function load(url: string, format: BuiltInTrajectoryFormat = 'mmcif', target: TargetWebApp = 'ACC2') {
    await molstar.load(url, format, target);
    const cartoonOff = switchOffCartoonView();
    if (cartoonOff) {
        await molstar.type.ballAndStick();
    } else {
        await molstar.type.default();
    }
    const relativeCharge = Number(molstar.charges.getMaxCharge().toFixed(4));
    await updateSliderMax(relativeCharge);
    await updateCharge(relativeCharge);
    color = 'relative';
    await molstar.color.relative();

    addOptionsToDropdown('charge-set-dropdown', molstar.charges.getMethodNames());
}

function switchOffCartoonView() {
    const view = document.getElementById('controls-view-default');
    if (!view) return false;
    if (!molstar.type.isDefaultApplicable()) {
        view.setAttribute('disabled', 'true');
        return true;
    } else {
        view.removeAttribute('disabled');
        return false;
    }
}

function updateChargeTitle(chg: number) {
    const header = document.getElementById('controls-charge-header') as HTMLHeadingElement;
    if (!header || isNaN(chg)) return;
    charge = Number(chg.toFixed(4));
    header.innerText = `Charge (${charge.toFixed(4)})`;
}

async function updateCharge(chg: number) {
    const slider = document.getElementById('charge-slider') as HTMLInputElement;
    if (!slider) return;
    if (isNaN(chg)) return;
    charge = Number(chg.toFixed(4));
    updateChargeTitle(charge);
    slider.value = `${charge.toFixed(4)}`;
    await molstar.color.absolute(charge);
    color = 'absolute';
}

function addControl(label: string, action: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null, id?: string) {
    const btn = document.createElement('button');
    btn.onclick = action;
    btn.innerText = label;
    if (id) btn.setAttribute('id', id);
    document.getElementById('controls')?.appendChild(btn);
}

function addHeader(header: string, id?: string) {
    const hr = document.createElement('hr');
    document.getElementById('controls')?.appendChild(hr);
    const h = document.createElement('h3');
    h.innerText = header;
    if (id) h.setAttribute('id', id);
    document.getElementById('controls')?.appendChild(h);
}

function addSlider(id: string, min: number, max: number, step: number, action) {
    const slider = document.createElement('input');
    slider.setAttribute('id', id);
    slider.setAttribute('class', 'slider');
    slider.setAttribute('type', 'range');
    slider.setAttribute('min', `${min}`);
    slider.setAttribute('max', `${max}`);
    slider.setAttribute('value', `${max}`);
    slider.setAttribute('step', `${step}`);
    slider.oninput = action;
    document.getElementById('controls')?.appendChild(slider);
}

async function updateSliderMax(max: number) {
    const slider = document.getElementById('charge-slider') as HTMLInputElement;
    if (!slider) return;
    slider.max = max.toFixed(4);
    slider.value = max.toFixed(4);
    updateChargeTitle(max);
}

async function nextExample(next: number) {
    current_example = (next + examples.length) % examples.length;
    const select = document.getElementById('examples-dropdown') as HTMLSelectElement;
    if (!select) return;
    select.value = examples[current_example];
    await load(url_prefix + `${examples[current_example % examples.length]}`, 'mmcif', 'ACC2');
}

function addDropdown(id: string, options: string[], action: (value: string) => any) {
    const select = document.createElement('select');
    select.setAttribute('id', id);
    for (const option of options) {
        const opt = document.createElement('option');
        opt.setAttribute('value', option);
        opt.innerText = option;
        select.appendChild(opt);
    }
    select.onchange = () => action(select.value);
    document.getElementById('controls')?.appendChild(select);
}

function addOptionsToDropdown(id: string, options: string[]) {
    const select = document.getElementById(id) as HTMLSelectElement;
    if (!select) return;
    // remove all options
    select.options.length = 0;
    for (const option of options) {
        const opt = document.createElement('option');
        opt.setAttribute('value', (options.indexOf(option) + 1).toString());
        opt.innerText = option;
        select.appendChild(opt);
    }
}

async function testLociLabels() {
    const model = molstar.getModel();
    if (!model) throw new Error('No model loaded.');
    const sourceData = model.sourceData as MmcifFormat;
    const atomCount = model.atomicHierarchy.atoms._rowCount;
    while (true) {
        if (stop) return;
        last_index = (last_index + 1) % atomCount;

        // indexing from 0
        const label_asym_id = sourceData.data.db.atom_site.label_asym_id.value(last_index); // chain
        const label_comp_id = sourceData.data.db.atom_site.label_comp_id.value(last_index); // residue
        const label_seq_id = sourceData.data.db.atom_site.label_seq_id.value(last_index); // residue number
        const label_atom_id = sourceData.data.db.atom_site.label_atom_id.value(last_index); // atom
        const label_alt_id = sourceData.data.db.atom_site.label_alt_id.value(last_index); // altloc
        const data = SbNcbrPartialChargesPropertyProvider.get(model).value?.data;
        const typeId = SbNcbrPartialChargesPropertyProvider.props(model).typeId;

        if (!data) {
            console.error('No data');
            return;
        }
        const { typeIdToAtomIdToCharge, typeIdToResidueToCharge, maxAbsoluteAtomChargeAll } = data;
        const atomCharge = typeIdToAtomIdToCharge.get(typeId)?.get(last_index + 1);
        const residueCharge = typeIdToResidueToCharge.get(typeId)?.get(last_index + 1);
        const maxCharge = maxAbsoluteAtomChargeAll;

        console.log(
            last_index + 1,
            label_asym_id,
            label_comp_id,
            label_seq_id,
            label_atom_id,
            Number(atomCharge?.toPrecision(4)),
            Number(residueCharge?.toPrecision(4)),
            Number(maxCharge?.toPrecision(4)),
            typeId
        );

        // input mmCIF file should not have altlocs
        console.assert(label_alt_id === 'A' || label_alt_id === '');

        molstar.behavior.focus({ labelAtomId: label_atom_id, labelSeqId: label_seq_id, labelCompId: label_comp_id });
        await delay(1000);
    }
}
