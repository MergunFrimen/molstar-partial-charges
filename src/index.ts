import { createPluginUI } from 'molstar/lib/mol-plugin-ui/react18';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { DefaultPluginUISpec, PluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { StructureFocusRepresentation } from 'molstar/lib/mol-plugin/behavior/dynamic/selection/structure-focus-representation';
import { PluginSpec } from 'molstar/lib/mol-plugin/spec';
import { MmcifFormat } from 'molstar/lib/mol-model-formats/structure/mmcif';
import { ACC2ColorThemeProvider } from './color';
import { ACC2LociLabelProvider } from './label';
import { ACC2PropertyProvider } from './property';
import { Representation3D } from './types';
import merge from 'lodash.merge';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { Model } from 'molstar/lib/mol-model/structure';
import { BallAndStickRepresentationProvider } from 'molstar/lib/mol-repr/structure/representation/ball-and-stick'
import { GaussianSurfaceRepresentationProvider } from 'molstar/lib/mol-repr/structure/representation/gaussian-surface'
import { ElementSymbolColorThemeProvider } from 'molstar/lib/mol-theme/color/element-symbol';
import { PhysicalSizeThemeProvider } from 'molstar/lib/mol-theme/size/physical';

/**
 * Wrapper class for the Mol* plugin.
 * 
 * This class provides a simple interface for loading structures and setting representations.
 */
export default class ACC2PartialChargesWrapper {

    private plugin!: PluginUIContext;

    /**
     * Initialize the plugin and attach it to the given HTML element.
     * 
     * @param target ID of the HTML element to attach the plugin to
     * @param specs PluginUISpec to override default plugin settings
     */
    async init(target: string, specs?: PluginUISpec) {
        const mergedSpecs: PluginUISpec = merge({}, DefaultPluginUISpec(), specs);
        mergedSpecs.behaviors.push(PluginSpec.Behavior(ACC2LociLabelProvider));

        this.plugin = await createPluginUI(document.getElementById(target)!, mergedSpecs);
    
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
        await this.plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default', { showUnitcell: false, representationPreset: 'auto' });
        
        await this.setInitialRepresentationState();
    }

    charges = {
        /**
         * Set which partial charges are used.
         * 
         * @param typeId ID of the partial charge type
         */
        setTypeId: async (typeId: number) => {
            await this.updateModelPropertyData(typeId);
        },
        /**
         * Set the partial charge range to absolute.
         * 
         * TODO: add description of what this does
         * 
         * @param max Absolute maximum partial charge
         */
        absolute: async (max: number) => {
            await this.updateColor(this.partialChargesColorProps.name, { max, absolute: true });
        },
        /**
         * Set the partial charge range to relative.
         */
        relative: async () => {
            await this.updateColor(this.partialChargesColorProps.name, { absolute: false });
        },
    };

    color = {
        /**
         * Set the color theme to the default color theme (whatever Molstar picks).
         */
        default: async () => {
            await this.updateColor('default');
        },
        partialCharges: async () => {
            await this.updateColor(this.partialChargesColorProps.name);
        },
    };

    /**
     * Object for updating the representation type.
     */
    type = {
        /**
         * @returns Whether the loaded structure can be viewed with a representation type
         * other than Ball and stick or Surface..
         */
        isDefaultApplicable: () => {
            const other = ['cartoon', 'carbohydrate'];
            return Array.from(this.defaultProps.values()).some(({ type }) => other.includes(type.name));
        },
        /**
         * Set the representation type to the default type (whatever Molstar picks).
         */
        default: async () => {
            await this.updateType('default');
        },
        ballAndStick: async () => {
            await this.updateType(this.ballAndStickTypeProps.type.name);
        },
        surface: async () => {
            await this.updateType(this.surfaceTypeProps.type.name);
        },
    };
    
    // * this might come in handy later
    // private overrideComponents = new Set([
    //     // 'all',
    //     // 'coarse',
    //     // 'branched',
    //     // 'ion',
    //     // 'ligand',
    //     // 'lipid',
    //     // 'nucleic',
    //     // 'non-standard',
    //     // 'polymer',
    //     // 'protein',
    //     // 'water',
    // ].map(v => `structure-component-static-${v}`));

    // private overrideDefaults = {
    //     color: 'element-symbol' as Representation3D.Color,
    //     type: 'ball-and-stick' as Representation3D.Type,
    //     size: 'physical' as Representation3D.Size,
    // };

    
    private readonly defaultProps: Map<string, Representation3D> = new Map();

    private readonly ballAndStickTypeProps: { type: Representation3D.Type, sizeTheme: Representation3D.Size } = {
        type: {
            name: 'ball-and-stick',
            params: {
                ...BallAndStickRepresentationProvider.defaultValues,
            },
        },
        sizeTheme: {
            name: 'physical',
            params: {
                ...PhysicalSizeThemeProvider.defaultValues,
            },
        }
    };
    private readonly surfaceTypeProps: { type: Representation3D.Type, sizeTheme: Representation3D.Size } = {
        type: {
            name: 'molecular-surface',
            params: {
                ...GaussianSurfaceRepresentationProvider.defaultValues,
            },
        },
        sizeTheme: {
            name: 'physical',
            params: {
                ...PhysicalSizeThemeProvider.defaultValues,
                scale: 1.7,
            },
        }

    };
    private readonly partialChargesColorProps: Representation3D.Color = {
        name: 'acc2-partial-charges',
        params: {
            // purposefully not using default values
        },
    };
    private readonly elementSymbolColorProps: Representation3D.Color = {
        name: 'element-symbol',
        params: {
            ...ElementSymbolColorThemeProvider.defaultValues,
        },
    };
    
    private async setInitialRepresentationState() {
        this.defaultProps.clear();
        await this.plugin.dataTransaction(async () => {
            for (const structure of this.plugin.managers.structure.hierarchy.current.structures) {
                for (const component of structure.components) {
                    for (const representation of component.representations) {
                        const { colorTheme, type, sizeTheme } = representation.cell.transform.params!;
                        this.defaultProps.set(representation.cell.transform.ref!, {
                            colorTheme: colorTheme as any,
                            type: type as any,
                            sizeTheme: sizeTheme as any
                        });
                    }
                }
            }
        });
    }

    private async updateType(name: Representation3D.Type['name']) {
        await this.plugin.dataTransaction(async () => {
            for (const structure of this.plugin.managers.structure.hierarchy.current.structures) {
                const update = this.plugin.state.data.build();
                for (const component of structure.components) {
                    for (const representation of component.representations) {
                        let type, sizeTheme;
                        
                        if (!this.defaultProps.has(representation.cell.transform.ref)) continue;

                        if (name === this.ballAndStickTypeProps.type.name) {
                            type = this.ballAndStickTypeProps.type;
                            sizeTheme = this.ballAndStickTypeProps.sizeTheme;
                        } else if (name === this.surfaceTypeProps.type.name) {
                            type = this.surfaceTypeProps.type;
                            sizeTheme = this.surfaceTypeProps.sizeTheme;
                        } else {
                            type = this.defaultProps.get(representation.cell.transform.ref)!.type;
                            sizeTheme = this.defaultProps.get(representation.cell.transform.ref)!.sizeTheme;
                        }

                        const oldProps = representation.cell.transform.params!;
                        const mergedProps = merge({}, oldProps, { type, sizeTheme });
                        update.to(representation.cell).update(mergedProps);
                    }
                }
                await update.commit({ canUndo: 'Update Theme' });
            }
            this.updateGranularity(name);
        });
    }

    private async updateColor(name: Representation3D.Color['name'], params: Representation3D.Color['params'] = {}) {
        await this.plugin.dataTransaction(async () => {
            for (const structure of this.plugin.managers.structure.hierarchy.current.structures) {
                const update = this.plugin.state.data.build();
                for (const component of structure.components) {
                    for (const representation of component.representations) {
                        let colorTheme: Representation3D.Color;
                        
                        if (!this.defaultProps.has(representation.cell.transform.ref)) {
                            colorTheme = this.elementSymbolColorProps;
                        }
                        else if (name === this.partialChargesColorProps.name) {
                            colorTheme = this.partialChargesColorProps;
                        } else {
                            colorTheme = this.defaultProps.get(representation.cell.transform.ref)!.colorTheme;
                        }

                        const oldProps = representation.cell.transform.params!;
                        const mergedProps = merge({}, oldProps, { colorTheme }, { colorTheme: { params }});
                        update.to(representation.cell).update(mergedProps);
                    }
                }
                await update.commit({ canUndo: 'Update Theme' });
            }
            await this.updateFocusColorTheme(name, params);
        });
    }

    private updateGranularity(type: Representation3D.Type['name']) {
        this.plugin.managers.interactivity.setProps({ granularity: type === 'default' ? 'residue' : 'element' });
    }

    // TODO: test if charge range works
    private async updateFocusColorTheme(color: Representation3D.Color['name'], params: Representation3D.Color['params'] = {}) {
        const props = color === 'acc2-partial-charges' ? this.partialChargesColorProps : this.elementSymbolColorProps;
        await this.plugin.state.updateBehavior(StructureFocusRepresentation, p => {
            p.targetParams.colorTheme = { name: props.name, params: { ...props.params, ...params } };
            p.surroundingsParams.colorTheme = { name: props.name, params: { ...props.params, ...params } };
        });
    }

    private async updateModelPropertyData(typeId: number) {
        const model = this.getModel();
        if (!model || !this.isTypeIdValid(model, typeId)) return;
        ACC2PropertyProvider.set(model, { typeId });
        await this.updateColor('acc2-partial-charges', { typeId });
    };

    private getModel() {
        return this.plugin.managers.structure.hierarchy.current.structures[0].model?.cell?.obj?.data;
    }

    private isTypeIdValid(model: Model, typeId: number) {
        const sourceData = model.sourceData as MmcifFormat;
        const typeIds = new Set(sourceData.data.frame.categories.partial_atomic_charges.getField('type_id')?.toIntArray());
        return typeIds.has(typeId);
    }
}
