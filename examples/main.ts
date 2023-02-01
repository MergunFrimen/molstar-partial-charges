import './style.css';
import MolstarPartialCharges from '../src/viewer/main';

/**
 * Example use of the plugin wrapper
 */

let current_example = 0;
let charge = 0;

const default_structure_url =
    'https://raw.githubusercontent.com/MergunFrimen/molstar-partial-charges/master/examples/3bj1.charges.cif';
const url_prefix = 'http://localhost:1338/examples/output/';
const examples = [
    '100d.cif.charges.cif',
    '101m.cif.charges.cif',
    '146d.cif.charges.cif',
    '1a34.cif.charges.cif',
    '1aga.cif.charges.cif',
    '1c0q.cif.charges.cif',
    '1cp8.cif.charges.cif',
    '2_4_dinitrophenol.sdf.charges.cif',
    '2p7d.cif.charges.cif',
    '3c1p.cif.charges.cif',
    '3wpc.cif.charges.cif',
    '5boq.cif.charges.cif',
    'Conformer3D_CID_155884675.sdf.charges.cif',
    'Conformer3D_CID_16078.sdf.charges.cif',
    'Conformer3D_CID_1832.sdf.charges.cif',
    'Conformer3D_CID_2519.sdf.charges.cif',
    'Conformer3D_CID_4980.sdf.charges.cif',
    'Conformer3D_CID_5761.sdf.charges.cif',
    'molecules.sdf.charges.cif',
];

const molstar = new MolstarPartialCharges();

// for debugging purposes
declare global {
    interface Window {
        molstar: typeof molstar;
    }
}
window.molstar = molstar;

// Initialize Mol* and load the default structure
(async () => {
    await molstar.init('app');
    await load(default_structure_url);
})().then(
    () => console.log('Mol* ACC2 Wrapper initialized'),
    (e) => console.error('Mol* ACC2 Wrapper initialization failed', e)
);

addHeader('View');
addControl('Default\n(=Cartoon)', async () => await molstar.type.default(), 'controls-view-default');
addControl('Surface', async () => await molstar.type.surface());
addControl('Ball and stick', async () => await molstar.type.ballAndStick());

addHeader('Color', 'controls-charge-header');
addControl('Default\n(=Element symbol)', async () => await molstar.color.default());
addControl('Absolute input', async () => {
    const input = document.getElementById('max-charge') as HTMLInputElement;
    if (!input) return;
    const value = input.value;
    const defaultValue = !isNaN(+input.placeholder) ? parseFloat(input.placeholder) : 0;
    const parsed = value === undefined ? parseFloat(value) : defaultValue;
    updateCharge(parsed);
    await molstar.color.absolute(parsed);
});
addInput('max-charge', '0.2');
addControl('Absolute (+0.1)', async () => {
    updateCharge(charge + 0.1);
    await molstar.color.absolute(charge);
});
addControl('Absolute (-0.1)', async () => {
    updateCharge(charge - 0.1);
    await molstar.color.absolute(charge);
});
addControl('Relative', async () => {
    const relativeCharge = molstar.charges.getRelativeCharge();
    updateCharge(relativeCharge);
    await molstar.color.relative();
});
// TODO: set max to max absolute charge (should dynamically update based on users input of absolute charge)
addSlider('charge-slider', 0, 1, 0.001, async () => {
    const slider = document.getElementById('charge-slider') as HTMLInputElement;
    if (!slider) return;
    const chg = parseFloat(slider.value);
    updateCharge(chg);
    await molstar.color.absolute(charge);
});

addHeader('Change type');
addInput('type-id', '1');
addControl('Set typeId', () =>
    molstar.charges.setTypeId(parseInt((document.getElementById('') as HTMLInputElement).value))
);
addControl('Set typeId', async () => {
    const value = (document.getElementById('type-id') as HTMLInputElement).value;
    const parsed = value ? parseInt(value) : 1;
    await molstar.charges.setTypeId(parsed);
});

addHeader('Load');
addControl('Next example', nextExample);
addDropdown('examples-dropdown', examples, nextExample);

async function load(url: string) {
    await molstar.load(url);
    const cartoonOff = switchOffCartoonView();
    if (cartoonOff) await molstar.type.ballAndStick();
    else await molstar.type.default();
    await molstar.color.relative();
    const maxAbsoluteRelativeCharge = molstar.charges.getRelativeCharge();
    updateCharge(maxAbsoluteRelativeCharge);
    updateSliderMax(maxAbsoluteRelativeCharge);
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

function updateCharge(chg: number) {
    if (isNaN(chg)) return;
    if (chg < 0) chg = 0;
    charge = chg;
    const header = document.getElementById('controls-charge-header') as HTMLHeadingElement;
    if (!header) return;
    header.innerText = `Charge (${charge.toFixed(3)})`;
    const slider = document.getElementById('charge-slider') as HTMLInputElement;
    if (!slider) return;
    slider.value = charge.toString();
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

function updateSliderMax(maxAbsoluteRelativeCharge: number) {
    const slider = document.getElementById('charge-slider') as HTMLInputElement;
    if (!slider) return;
    slider.max = `${maxAbsoluteRelativeCharge}`;
}

async function nextExample() {
    current_example = (current_example + 1) % examples.length;
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
