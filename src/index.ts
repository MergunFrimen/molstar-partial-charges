import MolstarPartialCharges from './viewer/main';

declare global {
    interface Window {
        ACC2PartialChargesWrapper: typeof MolstarPartialCharges;
    }
}

window.ACC2PartialChargesWrapper = MolstarPartialCharges;

export default MolstarPartialCharges;
