import { Model } from 'molstar/lib/mol-model/structure';
import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';
import { PropertyWrapper } from 'molstar/lib/mol-model-props/common/wrapper';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { MmcifFormat } from 'molstar/lib/mol-model-formats/structure/mmcif';
import { CustomPropertyDescriptor } from 'molstar/lib/mol-model/custom-property';
import { CustomModelProperty } from 'molstar/lib/mol-model-props/common/custom-model-property';

// TODO: add atomIdToEntityType

type ChargesTableType = {
    atomIdToCharge: Map<number, Map<number, number>>;
    residueToCharge: Map<number, Map<number, number>>;
    maxAbsoluteCharges: Map<number, number>;
    // atomIdToEntityType: Map<number, string>;
};
type ACC2Property = PropertyWrapper<ChargesTableType | undefined>;

const ACC2PropertyParams = {
    typeId: PD.Numeric(1)
};
type ACC2PropertyParams = typeof ACC2PropertyParams;

export namespace ACC2Property {
    export async function getData(model: Model): Promise<CustomProperty.Data<ACC2Property>> {
        const info = PropertyWrapper.createInfo();

        if (!isApplicable(model))
            return { value: { info, data: undefined } };

        const atomIdToCharge = getAtomIdToCharge(model);
        const maxAbsoluteCharges = getMaxAbsoluteCharges(atomIdToCharge);
        const residueToCharge = getResidueToCharges(model, atomIdToCharge);
        // const atomIdToEntityType = getAtomIdToEntityType(model);

        return { value: { info, data: { atomIdToCharge, residueToCharge, maxAbsoluteCharges } } };
    }

    function getAtomIdToCharge(model: Model): ChargesTableType['atomIdToCharge'] {
        const sourceData = model.sourceData as MmcifFormat;
        const rowCount = sourceData.data.frame.categories.partial_atomic_charges.rowCount;
        const typeIds = sourceData.data.frame.categories.partial_atomic_charges.getField('type_id')?.toIntArray()!;
        const atomIds = sourceData.data.frame.categories.partial_atomic_charges.getField('atom_id')?.toIntArray()!;
        const charges = sourceData.data.frame.categories.partial_atomic_charges.getField('charge')?.toFloatArray()!;
        const atomIdToCharge: ChargesTableType['atomIdToCharge'] = new Map();

        for (let i = 0; i < rowCount; ++i) {
            const typeId = typeIds[i];
            const atomId = atomIds[i];
            const charge = charges[i];
            if (!atomIdToCharge.has(typeId))
                atomIdToCharge.set(typeId, new Map());
            atomIdToCharge.get(typeId)!.set(atomId, charge);
        }

        ACC2PropertyParams.typeId.defaultValue = Math.min(...typeIds);

        return atomIdToCharge;
    }

    function getMaxAbsoluteCharges(atomIdToCharge: ChargesTableType['atomIdToCharge']): ChargesTableType['maxAbsoluteCharges'] {
        const chargesMax = new Map();

        Array.from(atomIdToCharge.keys()).forEach((typeId) => {
            const charges = Array.from(atomIdToCharge.get(typeId)!.values());
            const min = Math.min(...charges);
            const max = Math.max(...charges);
            const bound = Math.max(Math.abs(min), max);
            chargesMax.set(typeId, bound);
        });

        return chargesMax;
    }

    function getResidueToCharges(model: Model, atomIdToCharge: ChargesTableType['atomIdToCharge']) {
        const { offsets } = model.atomicHierarchy.residueAtomSegments;
        const residueToCharge = new Map();

        Array.from(atomIdToCharge.keys()).forEach((typeId) => {
            for (let i = 1; i < offsets.length; ++i) {
                let charge = 0;
                for (let id = offsets[i - 1]; id < offsets[i]; ++id) {
                    charge += atomIdToCharge.get(typeId)!.get(id + 1)!;
                }
                for (let id = offsets[i - 1]; id < offsets[i]; ++id) {
                    if (!residueToCharge.has(typeId))
                        residueToCharge.set(typeId, new Map());
                    residueToCharge.get(typeId)!.set(id + 1, charge);
                }
            }
        });

        return residueToCharge;
    }

    // function getAtomIdToEntityType(model: Model) {
    //     const atomIdToEntityType = new Map();

    //     const sourceData = model.sourceData as MmcifFormat;
    //     const rowCount = sourceData.data.frame.categories.partial_atomic_charges.rowCount;
    //     const typeIds = sourceData.data.frame.categories.partial_atomic_charges.getField('type_id')?.toIntArray()!;
    //     const atomIds = sourceData.data.frame.categories.partial_atomic_charges.getField('atom_id')?.toIntArray()!;
    //     const atomIds = sourceData.data.frame.categories.partial_atomic_charges.getField('label_type_id')?.toIntArray()!;
    //     const charges = sourceData.data.frame.categories.partial_atomic_charges.getField('charge')?.toFloatArray()!;
    //     const atomIdToCharge: ChargesTableType['atomIdToCharge'] = new Map();
    // }

    function hasACC2Categories(model: Model): boolean {
        if (!MmcifFormat.is(model.sourceData))
            return false;
        const names = (model.sourceData).data.frame.categoryNames;
        return names.includes('atom_site')
            && names.includes('partial_atomic_charges')
            && names.includes('partial_atomic_charges_meta');
    }

    export function isApplicable(model?: Model): boolean {
        return !!model && model.sourceData.kind === 'mmCIF' && hasACC2Categories(model);
    }
}

export const ACC2PropertyProvider: CustomModelProperty.Provider<ACC2PropertyParams, ACC2Property> = CustomModelProperty.createProvider({
    label: 'ACC2 Property Provider',
    descriptor: CustomPropertyDescriptor({
        name: 'acc2-property-provider',
    }),
    type: 'static',
    defaultParams: ACC2PropertyParams,
    getParams: (model: Model) => ACC2PropertyParams,
    isApplicable: (model: Model) => ACC2Property.isApplicable(model),
    obtain: async (ctx: CustomProperty.Context, model: Model) => ACC2Property.getData(model),
});
