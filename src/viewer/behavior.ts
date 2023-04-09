import { OrderedSet } from 'molstar/lib/mol-data/int';
import { Loci } from 'molstar/lib/mol-model/loci';
import { StructureElement } from 'molstar/lib/mol-model/structure';
import { LociLabel, LociLabelProvider } from 'molstar/lib/mol-plugin-state/manager/loci-label';
import { PluginBehavior } from 'molstar/lib/mol-plugin/behavior';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { SbNcbrPartialChargesColorThemeProvider } from './color';
import { SbNcbrPartialChargesPropertyProvider } from './property';

export const SbNcbrPartialCharges = PluginBehavior.create<{ autoAttach: boolean; showToolTip: boolean }>({
    name: 'sb-ncbr-partial-charges',
    category: 'misc',
    display: {
        name: 'SB NCBR Partial Charges',
    },
    ctor: class extends PluginBehavior.Handler<{ autoAttach: boolean; showToolTip: boolean }> {
        private SbNcbrPartialChargesLociLabelProvider: LociLabelProvider = {
            label: (loci: Loci) => {
                if (!StructureElement.Loci.is(loci)) return;

                const { unit, indices } = loci.elements[0];
                const elements = unit.elements;
                const index = OrderedSet.start(indices);
                const id = elements[index] + 1;

                const model = loci.structure.model;
                const data = SbNcbrPartialChargesPropertyProvider.get(model).value?.data;
                if (data === undefined) return;
                const { typeIdToAtomIdToCharge, typeIdToResidueToCharge } = data;

                const typeId = SbNcbrPartialChargesPropertyProvider.getParams(model).typeId.defaultValue;
                const showResidueCharge = this.ctx.managers.interactivity.props.granularity === 'residue';
                const charge = showResidueCharge
                    ? typeIdToResidueToCharge.get(typeId)?.get(id)
                    : typeIdToAtomIdToCharge.get(typeId)?.get(id);
                const label =
                    this.ctx.managers.interactivity.props.granularity === 'residue' ? 'Residue charge' : 'Atom charge';

                return `<strong>${label}: ${charge?.toFixed(4) || 'undefined'}</strong> | id: ${id} | type: ${typeId}`;
            },
            group: (label: LociLabel): string => (label as string).toString().replace(/Model [0-9]+/g, 'Models'),
            priority: 0,
        };

        register(): void {
            this.ctx.customModelProperties.register(SbNcbrPartialChargesPropertyProvider, this.params.autoAttach);
            this.ctx.representation.structure.themes.colorThemeRegistry.add(SbNcbrPartialChargesColorThemeProvider);
            this.ctx.managers.lociLabels.addProvider(this.SbNcbrPartialChargesLociLabelProvider);
        }

        unregister() {
            this.ctx.customModelProperties.unregister(SbNcbrPartialChargesPropertyProvider.descriptor.name);
            this.ctx.representation.structure.themes.colorThemeRegistry.remove(SbNcbrPartialChargesColorThemeProvider);
            this.ctx.managers.lociLabels.removeProvider(this.SbNcbrPartialChargesLociLabelProvider);
        }
    },
    params: () => ({
        autoAttach: PD.Boolean(true),
        showToolTip: PD.Boolean(true),
    }),
});
