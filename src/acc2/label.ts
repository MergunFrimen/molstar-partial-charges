import { OrderedSet } from 'molstar/lib/mol-data/int';
import { Loci } from 'molstar/lib/mol-model/loci';
import { StructureElement } from 'molstar/lib/mol-model/structure';
import { LociLabel } from 'molstar/lib/mol-plugin-state/manager/loci-label';
import { PluginBehavior } from 'molstar/lib/mol-plugin/behavior';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { ACC2PropertyProvider } from './property';

export const ACC2LociLabelProvider = PluginBehavior.create({
    name: 'acc2-loci-label-provider',
    category: 'interaction',
    display: { name: 'Provide ACC2 Partial Charges Loci Label' },
    ctor: class implements PluginBehavior<undefined> {
        constructor(protected ctx: PluginContext) { }
        private provider = {
            label: (loci: Loci) => {
                if (!StructureElement.Loci.is(loci))
                    return '<b>Charge</b>: undefined';

                const model = loci.structure.model;
                const data = ACC2PropertyProvider.get(model).value?.data;
                if (data === undefined)
                    return '<b>Charge</b>: undefined';

                const { atomIdToCharge, residueToCharge } = data;
                const { unit, indices } = loci.elements[0];
                const elements = unit.elements;
                const index = OrderedSet.start(indices);
                const id = elements[index] + 1;

                // todo: fix; this gets recomputed for each label
                const polymerAtomIds = new Set();
                if (!!this.ctx.state.data.select('sequence')[0]?.obj?.data?.units) {
                    for (const unit of this.ctx.state.data.select('sequence')[0].obj!.data.units) {
                        for (const atomId of unit.elements) {
                            polymerAtomIds.add(atomId);
                        }
                    }
                }

                const params = this.ctx.state.data.tree.transforms.get('sequence-visual')?.params;
                const isResidue = params?.type?.name === 'cartoon' && polymerAtomIds.has(id);
                const typeId = ACC2PropertyProvider.getParams(model).typeId.defaultValue;
                const charge = isResidue
                    ? residueToCharge.get(typeId)!.get(id)
                    : atomIdToCharge.get(typeId)!.get(id);

                return `<b>Charge</b>: ${charge?.toFixed(3)}`;
            },
            group: (label: LociLabel) => label.toString().replace(/Model [0-9]+/g, 'Models'),
            priority: 100
        };
        register() { this.ctx.managers.lociLabels.addProvider(this.provider); }
        unregister() { this.ctx.managers.lociLabels.removeProvider(this.provider); }
    },
});
