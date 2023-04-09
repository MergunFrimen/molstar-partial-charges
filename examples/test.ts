import './style.css';
import MolstarPartialCharges from '../src/viewer/main';
import { BuiltInTrajectoryFormat } from 'molstar/lib/mol-plugin-state/formats/trajectory';
import { Script } from 'molstar/lib/mol-script/script';
import { StructureSelection } from 'molstar/lib/mol-model/structure';
import { MmcifFormat } from 'molstar/lib/mol-model-formats/structure/mmcif';
import { assert } from 'console';
import { SbNcbrPartialChargesPropertyProvider } from '../src/viewer/property';

/**
 * Example use of the plugin wrapper
 */

let current_example = 0;
let charge = 0;

const url_prefix = 'http://127.0.0.1:5500/test/output/';
const examples = [
    '1c0q.cif.charges.cif',
    '1alx.cif.charges.cif',
    '4wtv.cif.charges.cif',
    '2_4_dinitrophenol.charges.cif',
    '2_chlorophenol.charges.cif',
    '3_chlorophenol.charges.cif',
    '4_nitrophenol.charges.cif',
    'm_cresol.charges.cif',
    'o_cresol.charges.cif',
    'propofol.charges.cif',
];
const default_structure_url = url_prefix + examples[current_example];

const molstar = await MolstarPartialCharges.create('app');

// for debugging purposes
declare global {
    interface Window {
        molstar: MolstarPartialCharges;
    }
}
window.molstar = molstar;

// Initialize Mol* and load the default structure
(async () => {
    await load(default_structure_url, 'mmcif');
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

addHeader('Color');
addControl('AlphaFold', async () => await molstar.color.alphaFold());
addControl('Default', async () => await molstar.color.default());
addControl('Charges', async () => await molstar.color.relative());

addHeader('', 'controls-charge-header');
addHeader('Set charge range');
addControl('Relative range', async () => {
    const relativeCharge = molstar.charges.getRelativeCharge();
    await updateSliderMax(relativeCharge);
    await updateCharge(relativeCharge);
});
addControl('Absolute range', async () => {
    const input = document.getElementById('max-charge') as HTMLInputElement;
    if (!input) return;
    const value = input.value;
    const placeholder = input.placeholder;
    const defaultValue = !isNaN(Number(placeholder)) ? Number(placeholder) : 1;
    const parsed = value !== '' && !isNaN(Number(value)) ? Number(value) : defaultValue;
    await updateSliderMax(parsed);
});
addInput('max-charge', '1.0');
addControl('Absolute (+0.1)', async () => {
    await updateSliderMax(charge + 0.1);
    await updateCharge(charge + 0.1);
});
addControl('Absolute (-0.1)', async () => {
    await updateCharge(charge - 0.1);
});
addSlider('charge-slider', 0, 1, 0.001, async () => {
    const slider = document.getElementById('charge-slider') as HTMLInputElement;
    if (!slider) return;
    const chg = Number(slider.value);
    await updateCharge(chg);
});

addHeader('Change charge set');
addDropdown('charge-set-dropdown', [], async (value) => {
    await molstar.charges.setTypeId(Number(value));
    const relativeCharge = molstar.charges.getRelativeCharge();
    await updateSliderMax(relativeCharge);
    await updateCharge(relativeCharge);
});

addHeader('Load');
addControl('Next example', nextExample);
addDropdown('examples-dropdown', examples, async (value) => {
    current_example = examples.indexOf(value);
    await load(url_prefix + value, 'mmcif');
});

let last_index = -1;
let stop: boolean = true;
addHeader('Test');
addControl('Test loci labels', async () => {
    stop = !stop;
    testLociLabels();
});

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
        const typeId = SbNcbrPartialChargesPropertyProvider.getParams(model).typeId.defaultValue;

        if (!data) {
            console.error('No data');
            return;
        }
        const { typeIdToAtomIdToCharge, typeIdToResidueToCharge, maxAbsoluteCharges } = data;
        const atomCharge = typeIdToAtomIdToCharge.get(typeId)?.get(last_index + 1);
        const residueCharge = typeIdToResidueToCharge.get(typeId)?.get(last_index + 1);
        const maxCharges = maxAbsoluteCharges.get(typeId);

        console.log(
            last_index + 1,
            label_asym_id,
            label_comp_id,
            label_seq_id,
            label_atom_id,
            Number(atomCharge?.toPrecision(4)),
            Number(residueCharge?.toPrecision(4)),
            Number(maxCharges?.toPrecision(4)),
            typeId
        );

        // input mmCIF file should not have altlocs
        console.assert(label_alt_id === 'A' || label_alt_id === '');

        molstar.visual.focus({ labelAtomId: label_atom_id, labelSeqId: label_seq_id, labelCompId: label_comp_id });
        await delay(1000);
    }
}

async function load(url: string, format: BuiltInTrajectoryFormat = 'mmcif') {
    await molstar.load(url, format);
    const cartoonOff = switchOffCartoonView();
    if (cartoonOff) {
        await molstar.type.ballAndStick();
    } else {
        await molstar.type.default();
    }
    let maxAbsoluteRelativeCharge = Number(molstar.charges.getRelativeCharge().toFixed(4));
    await updateSliderMax(maxAbsoluteRelativeCharge);
    await updateCharge(maxAbsoluteRelativeCharge);

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

async function updateCharge(chg: number) {
    if (isNaN(chg)) return;
    const header = document.getElementById('controls-charge-header') as HTMLHeadingElement;
    const slider = document.getElementById('charge-slider') as HTMLInputElement;
    if (!header || !slider) return;
    charge = Number(chg.toFixed(4));
    header.innerText = `Charge (${charge.toFixed(4)})`;
    slider.value = `${charge.toFixed(4)}`;
    await molstar.color.absolute(charge);
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

function addInput(id: string, placeholder: string) {
    const input = document.createElement('input');
    input.setAttribute('id', id);
    input.setAttribute('type', 'text');
    input.setAttribute('placeholder', placeholder);
    document.getElementById('controls')?.appendChild(input);
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
    const old_value = Number(slider.value);
    slider.max = max.toFixed(4);
    if (old_value > max) {
        await updateCharge(max);
    } else {
        slider.value = old_value.toFixed(4);
    }
}

async function nextExample() {
    current_example = (current_example + 1) % examples.length;
    const select = document.getElementById('examples-dropdown') as HTMLSelectElement;
    if (!select) return;
    select.value = examples[current_example];
    await load(url_prefix + `${examples[current_example % examples.length]}`);
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
