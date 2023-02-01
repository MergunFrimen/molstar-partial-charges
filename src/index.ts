import MolstarPartialCharges from './viewer/main';

declare global {
    interface Window {
        MolstarPartialCharges: typeof MolstarPartialCharges;
    }
}

window.MolstarPartialCharges = MolstarPartialCharges;

export default MolstarPartialCharges;
