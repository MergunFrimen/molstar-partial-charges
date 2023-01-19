import './style.css'
import ACC2Wrapper from '../src/index'

var url_prefix = 'http://127.0.0.1:1338/examples/acc2/';
var url = url_prefix + '3bj1.default2.cif';

const molstar = new ACC2Wrapper();

molstar.init('app').then(() => {
    molstar.load(url);
})

addHeader('Load');
addControl('3bj1.cif', async () => await molstar.load(url_prefix + '3bj1.cif'))
addControl('3bj1.default.cif', async () => await molstar.load(url_prefix + '3bj1.default.cif'))
addControl('3bj1.default2.cif', async () => await molstar.load(url_prefix + '3bj1.default2.cif'))
addControl('default-example.cif', async () => await molstar.load(url_prefix + 'default-example.cif'))
addControl('7qo1.cif', async () => await molstar.load(url_prefix + '7qo1.cif'))

addHeader('Type');
addControl('Cartoon', () => molstar.type.cartoon())
addControl('Surface', () => molstar.type.surface())
addControl('Ball and stick', () => molstar.type.ballAndStick())
            
addSeparator();
addHeader('Coloring');
addControl('Default', () => molstar.coloring.default())
addControl('Partial Charges (true, -1, 1)', () => molstar.coloring.partialCharges({ absolute: true, min: -1, max: 1}))
addControl('Partial Charges (true, -0.2, 0.4)', () => molstar.coloring.partialCharges({ absolute: true, min: -0.2, max: 0.4}))
addControl('Partial Charges (true, -0.38171, 0.38171)', () => molstar.coloring.partialCharges({ absolute: true, min: -0.38171, max: 0.38171}))
addControl('Partial Charges (false)', () => molstar.coloring.partialCharges({ absolute: false }))

addSeparator();
addHeader('Charge range');
addInput('min-charge', -5);
addInput('max-charge', 5);
addInput('absolute-toggle', false);
addControl('Apply range', () => molstar.coloring.partialCharges({
    absolute: eval((document.getElementById('absolute-toggle') as HTMLInputElement).value),
    min: parseFloat((document.getElementById('min-charge') as HTMLInputElement)!.value),
    max: parseFloat((document.getElementById('max-charge') as HTMLInputElement).value),
}));

addSeparator();
addHeader('Change TypeId');
addInput('type-id', 1);
addControl('Set typeId', () => molstar.charges.setTypeId(
    parseInt((document.getElementById('type-id') as HTMLInputElement).value),
))

function addInput(id, placeholder) {
    var input = document.createElement('input');
    input.setAttribute('id', id);
    input.setAttribute('type', 'text');
    input.setAttribute('placeholder', placeholder);
    document.getElementById('controls')!.appendChild(input);
}

function addControl(label, action) {
    var btn = document.createElement('button');
    btn.onclick = action;
    btn.innerText = label;
    document.getElementById('controls')!.appendChild(btn);
}

function addSeparator() {
    var hr = document.createElement('hr');
    document.getElementById('controls')!.appendChild(hr);
}

function addHeader(header) {
    var h = document.createElement('h3');
    h.innerText = header;
    document.getElementById('controls')!.appendChild(h);
}
