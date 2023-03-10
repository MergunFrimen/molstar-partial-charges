import { createPluginUI } from 'molstar/lib/mol-plugin-ui/react18';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { DefaultPluginUISpec, PluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { StructureFocusRepresentation } from 'molstar/lib/mol-plugin/behavior/dynamic/selection/structure-focus-representation';
import { PluginSpec } from 'molstar/lib/mol-plugin/spec';
import { MmcifFormat } from 'molstar/lib/mol-model-formats/structure/mmcif';
import { Model, StructureSelection } from 'molstar/lib/mol-model/structure';
import { BallAndStickRepresentationProvider } from 'molstar/lib/mol-repr/structure/representation/ball-and-stick';
import { GaussianSurfaceRepresentationProvider } from 'molstar/lib/mol-repr/structure/representation/gaussian-surface';
import { ElementSymbolColorThemeProvider } from 'molstar/lib/mol-theme/color/element-symbol';
import { PhysicalSizeThemeProvider } from 'molstar/lib/mol-theme/size/physical';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';
import { BuiltInTrajectoryFormat } from 'molstar/lib/mol-plugin-state/formats/trajectory';
import { AtomKey, Color, Representation3D, Size, Type } from './types';
import { SbNcbrPartialCharges } from './behavior';
import { SbNcbrPartialChargesPropertyProvider } from './property';
import { SbNcbrPartialChargesColorThemeProvider } from './color';
import { MAQualityAssessment } from 'molstar/lib/extensions/model-archive/quality-assessment/behavior';
import { PLDDTConfidenceColorThemeProvider } from 'molstar/lib/extensions/model-archive/quality-assessment/color/plddt';
import merge from 'lodash.merge';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { Script } from 'molstar/lib/mol-script/script';

export default class MolstarPartialCharges {
    constructor(public plugin: PluginUIContext) {}

    static async create(target: string) {
        const defaultSpecs = DefaultPluginUISpec();
        const specs: PluginUISpec = {
            behaviors: [
                ...defaultSpecs.behaviors,
                PluginSpec.Behavior(SbNcbrPartialCharges),
                PluginSpec.Behavior(MAQualityAssessment),
            ],
            components: {
                ...defaultSpecs.components,
                remoteState: 'none',
            },
            config: [[PluginConfig.Viewport.ShowAnimation, false]],
            layout: {
                initial: {
                    isExpanded: false,
                    showControls: false,
                    regionState: {
                        bottom: 'full',
                        left: 'collapsed',
                        right: 'full',
                        top: 'full',
                    },
                },
            },
        };

        const root = document.getElementById(target);
        if (!root) throw new Error(`Element with ID '${target}' not found.`);
        const plugin = await createPluginUI(root, specs);
        return new MolstarPartialCharges(plugin);
    }

    async load(url: string, format: BuiltInTrajectoryFormat = 'mmcif') {
        await this.plugin.clear();

        const data = await this.plugin.builders.data.download({ url }, { state: { isGhost: true } });
        const trajectory = await this.plugin.builders.structure.parseTrajectory(data, format);
        await this.plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default', {
            showUnitcell: false,
            representationPreset: 'auto',
        });

        await this.setInitialRepresentationState();

        if (format === 'mmcif') {
            this.sanityCheck();
        }
    }

    charges = {
        // getTypeIds: () => {
        //     const model = this.getModel();
        //     if (!model) throw new Error('No model found');
        //     const data = SbNcbrPartialChargesPropertyProvider.get(model).value?.data;
        //     if (!data) throw new Error('No data found');
        //     return data.typeIdToMethod.keys();
        // },
        getMethodNames: () => {
            const model = this.getModel();
            if (!model) throw new Error('No model found');
            const data = SbNcbrPartialChargesPropertyProvider.get(model).value?.data;
            if (!data) throw new Error('No data found');
            return Array.from(data.typeIdToMethod.values());
        },
        // getMethodName: (typeId: number) => {
        //     const model = this.getModel();
        //     if (!model) throw new Error('No model found');
        //     const data = SbNcbrPartialChargesPropertyProvider.get(model).value?.data;
        //     if (!data) throw new Error('No data found');
        //     return data.typeIdToMethod.get(typeId);
        // },
        setTypeId: async (typeId: number) => {
            await this.updateModelPropertyData(typeId);
        },
        getRelativeCharge: () => {
            const model = this.getModel();
            if (!model) throw new Error('No model loaded.');
            const typeId = SbNcbrPartialChargesPropertyProvider.getParams(model).typeId.defaultValue;
            const charge = SbNcbrPartialChargesPropertyProvider.get(model).value?.data?.maxAbsoluteCharges.get(typeId);
            if (!charge) throw new Error('No charge found.');
            return charge;
        },
    };

    color = {
        default: async () => {
            await this.updateColor('default');
        },
        alphaFold: async () => {
            await this.updateColor(PLDDTConfidenceColorThemeProvider.name);
        },
        absolute: async (max: number) => {
            await this.updateColor(this.partialChargesColorProps.name, {
                max,
                absolute: true,
            });
        },
        relative: async () => {
            await this.updateColor(this.partialChargesColorProps.name, {
                absolute: false,
            });
        },
    };

    type = {
        isDefaultApplicable: () => {
            const other = ['cartoon', 'carbohydrate'];
            return Array.from(this.defaultProps.values()).some(({ type }) => other.includes(type.name));
        },
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
    visual = {
        focus: (key: AtomKey) => {
            const data = this.plugin.managers.structure.hierarchy.current.structures[0].components[0].cell.obj?.data;
            if (!data) return;

            const { labelCompId, labelSeqId, labelAtomId } = key;

            const sel = Script.getStructureSelection(
                (Q) =>
                    Q.struct.generator.atomGroups({
                        'atom-test': Q.core.logic.and([
                            Q.core.rel.eq([Q.struct.atomProperty.macromolecular.label_comp_id(), labelCompId]),
                            Q.core.rel.eq([Q.struct.atomProperty.macromolecular.label_seq_id(), labelSeqId]),
                            Q.core.rel.eq([Q.struct.atomProperty.macromolecular.label_atom_id(), labelAtomId]),
                        ]),
                    }),
                data
            );

            const loci = StructureSelection.toLociWithSourceUnits(sel);
            this.plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
            this.plugin.managers.interactivity.lociSelects.selectOnly({ loci });
            this.plugin.managers.camera.focusLoci(loci);
            this.plugin.managers.structure.focus.setFromLoci(loci);
        },
    };

    private readonly defaultProps: Map<string, Representation3D> = new Map();

    private readonly ballAndStickTypeProps: {
        type: Type;
        sizeTheme: Size;
    } = {
        type: {
            name: BallAndStickRepresentationProvider.name,
            params: {
                ...BallAndStickRepresentationProvider.defaultValues,
            },
        },
        sizeTheme: {
            name: PhysicalSizeThemeProvider.name,
            params: {
                ...PhysicalSizeThemeProvider.defaultValues,
            },
        },
    };
    private readonly surfaceTypeProps: {
        type: Type;
        sizeTheme: Size;
    } = {
        type: {
            name: GaussianSurfaceRepresentationProvider.name,
            params: {
                ...GaussianSurfaceRepresentationProvider.defaultValues,
            },
        },
        sizeTheme: {
            name: PhysicalSizeThemeProvider.name,
            params: {
                ...PhysicalSizeThemeProvider.defaultValues,
                scale: 1,
            },
        },
    };
    private readonly partialChargesColorProps: Color = {
        name: SbNcbrPartialChargesColorThemeProvider.name,
        params: {
            // not using default values
        },
    };
    private readonly elementSymbolColorProps: Color = {
        name: ElementSymbolColorThemeProvider.name,
        params: {
            ...ElementSymbolColorThemeProvider.defaultValues,
        },
    };
    private readonly plddtColorProps: Color = {
        name: PLDDTConfidenceColorThemeProvider.name,
        params: {
            ...PLDDTConfidenceColorThemeProvider.defaultValues,
        },
    };
    private readonly physicalSizeProps: Size = {
        name: PhysicalSizeThemeProvider.name,
        params: {
            ...PhysicalSizeThemeProvider.defaultValues,
        },
    };

    private async setInitialRepresentationState() {
        this.defaultProps.clear();
        await this.plugin.dataTransaction(() => {
            for (const structure of this.plugin.managers.structure.hierarchy.current.structures) {
                for (const component of structure.components) {
                    for (const representation of component.representations) {
                        const params = representation.cell.transform.params;
                        if (!params) continue;
                        const { type } = params;
                        this.defaultProps.set(representation.cell.transform.ref, {
                            type: type as Type,
                            colorTheme: this.elementSymbolColorProps,
                            sizeTheme: this.physicalSizeProps,
                        });
                    }
                }
            }
        });
    }

    private async updateType(name: Type['name']) {
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
                            type = this.defaultProps.get(representation.cell.transform.ref)?.type;
                            sizeTheme = this.defaultProps.get(representation.cell.transform.ref)?.sizeTheme;
                        }

                        const oldProps = representation.cell.transform.params;

                        // switches to residue charge for certain representations
                        const showResidueChargeFor = ['cartoon', 'carbohydrate'];
                        const typeName = type?.name;
                        const showResidueCharge = typeName && showResidueChargeFor.includes(typeName);
                        let colorTheme = oldProps?.colorTheme;
                        colorTheme = merge({}, colorTheme, { params: { showResidueCharge } });

                        const mergedProps = merge({}, oldProps, {
                            type,
                            sizeTheme,
                            colorTheme,
                        });
                        update.to(representation.cell).update(mergedProps);
                    }
                }
                await update.commit({ canUndo: 'Update Theme' });
            }
            this.updateGranularity(name);
        });
    }

    private async updateColor(name: Color['name'], params: Color['params'] = {}) {
        await this.plugin.dataTransaction(async () => {
            for (const structure of this.plugin.managers.structure.hierarchy.current.structures) {
                const update = this.plugin.state.data.build();
                for (const component of structure.components) {
                    for (const representation of component.representations) {
                        let colorTheme;

                        if (!this.defaultProps.has(representation.cell.transform.ref)) {
                            colorTheme = this.elementSymbolColorProps;
                        } else if (name === this.partialChargesColorProps.name) {
                            colorTheme = this.partialChargesColorProps;
                        } else if (name === this.plddtColorProps.name) {
                            colorTheme = this.plddtColorProps;
                        } else if (name === 'default') {
                            colorTheme = this.defaultProps.get(representation.cell.transform.ref)?.colorTheme;
                        } else {
                            throw new Error('Invalid color theme');
                        }

                        // switches to residue charge for certain representations
                        const showResidueChargeFor = ['cartoon', 'carbohydrate'];
                        const typeName = representation.cell.transform.params?.type?.name;
                        const showResidueCharge = typeName && showResidueChargeFor.includes(typeName);
                        params = merge({}, params, { showResidueCharge });

                        const oldProps = representation.cell.transform.params;
                        const mergedProps = merge({}, oldProps, { colorTheme }, { colorTheme: { params } });
                        update.to(representation.cell).update(mergedProps);
                    }
                }
                await update.commit({ canUndo: 'Update Theme' });
            }
            await this.updateFocusColorTheme(name, params);
        });
    }

    private sanityCheck() {
        // if (!this.plugin) throw new Error('No plugin found.');
        // if (!this.plugin.managers.structure.hierarchy.current.structures.length)
        //     throw new Error('No structure loaded.');
        const model = this.getModel();
        if (!model) throw new Error('No model loaded.');
        const sourceData = model.sourceData as MmcifFormat;
        const atomCount = model.atomicHierarchy.atoms._rowCount;
        const chargesCount = sourceData.data.frame.categories.partial_atomic_charges.rowCount;
        if (atomCount !== chargesCount) throw new Error('Atom count does not match charge count.');
    }

    private updateGranularity(type: Type['name']) {
        this.plugin.managers.interactivity.setProps({
            granularity: type === 'default' ? 'residue' : 'element',
        });
    }

    private async updateFocusColorTheme(color: Color['name'], params: Color['params'] = {}) {
        let props =
            color === SbNcbrPartialChargesColorThemeProvider.name
                ? this.partialChargesColorProps
                : this.elementSymbolColorProps;
        props = merge({}, props, { params: { ...params, showResidueCharge: false } });
        await this.plugin.state.updateBehavior(StructureFocusRepresentation, (p) => {
            p.targetParams.colorTheme = props;
            p.surroundingsParams.colorTheme = props;
        });
    }

    private async updateModelPropertyData(typeId: number) {
        const model = this.getModel();
        if (!model || !this.isTypeIdValid(model, typeId)) return;
        SbNcbrPartialChargesPropertyProvider.set(model, { typeId });
        await this.updateColor(SbNcbrPartialChargesColorThemeProvider.name, { typeId });
    }

    private getModel() {
        return this.plugin.managers.structure.hierarchy.current.structures[0].model?.cell?.obj?.data;
    }

    private isTypeIdValid(model: Model, typeId: number) {
        const sourceData = model.sourceData as MmcifFormat;
        const typeIds = new Set(
            sourceData.data.frame.categories.partial_atomic_charges_meta.getField('type')?.toIntArray()
        );
        return typeIds.has(typeId);
    }
}
