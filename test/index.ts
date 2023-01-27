import './style.css'
import PartialChargesWrapper from '../src/index'

// Example use of the plugin wrapper

const url_prefix = 'http://localhost:1338/examples/output/';
const url = url_prefix + '3bj1.cif.charges.cif';

let current_example = 0;
const examples  = [
    '100d.cif.charges.cif',
    '101m.cif.charges.cif',
    '146d.cif.charges.cif',
    '1a34.cif.charges.cif',
    '1aga.cif.charges.cif',
    '1c0q.cif.charges.cif',
    '1cp8.cif.charges.cif',
    '2_4_dinitrophenol.sdf.charges.cif',
    '2p7d.cif.charges.cif',
    '3bj1.cif.charges.cif',
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

const molstar = new PartialChargesWrapper();

molstar.init('app').then(async () => {
    await molstar.load(url_prefix +  '3bj1.cif.charges.cif');
});

addHeader('Load');
addControl('Next example', nextExample);
for (const example of examples) {
    addControl(example.replace('.charges.cif', ''), async () => {
        await molstar.load(url_prefix + example);
    });
}

addHeader('Type');
addControl('Cartoon', async () => await molstar.updateType('default'))
addControl('Surface', async () => await molstar.updateType('gaussian-surface'))
addControl('Ball and stick', async () => await molstar.updateType('ball-and-stick'))
// addControl('Cartoon', () => molstar.type.cartoon())
// addControl('Surface', () => molstar.type.surface())
// addControl('Ball and stick', () => molstar.type.ballAndStick())
// addControl('Empty', () => molstar.type.set(undefined, undefined))
            
addSeparator();
addHeader('Coloring');
addControl('Default', () => molstar.updateColor('default'))
addControl('Charges', () => molstar.updateColor('acc2-partial-charges'))
// addControl('Default', () => molstar.coloring.default())
// addControl('Partial Charges (true, 0.1)', () => molstar.coloring.partialCharges(true, 0.1))
// addControl('Partial Charges (true, 0.2)', () => molstar.coloring.partialCharges(true, 0.2))
// addControl('Partial Charges (true, 0.38171)', () => molstar.coloring.partialCharges(true, 0.38171))
// addControl('Partial Charges (true, 0.5)', () => molstar.coloring.partialCharges(true, 0.5))
// addControl('Partial Charges (false)', () => molstar.coloring.partialCharges(false))

addSeparator();
addHeader('Charge range');
addInput('max-charge', 5);
addControl('Apply range', () => molstar.charges.setMax(parseFloat((document.getElementById('max-charge') as HTMLInputElement).value)));

addSeparator();
addHeader('Change TypeId');
addInput('type-id', 1);
addControl('Set typeId', () => molstar.charges.setTypeId(
    parseInt((document.getElementById('type-id') as HTMLInputElement).value),
))

async function nextExample() {
    console.clear();
    current_example = (current_example + 1) % examples.length;
    await molstar.load(url_prefix + `${examples[current_example % examples.length]}`);
    (document.querySelector('#app > div > div > div:nth-child(1) > div.msp-layout-region.msp-layout-left > div > div > div.msp-left-panel-controls-buttons > button:nth-child(2)') as HTMLButtonElement)!.click();
}

function addInput(id, placeholder) {
    const input = document.createElement('input');
    input.setAttribute('id', id);
    input.setAttribute('type', 'text');
    input.setAttribute('placeholder', placeholder);
    document.getElementById('controls')!.appendChild(input);
}

function addControl(label, action) {
    const btn = document.createElement('button');
    btn.onclick = action;
    btn.innerText = label;
    document.getElementById('controls')!.appendChild(btn);
}

function addSeparator() {
    const hr = document.createElement('hr');
    document.getElementById('controls')!.appendChild(hr);
}

function addHeader(header) {
    const h = document.createElement('h3');
    h.innerText = header;
    document.getElementById('controls')!.appendChild(h);
}
