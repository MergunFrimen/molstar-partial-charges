import { OrderedSet } from 'molstar/lib/mol-data/int';
import { Loci } from 'molstar/lib/mol-model/loci';
import { QueryContext, Structure, StructureElement, StructureSelection } from 'molstar/lib/mol-model/structure';
import { LociLabel } from 'molstar/lib/mol-plugin-state/manager/loci-label';
import { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects';
import { PluginBehavior } from 'molstar/lib/mol-plugin/behavior';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { MolScriptBuilder as MS } from 'molstar/lib/mol-script/language/builder';
import { compile } from 'molstar/lib/mol-script/runtime/query/base';
import { StateObject } from 'molstar/lib/mol-state';
import { ACC2PropertyProvider } from './property';

export const ACC2LociLabelProvider = PluginBehavior.create({
    name: 'acc2-loci-label-provider',
    category: 'interaction',
    display: { name: 'Provide ACC2 Partial Charges Loci Label' },
    ctor: class implements PluginBehavior<undefined> {
        constructor(protected ctx: PluginContext) { }
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

                // TODO: figure out how to do this
                // const isLociFromPolymer = StructureElement.Loci.isSubset(getPolymerLoci(this.ctx), loci);
                // const colorThemeParams = this.ctx.state.data.tree.transforms.get('polymer-visual')?.params;
                // const isResidue = colorThemeParams?.type?.name === 'cartoon' && isLociFromPolymer;
                const isResidue = false;
                const typeId = ACC2PropertyProvider.getParams(model).typeId.defaultValue;
                const charge = isResidue
                    ? residueToCharge.get(typeId)!.get(id)
                    : atomIdToCharge.get(typeId)!.get(id);
                const label = isResidue
                    ? 'Residue charge'
                    : 'Atom charge';

                return `<b>${label}: ${charge?.toFixed(3)}</b>`;
            },
            group: (label: LociLabel) => label.toString().replace(/Model [0-9]+/g, 'Models'),
            priority: 0
        };
        register() { this.ctx.managers.lociLabels.addProvider(this.provider); }
        unregister() { this.ctx.managers.lociLabels.removeProvider(this.provider); }
    },
});

// TODO: create a custom model property provider
// function getPolymerLoci(ctx: PluginContext) {
//     const model = getObj<PluginStateObject.Molecule.Model>(ctx, 'model');
//     const structure = Structure.ofModel(model);
//     const query = MS.struct.modifier.union([
//         MS.struct.generator.atomGroups({
//             'entity-test': MS.core.rel.eq([MS.ammp('entityType'), 'polymer'])
//         })
//     ]);
//     const compiled = compile<StructureSelection>(query);
//     const result = compiled(new QueryContext(structure));
//     return StructureSelection.toLociWithCurrentUnits(result);
// }

// function getObj<T extends StateObject>(ctx: PluginContext, ref: string): T['data'] {
//     const cell = ctx.state.data.select(ref)[0];
//     if (cell && cell.obj)
//         return (cell.obj as T).data;
// }
