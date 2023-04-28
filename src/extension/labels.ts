import { StructureElement, StructureProperties } from 'molstar/lib/mol-model/structure';
import { LociLabel } from 'molstar/lib/mol-plugin-state/manager/loci-label';
import { SbNcbrPartialChargesPropertyProvider } from './property';
import { Loci } from 'molstar/lib/mol-model/loci';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { LociLabelProvider } from 'molstar/lib/mol-plugin-state/manager/loci-label';

export function SbNcbrPartialChargesLociLabelProvider(ctx: PluginContext): LociLabelProvider {
    return {
        label: (loci: Loci) => {
            if (!StructureElement.Loci.is(loci)) return;

            const loc = StructureElement.Loci.getFirstLocation(loci);
            if (!loc) return;

            const atomId = StructureProperties.atom.id(loc);
            const model = loci.structure.model;
            const data = SbNcbrPartialChargesPropertyProvider.get(model).value?.data;
            if (data === undefined) return;
            const { typeIdToAtomIdToCharge, typeIdToResidueToCharge } = data;

            const typeId = SbNcbrPartialChargesPropertyProvider.getParams(model).typeId.defaultValue;
            const showResidueCharge = ctx.managers.interactivity.props.granularity === 'residue';
            const charge = showResidueCharge
                ? typeIdToResidueToCharge.get(typeId)?.get(atomId)
                : typeIdToAtomIdToCharge.get(typeId)?.get(atomId);
            const label = ctx.managers.interactivity.props.granularity === 'residue' ? 'Residue charge' : 'Atom charge';

            return `<strong>${label}: ${charge?.toFixed(4) || 'undefined'}</strong>`;
        },
        group: (label: LociLabel): string => (label as string).toString().replace(/Model [0-9]+/g, 'Models'),
        priority: 0,
    };
}