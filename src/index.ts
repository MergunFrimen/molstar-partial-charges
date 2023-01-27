import { createPluginUI } from 'molstar/lib/mol-plugin-ui/react18';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { DefaultPluginUISpec, PluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { StateTransform } from 'molstar/lib/mol-state';
import { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects';
import { StructureFocusRepresentation } from 'molstar/lib/mol-plugin/behavior/dynamic/selection/structure-focus-representation';
import { PluginSpec } from 'molstar/lib/mol-plugin/spec';
import { MmcifFormat } from 'molstar/lib/mol-model-formats/structure/mmcif';
import { ACC2ColorThemeProvider } from './color';
import { ACC2LociLabelProvider } from './label';
import { ACC2PropertyProvider } from './property';
import { RepresentationStyle } from './types';
import merge from 'lodash.merge';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { StateTransforms } from 'molstar/lib/mol-plugin-state/transforms';
import { UUID } from 'molstar/lib/mol-util';

/**
 * Wrapper class for the Mol* plugin.
 */
export default class PartialChargesWrapper {
    /**
     * The Mol* plugin.
     */
    private plugin!: PluginUIContext;

    /**
     * Initialize the plugin and attach it to the given HTML element.
     * 
     * @param target ID of the HTML element to attach the plugin to
     * @param specs PluginUISpec to override default plugin settings
     */
    async init(target: string, specs?: PluginUISpec) {
        this.plugin = await createPluginUI(document.getElementById(target)!, merge({}, DefaultPluginUISpec(), specs, {
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
        }));

        this.plugin.managers.interactivity.setProps({ granularity: 'element' });
        this.plugin.customModelProperties.register(ACC2PropertyProvider, true);
        this.plugin.representation.structure.themes.colorThemeRegistry.add(ACC2ColorThemeProvider);
    }

    /**
     * Load a structure from a URL and set the initial representation state.
     * 
     * @param url URL of the structure to load
     */
    async load(url: string) {
        await this.plugin.clear();
        const data = await this.plugin.builders.data.download({ url }, { state: { isGhost: true } });
        const trajectory = await this.plugin.builders.structure.parseTrajectory(data, 'mmcif');
        await this.plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default');
        
        await this.setInitialRepresentationState();
        await this.updateColor('acc2-partial-charges');
    }
    
    /**
     * List of components to override with default representation.
     */
    private overrideComponents = new Set([
        // 'all',
        // 'coarse',
        'branched',
        // 'ion',
        // 'ligand',
        // 'lipid',
        // 'nucleic',
        // 'non-standard',
        // 'polymer',
        // 'protein',
        // 'water',
    ].map(v => `structure-component-static-${v}`));

    private overrideDefaults = {
        color: 'element-symbol',
        type: 'ball-and-stick',
        size: 'physical',
    };

    private initialRepresentationState: Map<string, { color: string, type: string}> = new Map();
    /**
     * Set the default representation for all components.
     */
    private async setInitialRepresentationState() {
        console.log(this.plugin.state.data.cells);
        console.log(this.getModel());
        await this.plugin.dataTransaction(async () => {
            for (const structure of this.plugin.managers.structure.hierarchy.current.structures) {
                const update = this.plugin.state.data.build();
                for (const component of structure.components) {
                    for (const representation of component.representations) {
                        if (this.overrideComponents.has(component.key!)) {
                            update.to(representation.cell).delete(representation.cell.transform.ref);
                        }
                        else {
                            let props = representation.cell.transform.params;
                            this.initialRepresentationState.set(representation.cell.transform.ref, { color: props?.colorTheme.name!, type: props?.type.name! });
                        }
                    }
                    if (this.overrideComponents.has(component.key!)) {
                        const { color, size, type } = this.overrideDefaults
                        const ref = UUID.create22();
                        update.to(component.cell).applyOrUpdate(ref, StateTransforms.Representation.StructureRepresentation3D, {
                            type: { name: type, params: {} },
                            colorTheme: { name: color, params: {} },
                            sizeTheme: { name: size, params: {} }
                        });
                        this.initialRepresentationState.set(ref, { color, type });
                    }
                }
                await update.commit({ canUndo: 'Update Theme' });
            }
        });
    }

    // TODO: remove
    // private async getRepresentationState() {
    //     const representationState = new Map();
    //     for (const structure of this.plugin.managers.structure.hierarchy.current.structures) {
    //         for (const component of structure.components) {
    //             for (const representation of component.representations) {
    //                 representationState.set(representation.cell.transform.ref, { color: representation.cell.transform.params?.colorTheme, type: representation.cell.transform.params?.type });
    //             }
    //         }
    //     }
    //     return representationState;
    // }

    async updateType(type: RepresentationStyle.Type) {
        await this.plugin.dataTransaction(async () => {
            for (const structure of this.plugin.managers.structure.hierarchy.current.structures) {
                const update = this.plugin.state.data.build();
                for (const component of structure.components) {
                    for (const representation of component.representations) {
                        if (!this.initialRepresentationState.has(representation.cell.transform.ref)) continue
                        let props = representation.cell.transform.params;
                        
                        const name = type === 'default' ? this.initialRepresentationState.get(representation.cell.transform.ref)?.type : type;
                        props = merge({}, props, { type: { name } });
                        
                        // change size for surface
                        const value = props?.type.name === 'gaussian-surface' ? 1.6 : 1;
                        props = merge({}, props, { sizeTheme: { params: { value } } });
                        
                        update.to(representation.cell).update({ ...props });
                    }
                }
                await update.commit({ canUndo: 'Update Theme' });
            }
        });
    }

    async updateColor(color: RepresentationStyle.Color, params: RepresentationStyle.ColorParams={}) {
        await this.plugin.dataTransaction(async () => {
            for (const structure of this.plugin.managers.structure.hierarchy.current.structures) {
                const update = this.plugin.state.data.build();
                for (const component of structure.components) {
                    for (const representation of component.representations) {
                        if (!this.initialRepresentationState.has(representation.cell.transform.ref)) continue
                        let props = representation.cell.transform.params;
                        
                        const name = color === 'default' ? this.initialRepresentationState.get(representation.cell.transform.ref)?.color : color;
                        const showResidueCharge = name === 'acc2-partial-charges' && props?.type.name === 'cartoon';
                        props = merge({}, props, { colorTheme: { name, params: { ...params, showResidueCharge } } });
                        console.log(props);
                        
                        update.to(representation.cell).update({ ...props });
                    }
                }
                await update.commit({ canUndo: 'Update Theme' });
            }
        });
        await this.updateFocusColorTheme(color, params);
    }

    // private async updateRepresentationStyle(newProps: RepresentationStyle) {

    //     const defaultProps: Map<string, { color: string, type: string}> = new Map();

    //     await this.plugin.dataTransaction(async () => {
    //         // console.log(this.plugin.managers.structure.hierarchy.current.structures);
    //         for (const structure of this.plugin.managers.structure.hierarchy.current.structures) {
    //             const update = this.plugin.state.data.build();

    //             for (const component of structure.components) {
    //                 for (const representation of component.representations) {
    //                     // console.log("ref", representation.cell.transform.ref);
    //                     const oldProps = representation.cell.transform.params;
    //                     let props = oldProps;
                        
    //                     defaultProps.set(representation.cell.transform.ref, { color: oldProps?.colorTheme.name!, type: oldProps?.type.name! });
    //                     // console.log(representation.component.cell.obj?.label, props?.type.name);
                        
    //                     if (this.residueType.has(representation.component.key!)) {
    //                         // console.log(`${component.key} has residues`);
    //                         props = merge({}, props, newProps.residue);
    //                         const isResidue = props?.type.name === 'cartoon' && props.colorTheme.name === 'acc2-partial-charges';
    //                         props = merge({}, props, { colorTheme: { params: { isResidue } } });
    //                     }
    //                     else if (this.atomTypes.has(representation.component.key!)) {
    //                         // console.log(`${component.key} does not have residues`);
    //                         props = merge({}, props, newProps.nonResidue);
    //                     }
    //                     else {
    //                         // console.log(`${component.key} is unknown`);
    //                     }
                        
    //                     // when surface is selected, increase size
    //                     const value = props?.type.name === 'gaussian-surface' ? 1.6 : 1;
    //                     props = merge({}, props, { sizeTheme: { params: { value } } });

    //                         update.to(representation.cell).update({ ...props });
    //                 }
    //             }

    //             await update.commit({ canUndo: 'Update Theme' });
    //         }
    //     });

    //     console.log(defaultProps);
    // }

    // TODO: might need to update range
    private async updateFocusColorTheme(color: RepresentationStyle.Color, params: RepresentationStyle.ColorParams={}) {
        await this.plugin.state.updateBehavior(StructureFocusRepresentation, (p: any) => {
            p.surroundingsParams.colorTheme = { name: color, params };
            p.targetParams.colorTheme = { name: color, params };
        });
    }

    // TODO: get cell by label
    private getModel() {
        // console.log(this.plugin.state.data.select("-=root=-"));
        // return this.plugin.state.data.select("-=root=-").find(c => c.obj?.type.name === 'Model')?.transform.ref;
        this.plugin.state.data.cells.forEach((v, k) => {
            if (v.obj?.type.name === 'Model') {
                console.log(this.plugin.state.data.select(k)[0]);
            }
        });
    }

    // TODO: fix this
    charges = {
        setTypeId: async (typeId: number) => {
            // const model = this.getObj<PluginStateObject.Molecule.Model>('Model');
            // const sourceData = model.sourceData as MmcifFormat;
            // const validTypeIds = new Set(sourceData.data.frame.categories.partial_atomic_charges.getField('type_id')?.toIntArray());
            // if (!validTypeIds.has(typeId)) return;
            // ACC2PropertyProvider.set(model, { typeId });
            // await this.coloring.set({params: {typeId}}, {params: {typeId}});
            await this.updateColor('acc2-partial-charges', { typeId });
        },
        setMax: async (max: number) => {
            await this.updateColor('acc2-partial-charges', { max, absolute: true });
        }
    };

    coloring = {
        set: async (color: RepresentationStyle.Color) => {
            await this.updateColor(color);
        },
        partialCharges: async () => {
            await this.updateColor('acc2-partial-charges');
        },
        default: async () => {
            await this.updateColor('default');
        }
    };

    type = {
        set: async (type: RepresentationStyle.Type) => {
            await this.updateType(type);
        },
        cartoon: async () => {
            this.updateType('default');
        },
        ballAndStick: async () => {
            this.updateType('ball-and-stick');
        },
        surface: async () => {
            this.updateType('gaussian-surface');
        }
    };

    // size = {
    //     default: async () => {
    //         this.size.set({ name: 'uniform', params: { value: 1 } });
    //     }
    // }
}
