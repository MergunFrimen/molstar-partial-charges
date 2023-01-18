import { createPluginUI } from 'molstar/lib/mol-plugin-ui/react18';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginCommands } from 'molstar/lib/mol-plugin/commands';
import { createStructureRepresentationParams } from 'molstar/lib/mol-plugin-state/helpers/structure-representation-params';
import { StateTransforms } from 'molstar/lib/mol-plugin-state/transforms';
import { StateBuilder, StateObject } from 'molstar/lib/mol-state';
import { PluginStateObject, PluginStateObject as PSO } from 'molstar/lib/mol-plugin-state/objects';
import { RepresentationStyle, StateElements } from './types';
import { StructureFocusRepresentation } from 'molstar/lib/mol-plugin/behavior/dynamic/selection/structure-focus-representation';
import { PluginSpec } from 'molstar/lib/mol-plugin/spec';
import { MmcifFormat } from 'molstar/lib/mol-model-formats/structure/mmcif';
import { ACC2LociLabelProvider } from './label';
import { ACC2ColorThemeProvider } from './color';
import { ACC2PropertyProvider } from './property';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';

export class ACC2Wrapper {
    private plugin!: PluginUIContext;

    async init(target: string) {
        this.plugin = await createPluginUI(document.getElementById(target)!, {
            ...DefaultPluginUISpec(),
            layout: {
                initial: {
                    isExpanded: false,
                    showControls: true,
                }
            },
            behaviors: [
                ...DefaultPluginUISpec().behaviors,
                PluginSpec.Behavior(ACC2LociLabelProvider),
            ]
        });

        this.plugin.customModelProperties.register(ACC2PropertyProvider, true);
        this.plugin.representation.structure.themes.colorThemeRegistry.add(ACC2ColorThemeProvider);
    }

    async load(url: string) {
        await this.plugin.clear();

        // create assembly
        const state = this.state;
        const builder = this.download(state.build().toRoot(), url);
        const modelTree = this.createModel(builder);
        await this.applyState(modelTree);
        const assemblyTree = this.createAssembly();
        await this.applyState(assemblyTree);

        await this.setInitialStyle();
    }

    private async setInitialStyle() {
        const initialStyle: RepresentationStyle = {
            sequence: {
                type: 'cartoon',
                color: 'acc2-partial-charges',
                colorParams: { isResidue: true },
                size: 'uniform',
            },
            hetGroups: {
                type: 'ball-and-stick',
                color: 'acc2-partial-charges',
                size: 'uniform',
            },
            nonStandard: {
                type: 'ball-and-stick',
                color: 'acc2-partial-charges',
                size: 'uniform',
            },
            water: {
                type: 'ball-and-stick',
                color: 'acc2-partial-charges',
                size: 'uniform',
            },
        };
        await this.updateRepresentationStyle(initialStyle);
        await this.updateFocusColorTheme(initialStyle.sequence!.color);

        this.plugin.managers.interactivity.setProps({ granularity: 'element' });
    }

    private get state() {
        return this.plugin.state.data;
    }

    private getObj<T extends StateObject>(ref: string): T['data'] {
        const cell = this.state.select(ref)[0];
        if (cell && cell.obj)
            return (cell.obj as T).data;
    }

    private applyState(tree: StateBuilder) {
        return PluginCommands.State.Update(this.plugin, { state: this.state, tree });
    }

    private download(builder: StateBuilder.To<PSO.Root>, url: string) {
        return builder.apply(StateTransforms.Data.Download, { url }, { state: { isGhost: true } });
    }

    private createModel(builder: StateBuilder.To<PSO.Data.Binary | PSO.Data.String>) {
        return builder
            .apply(StateTransforms.Data.ParseCif, undefined, { state: { isGhost: true } })
            .apply(StateTransforms.Model.TrajectoryFromMmCif)
            .apply(StateTransforms.Model.ModelFromTrajectory, { modelIndex: 0 }, { ref: StateElements.Model });
    }

    private createAssembly() {
        const model = this.state.build().to(StateElements.Model);
        const props = {
            type: {
                name: 'assembly' as const,
                params: { id: '' }
            }
        };

        const assembly = model.apply(StateTransforms.Model.StructureFromModel, props, { ref: StateElements.Assembly });

        assembly.apply(StateTransforms.Model.StructureComplexElement, { type: 'atomic-sequence' }, { ref: StateElements.Sequence, tags: StateElements.Sequence });
        assembly.apply(StateTransforms.Model.StructureComplexElement, { type: 'atomic-het' }, { ref: StateElements.HetGroups, tags: StateElements.HetGroups });
        assembly.apply(StateTransforms.Model.StructureComplexElement, { type: 'non-standard' }, { ref: StateElements.NonStandard, tags: StateElements.NonStandard });
        assembly.apply(StateTransforms.Model.StructureComplexElement, { type: 'water' }, { ref: StateElements.Water, tags: StateElements.Water });

        return assembly;
    }

    private getOldStyle(ref: string) {
        const params = this.state.tree.transforms.get(ref)?.params;
        return {
            type: params?.type?.name,
            color: params?.colorTheme?.name,
            colorParams: params?.colorTheme?.params,
            size: params?.sizeTheme?.name,
            // sizeParams: params?.sizeTheme?.params,
            // typeParams: params?.type?.params,
        };
    }

