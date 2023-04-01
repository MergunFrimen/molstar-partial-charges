import './style.css';
import MolstarPartialCharges from '../src/viewer/main';
import { BuiltInTrajectoryFormat } from 'molstar/lib/mol-plugin-state/formats/trajectory';

/**
 * Example use of the plugin wrapper
 */

let current_example = 3;
let charge = 0;

const url_prefix = 'http://127.0.0.1:5501/examples/test/';
const examples = ['4wtv.cif.charges.cif', '4wtv.pdb.charges.cif', '1c0q.cif.charges.cif', '1alx.pdb.charges.cif'];
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
    await molstar.load(default_structure_url, 'mmcif');
})().then(
    () => {},
    (e) => console.error('Molstar Partial Charges initialization failed', e)
);

addHeader('View');
addControl('Default\n(=Cartoon)', async () => await molstar.type.default(), 'controls-view-default');
addControl('Surface', async () => await molstar.type.surface());
addControl('Ball and stick', async () => await molstar.type.ballAndStick());

addHeader('Color');
addControl('AlphaFold', async () => await molstar.color.alphaFold());

const colorStates = ['Charges', 'Default'];
let nextColor = 1;
addHeader('', 'controls-charge-header');
addHeader('Set charge range');
addControl(colorStates[nextColor], switchColorThemes, 'controls-color-switch-default-charges');
addControl('Absolute range', async () => {
    const input = document.getElementById('max-charge') as HTMLInputElement;
    if (!input) return;
    const value = input.value;
    const placeholder = input.placeholder;
    const defaultValue = !isNaN(Number(placeholder)) ? Number(placeholder) : 0;
    const parsed = value !== '' && !isNaN(Number(value)) ? Number(value) : defaultValue;
    await updateSliderMax(parsed);
});
addInput('max-charge', '0.0');
// addControl('Absolute (+0.01)', async () => {
//     await updateCharge(charge + 0.01);
// });
// addControl('Absolute (-0.01)', async () => {
//     await updateCharge(charge - 0.01);
// });
// addControl('Absolute (+0.001)', async () => {
//     await updateCharge(charge + 0.001);
// });
// addControl('Absolute (-0.001)', async () => {
//     await updateCharge(charge - 0.001);
// });
addControl('Relative range', async () => {
    const relativeCharge = molstar.charges.getRelativeCharge();
    await updateSliderMax(relativeCharge);
    await updateCharge(relativeCharge);
});
addSlider('charge-slider', 0, 1, 0.001, async () => {
    const slider = document.getElementById('charge-slider') as HTMLInputElement;
    if (!slider) return;
    const chg = Number(slider.value);
    await updateCharge(chg);
    updateButtonLabel(1);
});

addHeader('Change charge set');
addDropdown('charge-set-dropdown', [], async (value) => {});

addHeader('Load');
addControl('Next example', nextExample);
addDropdown('examples-dropdown', examples, async (value) => {
    current_example = examples.indexOf(value);
    await load(url_prefix + value, 'pdb');
});

addHeader('Focus');
addControl('Focus', async () => molstar.visual.focus({ labelCompId: 'GLN', labelSeqId: 33, labelAtomId: 'CD' }));

async function load(url: string, format: BuiltInTrajectoryFormat = 'mmcif') {
    await molstar.load(url, format);
    const cartoonOff = switchOffCartoonView();
    if (cartoonOff) {
        await molstar.type.ballAndStick();
    } else {
        await molstar.type.default();
    }
    let maxAbsoluteRelativeCharge = Number(molstar.charges.getRelativeCharge().toFixed(3));
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
    charge = Number(chg.toFixed(3));
    header.innerText = `Charge (${charge.toFixed(3)})`;
    slider.value = `${charge.toFixed(3)}`;
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
    slider.max = max.toFixed(3);
    if (old_value > max) {
        await updateCharge(max);
    } else {
        // slider.value = old_value.toFixed(3);
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
        opt.setAttribute('value', option);
        opt.innerText = option;
        select.appendChild(opt);
    }
}

async function switchColorThemes() {
    updateButtonLabel();
    if (nextColor === 0) {
        await molstar.color.default();
    } else {
        await molstar.color.absolute(charge);
    }
}

function updateButtonLabel(color?: number) {
    const btn = document.getElementById('controls-color-switch-default-charges') as HTMLButtonElement;
    if (!btn) return;
    if (color === undefined) {
        btn.innerText = nextColor === 0 ? 'Default' : 'Charges';
        nextColor = (nextColor + 1) % 2;
    } else {
        btn.innerText = colorStates[color];
        nextColor = color;
    }
}
