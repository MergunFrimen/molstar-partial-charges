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

const url_prefix = 'http://127.0.0.1:5501/test/output/';
const examples = [
    '10gs.fw2.cif',
    '1a9l.fw2.cif',
    '2bg9.fw2.cif',
    '100d.fw2.cif',
    '101m.fw2.cif',
    '146d.fw2.cif',
    '148l.fw2.cif',
    '155884675.fw2.cif',
    '16078.fw2.cif',
    '1832.fw2.cif',
    '1C0Q.fw2.cif',
    '1a34.fw2.cif',
    '1aa5.fw2.cif',
    '1aga.fw2.cif',
    '1alx.fw2.cif',
    '1c0q.fw2.cif',
    '1cp8.fw2.cif',
    '1dey.fw2.cif',
    '1ffz.fw2.cif',
    '2519.fw2.cif',
    '2_4_dinitrophenol.fw2.cif',
    '2_chlorophenol.fw2.cif',
    '2p7d.fw2.cif',
    '3_chlorophenol.fw2.cif',
    '3bj1.fw2.cif',
    '3c1p.fw2.cif',
    '3ciy.fw2.cif',
    '3wpc.fw2.cif',
    '4980.fw2.cif',
    '4_nitrophenol.fw2.cif',
    '4wtv.fw2.cif',
    '5761.fw2.cif',
    '5boq.fw2.cif',
    '5c9l.fw2.cif',
    '7sza.fw2.cif',
    '7zgc.fw2.cif',
    '8fuc.fw2.cif',
    '8hc9.fw2.cif',
    'm_cresol.fw2.cif',
    'nsc_100000.fw2.cif',
    'nsc_100013.fw2.cif',
    'nsc_10002.fw2.cif',
    'nsc_100029.fw2.cif',
    'nsc_100032.fw2.cif',
    'nsc_100035.fw2.cif',
    'nsc_100036.fw2.cif',
    'nsc_100044.fw2.cif',
    'nsc_100046.fw2.cif',
    'nsc_100049.fw2.cif',
    'nsc_10005.fw2.cif',
    'nsc_100053.fw2.cif',
    'nsc_100054.fw2.cif',
    'nsc_100058.fw2.cif',
    'nsc_100059.fw2.cif',
    'nsc_10006.fw2.cif',
    'nsc_100060.fw2.cif',
    'nsc_100062.fw2.cif',
    'nsc_100063.fw2.cif',
    'nsc_10007.fw2.cif',
    'nsc_10008.fw2.cif',
    'nsc_100109.fw2.cif',
    'nsc_10011.fw2.cif',
    'nsc_10012.fw2.cif',
    'nsc_10013.fw2.cif',
    'nsc_100133.fw2.cif',
    'nsc_100135.fw2.cif',
    'nsc_100137.fw2.cif',
    'nsc_10014.fw2.cif',
    'nsc_100143.fw2.cif',
    'nsc_100146.fw2.cif',
    'nsc_100147.fw2.cif',
    'nsc_10015.fw2.cif',
    'nsc_100152.fw2.cif',
    'nsc_100154.fw2.cif',
    'nsc_100163.fw2.cif',
    'nsc_100166.fw2.cif',
    'nsc_100168.fw2.cif',
    'nsc_100169.fw2.cif',
    'nsc_100176.fw2.cif',
    'nsc_100178.fw2.cif',
    'nsc_100181.fw2.cif',
    'nsc_100184.fw2.cif',
    'nsc_10019.fw2.cif',
    'nsc_100192.fw2.cif',
    'nsc_100201.fw2.cif',
    'nsc_100202.fw2.cif',
    'o_cresol.fw2.cif',
    'propofol.fw2.cif',
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
    await molstar.color.relative();
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
addControl('Previous example', () => nextExample(current_example - 1));
addControl('Next example', () => nextExample(current_example + 1));
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
    console.log(examples[current_example]);
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

async function nextExample(next: number) {
    current_example = (next + examples.length) % examples.length;
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
