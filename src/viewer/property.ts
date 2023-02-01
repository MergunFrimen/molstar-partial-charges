import { Model } from 'molstar/lib/mol-model/structure';
import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';
import { PropertyWrapper } from 'molstar/lib/mol-model-props/common/wrapper';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { MmcifFormat } from 'molstar/lib/mol-model-formats/structure/mmcif';
import { CustomPropertyDescriptor } from 'molstar/lib/mol-model/custom-property';
import { CustomModelProperty } from 'molstar/lib/mol-model-props/common/custom-model-property';

// TODO: add atomIdToEntityType

type ChargesData = {
    atomIdToCharge: Map<number, Map<number, number>>;
    residueToCharge: Map<number, Map<number, number>>;
    maxAbsoluteCharges: Map<number, number>;
    // atomIdToEntityType: Map<number, string>;
};
type PartialCharges = PropertyWrapper<ChargesData | undefined>;

const ACC2PropertyParams = {
    typeId: PD.Numeric(1),
};
type ACC2PropertyParams = typeof ACC2PropertyParams;

// eslint-disable-next-line @typescript-eslint/require-await
async function getData(model: Model): Promise<CustomProperty.Data<PartialCharges>> {
    const info = PropertyWrapper.createInfo();

    if (!isApplicable(model)) return { value: { info, data: undefined } };

    const atomIdToCharge = getAtomIdToCharge(model);
    const maxAbsoluteCharges = getMaxAbsoluteCharges(atomIdToCharge);
    const residueToCharge = getResidueToCharges(model, atomIdToCharge);
    // const atomIdToEntityType = getAtomIdToEntityType(model);

    return { value: { info, data: { atomIdToCharge, residueToCharge, maxAbsoluteCharges } } };
}

function getAtomIdToCharge(model: Model): ChargesData['atomIdToCharge'] {
    const atomIdToCharge: ChargesData['atomIdToCharge'] = new Map();

    const sourceData = model.sourceData as MmcifFormat;
    const rowCount = sourceData.data.frame.categories.partial_atomic_charges.rowCount;
    const typeIds = sourceData.data.frame.categories.partial_atomic_charges.getField('type_id')?.toIntArray();
    const atomIds = sourceData.data.frame.categories.partial_atomic_charges.getField('atom_id')?.toIntArray();
    const charges = sourceData.data.frame.categories.partial_atomic_charges.getField('charge')?.toFloatArray();

    if (!typeIds || !atomIds || !charges) throw new Error('Invalid data');

    for (let i = 0; i < rowCount; ++i) {
        const typeId = typeIds[i];
        const atomId = atomIds[i];
        const charge = charges[i];
        if (!atomIdToCharge.has(typeId)) atomIdToCharge.set(typeId, new Map());
        atomIdToCharge.get(typeId)?.set(atomId, charge);
    }

    ACC2PropertyParams.typeId.defaultValue = Math.min(...typeIds);

    return atomIdToCharge;
}

function getMaxAbsoluteCharges(atomIdToCharge: ChargesData['atomIdToCharge']): ChargesData['maxAbsoluteCharges'] {
    const maxAbsoluteCharges: ChargesData['maxAbsoluteCharges'] = new Map();

    Array.from(atomIdToCharge.keys()).forEach((typeId) => {
        const charges = Array.from(atomIdToCharge.get(typeId)?.values() || []);
        const min = Math.min(...charges);
        const max = Math.max(...charges);
        const bound = Math.max(Math.abs(min), max);
        maxAbsoluteCharges.set(typeId, bound);
    });

    return maxAbsoluteCharges;
}

function getResidueToCharges(model: Model, atomIdToCharge: ChargesData['atomIdToCharge']) {
    const { offsets } = model.atomicHierarchy.residueAtomSegments;
    const residueToCharge: ChargesData['residueToCharge'] = new Map();

    Array.from(atomIdToCharge.keys()).forEach((typeId) => {
        for (let i = 1; i < offsets.length; ++i) {
            let charge = 0;
            for (let id = offsets[i - 1]; id < offsets[i]; ++id) {
                charge += atomIdToCharge.get(typeId)?.get(id + 1) || 0;
            }
            for (let id = offsets[i - 1]; id < offsets[i]; ++id) {
                if (!residueToCharge.has(typeId)) residueToCharge.set(typeId, new Map<number, number>());
                residueToCharge.get(typeId)?.set(id + 1, charge);
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
    if (!MmcifFormat.is(model.sourceData)) return false;
    const names = model.sourceData.data.frame.categoryNames;
    return (
        names.includes('atom_site') &&
        names.includes('partial_atomic_charges') &&
        names.includes('partial_atomic_charges_meta')
    );
}

export function isApplicable(model?: Model): boolean {
    return !!model && model.sourceData.kind === 'mmCIF' && hasACC2Categories(model);
}

export const ACC2PropertyProvider: CustomModelProperty.Provider<ACC2PropertyParams, PartialCharges> =
    CustomModelProperty.createProvider({
        label: 'ACC2 Property Provider',
        descriptor: CustomPropertyDescriptor({
            name: 'acc2-property-provider',
        }),
        type: 'static',
        defaultParams: ACC2PropertyParams,
        getParams: () => ACC2PropertyParams,
        isApplicable: (model: Model) => isApplicable(model),
        obtain: (_ctx: CustomProperty.Context, model: Model) => getData(model),
    });
