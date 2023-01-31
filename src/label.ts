import { OrderedSet } from 'molstar/lib/mol-data/int';
import { Loci } from 'molstar/lib/mol-model/loci';
import { StructureElement } from 'molstar/lib/mol-model/structure';
import { PluginBehavior } from 'molstar/lib/mol-plugin/behavior';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { ACC2PropertyProvider } from './property';

export const ACC2LociLabelProvider = PluginBehavior.create({
    name: 'acc2-loci-label-provider',
    category: 'interaction',
    display: { name: 'Provide ACC2 Partial Charges Loci Label' },
    ctor: class implements PluginBehavior<undefined> {
        constructor(protected ctx: PluginContext) {}
        private provider = {
            label: (loci: Loci) => {
                if (!StructureElement.Loci.is(loci)) return;

                const { unit, indices } = loci.elements[0];
                const elements = unit.elements;
                const index = OrderedSet.start(indices);
                const id = elements[index] + 1;

                const model = loci.structure.model;
                const data = ACC2PropertyProvider.get(model).value?.data;
                if (data === undefined) return;
                const { atomIdToCharge, residueToCharge } = data;

                const typeId = ACC2PropertyProvider.getParams(model).typeId.defaultValue;
                const charge =
                    this.ctx.managers.interactivity.props.granularity === 'residue'
                        ? residueToCharge.get(typeId)?.get(id)
                        : atomIdToCharge.get(typeId)?.get(id);
                // TODO: change label for water based on entity.type
                const label =
                    this.ctx.managers.interactivity.props.granularity === 'residue' ? 'Residue charge' : 'Atom charge';

                return `<b>${label}: ${charge?.toFixed(3) || 'undefined'}`;
            },
            group: (label: string): string => label.toString().replace(/Model [0-9]+/g, 'Models'),
            priority: 0,
        };
        register() {
            this.ctx.managers.lociLabels.addProvider(this.provider);
        }
        unregister() {
            this.ctx.managers.lociLabels.removeProvider(this.provider);
        }
    },
});