    // TODO: use lodash fp.merge
    private mergeStyleProps(newStyle: RepresentationStyle.Entry, oldStyle: RepresentationStyle.Entry): any {
        return {
            type: newStyle.type || oldStyle.type,
            color: newStyle.color || oldStyle.color,
            colorParams: { ...oldStyle.colorParams, ...newStyle.colorParams },
            size: newStyle.size || oldStyle.size,
            // sizeParams: newStyle.sizeParams || oldStyle.sizeParams,
            // typeParams: newStyle.typeParams || oldStyle.typeParams,
        };
    }

    private async updateRepresentationStyle(style: RepresentationStyle) {
        const update = this.state.build();
        const assembly = this.getObj<PluginStateObject.Molecule.Structure>(StateElements.Assembly);
        if (!assembly) return;

        if (style.sequence) {
            const root = update.to(StateElements.Sequence);
            const props = this.mergeStyleProps(style.sequence, this.getOldStyle(StateElements.SequenceVisual));
            const isResidue = props.type === 'cartoon' && props.color === 'acc2-partial-charges';
            const colorParams = { isResidue };
            const adjustedProps = this.mergeStyleProps({ colorParams }, props);
            root.applyOrUpdate(StateElements.SequenceVisual, StateTransforms.Representation.StructureRepresentation3D,
                createStructureRepresentationParams(this.plugin, assembly, adjustedProps));
        }

        if (style.hetGroups) {
            const root = update.to(StateElements.HetGroups);
            const props = this.mergeStyleProps(style.hetGroups, this.getOldStyle(StateElements.HetGroupsVisual));
            root.applyOrUpdate(StateElements.HetGroupsVisual, StateTransforms.Representation.StructureRepresentation3D,
                createStructureRepresentationParams(this.plugin, assembly, props));
        }

        if (style.nonStandard) {
            const root = update.to(StateElements.NonStandard);
            const props = this.mergeStyleProps(style.nonStandard, this.getOldStyle(StateElements.NonStandardVisual));
            root.applyOrUpdate(StateElements.NonStandardVisual, StateTransforms.Representation.StructureRepresentation3D,
                createStructureRepresentationParams(this.plugin, assembly, props));
        }

        if (style.water) {
            const root = update.to(StateElements.Water);
            const props = this.mergeStyleProps(style.water, this.getOldStyle(StateElements.WaterVisual));
            root.applyOrUpdate(StateElements.WaterVisual, StateTransforms.Representation.StructureRepresentation3D,
                createStructureRepresentationParams(this.plugin, assembly, props));
        }

        await this.applyState(update);
    }

    private async updateFocusColorTheme(color: RepresentationStyle.Entry['color'], colorParams?: RepresentationStyle.Entry['colorParams']) {
        await this.plugin.state.updateBehavior(StructureFocusRepresentation, (p: any) => {
            p.surroundingsParams.colorTheme = { name: color, params: colorParams || {} };
            p.targetParams.colorTheme = { name: color, params: colorParams || {} };
        });
    }

    charges = {
        setTypeId: (typeId: number) => {
            const model = this.getObj<PluginStateObject.Molecule.Model>(StateElements.Model);
            const sourceData = model.sourceData as MmcifFormat;
            const validTypeIds = new Set(sourceData.data.frame.categories.partial_atomic_charges.getField('type_id')?.toIntArray());
            if (!validTypeIds.has(typeId)) return;
            ACC2PropertyProvider.set(model, { typeId });
            this.coloring.set(undefined, { typeId });
        }
    };

    coloring = {
        set: async (color: RepresentationStyle.Entry['color'], colorParams: RepresentationStyle.Entry['colorParams']) => {
            const representationStyle: RepresentationStyle = {
                sequence: {
                    color,
                    colorParams
                },
                hetGroups: {
                    color,
                    colorParams
                },
                nonStandard: {
                    color,
                    colorParams
                },
                water: {
                    color,
                    colorParams
                }
            };
            await this.updateRepresentationStyle(representationStyle);
            await this.updateFocusColorTheme(color, colorParams);
        },
        partialCharges: async (colorParams: RepresentationStyle.Entry['colorParams']) => {
            const color = 'acc2-partial-charges';
            await this.coloring.set(color, colorParams);
        },
        default: async () => {
            const color = 'element-symbol';
            await this.coloring.set(color, undefined);
        }
    };

    type = {
        set: async (sequence: RepresentationStyle.Entry['type'], nonsequence: RepresentationStyle.Entry['type']) => {
            const representationStyle: RepresentationStyle = {
                sequence: {
                    type: sequence
                },
                hetGroups: {
                    type: nonsequence
                },
                nonStandard: {
                    type: nonsequence
                },
                water: {
                    type: nonsequence
                }
            };
            await this.updateRepresentationStyle(representationStyle);
        },
        cartoon: async () => {
            await this.type.set('cartoon', 'ball-and-stick');
        },
        ballAndStick: async () => {
            const type = 'ball-and-stick';
            await this.type.set(type, type);
        },
        surface: async () => {
            const type = 'gaussian-surface';
            await this.type.set(type, type);
        }
    };
}