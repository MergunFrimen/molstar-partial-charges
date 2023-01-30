import './style.css'
import ACC2PartialChargesWrapper from '../src/index'

/**
 * Example use of the plugin wrapper
 */

// file hosting the examples
const url_prefix = 'http://localhost:1338/examples/output/';
const url = url_prefix + '146d.cif.charges.cif';

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

const molstar = new ACC2PartialChargesWrapper();

// for debugging purposes
(window as any).molstar = molstar;

const specs = {
    layout: {
        initial: {
            isExpanded: false,
            showControls: true,
        }
    },
    behaviors: []
};

(async () => {
    await molstar.init('app', specs);
    await molstar.load(url);
    
    await molstar.color.partialCharges();
    if (molstar.type.isDefaultApplicable())
        await molstar.type.default();
    else
        await molstar.type.ballAndStick();
})();

addHeader('Load');
addControl('Next example', nextExample);
for (const example of examples) {
    addControl(example.replace('.charges.cif', ''), async () => {
        await molstar.load(url_prefix + example);
        
        await molstar.color.partialCharges();
        if (molstar.type.isDefaultApplicable())
            await molstar.type.default();
        else
            await molstar.type.ballAndStick();
    });
}

addHeader('Type');
addControl('Cartoon', async () => await molstar.type.default())
addControl('Surface', async () => await molstar.type.surface())
addControl('Ball and stick', async () => await molstar.type.ballAndStick())
            
addSeparator();
addHeader('Coloring');
addControl('Default', async () => await molstar.color.default())
addControl('Relative', async () => await molstar.charges.relative());
addInput('max-charge', 0.2);
addControl('Absolute', async () => {
    const value = (document.getElementById('max-charge') as HTMLInputElement).value;
    let parsed;
    if (value)
        parsed = parseFloat(value);
    else
        parsed = 0.2;
    await molstar.charges.absolute(parsed);
});

addSeparator();
addHeader('Change type');
addInput('type-id', 1);
addControl('Set typeId', () => molstar.charges.setTypeId(
    parseInt((document.getElementById('type-id') as HTMLInputElement).value),
))

async function nextExample() {
    console.clear();
    current_example = (current_example + 1) % examples.length;
    await molstar.load(url_prefix + `${examples[current_example % examples.length]}`);
    await molstar.color.partialCharges();
    if (molstar.type.isDefaultApplicable())
        await molstar.type.default();
    else
        await molstar.type.ballAndStick();
(document.querySelector('#app > div > div > div:nth-child(1) > div.msp-layout-region.msp-layout-left > div > div > div.msp-left-panel-controls-buttons > button:nth-child(2)') as HTMLButtonElement)!.click();
}

function addInput(id: string, placeholder) {
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
