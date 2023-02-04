import './style.css';
import MolstarPartialCharges from '../src/viewer/main';

/**
 * Example use of the plugin wrapper
 */

let current_example = 0;
let charge = 0;

const url_prefix = 'http://localhost:1338/examples/output/';
const examples = [
    'Q9C6B8_added_H.cif',
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
const default_structure_url = url_prefix + 'Q9C6B8_added_H.cif';

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
    () => console.log('Molstar Partial Charges initialized'),
    (e) => console.error('Molstar Partial Charges initialization failed', e)
);

addHeader('View');
addControl('Default\n(=Cartoon)', async () => await molstar.type.default(), 'controls-view-default');
addControl('Surface', async () => await molstar.type.surface());
addControl('Ball and stick', async () => await molstar.type.ballAndStick());

// TODO: fix charges not being updated correctly

addHeader('Color', 'controls-charge-header');
addControl('Default\n(=Element symbol)', async () => await molstar.color.default());
addControl('Set max charge', async () => {
    const input = document.getElementById('max-charge') as HTMLInputElement;
    if (!input) return;
    const value = input.value;
    const placeholder = input.placeholder;
    const defaultValue = !isNaN(Number(placeholder)) ? Number(placeholder) : 0;
    const parsed = value !== '' && !isNaN(Number(value)) ? Number(value) : defaultValue;
    updateSliderMax(parsed);
    await updateCharge(parsed);
});
addInput('max-charge', '0.2');
addControl('Absolute (+0.01)', async () => {
    await updateCharge(charge + 0.01);
});
addControl('Absolute (-0.01)', async () => {
    await updateCharge(charge - 0.01);
});
addControl('Absolute (+0.001)', async () => {
    await updateCharge(charge + 0.001);
});
addControl('Absolute (-0.001)', async () => {
    await updateCharge(charge - 0.001);
});
addControl('Relative', async () => {
    const relativeCharge = molstar.charges.getRelativeCharge();
    updateSliderMax(relativeCharge);
    await updateCharge(relativeCharge);
});
// TODO: set max to max absolute charge (should dynamically update based on users input of absolute charge)
addSlider('charge-slider', 0, 1, 0.001, async () => {
    const slider = document.getElementById('charge-slider') as HTMLInputElement;
    if (!slider) return;
    const chg = Number(slider.value);
    await updateCharge(chg);
});

addHeader('Change charge set');
addInput('type-id', '1');
addControl('Set typeId', async () => {
    const input = document.getElementById('type-id') as HTMLInputElement;
    if (!input) return;
    const value = input.value;
    const placeholder = input.placeholder;
    const defaultValue = !isNaN(Number(placeholder)) ? Number(placeholder) : 1;
    const parsed = value !== '' && !isNaN(Number(value)) ? Number(value) : defaultValue;
    await molstar.charges.setTypeId(parsed);
});

addHeader('Load');
addControl('Next example', nextExample);
addDropdown('examples-dropdown', examples, async (value) => await load(url_prefix + value));

async function load(url: string) {
    await molstar.load(url);
    const cartoonOff = switchOffCartoonView();
    if (cartoonOff) {
        await molstar.type.ballAndStick();
    } else {
        await molstar.type.default();
    }
    let maxAbsoluteRelativeCharge = Number(molstar.charges.getRelativeCharge().toFixed(3));
    updateSliderMax(maxAbsoluteRelativeCharge);
    await updateCharge(maxAbsoluteRelativeCharge);
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
    charge = Number(chg.toFixed(3));
    header.innerText = `Charge (${charge.toFixed(3)})`;
    slider.value = `${charge.toFixed(3)}`;
    await molstar.color.absolute(charge);
    console.log(charge);
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
    slider.max = maxAbsoluteRelativeCharge.toFixed(3);
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
