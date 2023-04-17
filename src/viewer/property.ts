import { Model } from 'molstar/lib/mol-model/structure';
import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';
import { PropertyWrapper } from 'molstar/lib/mol-model-props/common/wrapper';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { MmcifFormat } from 'molstar/lib/mol-model-formats/structure/mmcif';
import { CustomPropertyDescriptor } from 'molstar/lib/mol-model/custom-property';
import { CustomModelProperty } from 'molstar/lib/mol-model-props/common/custom-model-property';

type TypeId = number;
type IdToCharge = Map<number, number>;
type ChargesData = {
    typeIdToMethod: Map<TypeId, string>;
    typeIdToAtomIdToCharge: Map<TypeId, IdToCharge>;
    typeIdToResidueToCharge: Map<TypeId, IdToCharge>;
    maxAbsoluteCharges: IdToCharge;
    maxAbsoluteAtomCharges: IdToCharge;
    maxAbsoluteResidueCharges: IdToCharge;
};
type PartialCharges = PropertyWrapper<ChargesData | undefined>;

const PartialChargesPropertyParams = {
    typeId: PD.Numeric(1),
};
type PartialChargesPropertyParams = typeof PartialChargesPropertyParams;

async function getData(model: Model): Promise<CustomProperty.Data<PartialCharges>> {
    await Promise.resolve();
    const info = PropertyWrapper.createInfo();

    if (!isApplicable(model)) return { value: { info, data: undefined } };

    const typeIdToMethod = getTypeIdToMethod(model);
    const typeIdToAtomIdToCharge = getTypeIdToAtomIdToCharge(model);
    const typeIdToResidueToCharge = getTypeIdToResidueIdToCharge(model, typeIdToAtomIdToCharge);
    const maxAbsoluteAtomCharges = getMaxAbsoluteCharges(typeIdToAtomIdToCharge);
    const maxAbsoluteResidueCharges = getMaxAbsoluteCharges(typeIdToResidueToCharge);
    const maxAbsoluteCharges = getMaxAbsoluteChargesAll(maxAbsoluteAtomCharges, maxAbsoluteResidueCharges);

    return {
        value: {
            info,
            data: {
                typeIdToMethod,
                typeIdToAtomIdToCharge,
                typeIdToResidueToCharge,
                maxAbsoluteAtomCharges,
                maxAbsoluteResidueCharges,
                maxAbsoluteCharges,
            },
        },
    };
}

function getTypeIdToMethod(model: Model) {
    const typeIdToMethod: ChargesData['typeIdToMethod'] = new Map();

    const sourceData = model.sourceData as MmcifFormat;
    const rowCount = sourceData.data.frame.categories.partial_atomic_charges_meta.rowCount;
    const typeIds = sourceData.data.frame.categories.partial_atomic_charges_meta.getField('id')?.toIntArray();
    const methods = sourceData.data.frame.categories.partial_atomic_charges_meta.getField('method')?.toStringArray();

    if (!typeIds || !methods) return typeIdToMethod;

    for (let i = 0; i < rowCount; ++i) {
        const typeId = typeIds[i];
        const method = methods[i];
        typeIdToMethod.set(typeId, method);
    }

    return typeIdToMethod;
}

function getTypeIdToAtomIdToCharge(model: Model): ChargesData['typeIdToAtomIdToCharge'] {
    const atomIdToCharge: ChargesData['typeIdToAtomIdToCharge'] = new Map();

    const sourceData = model.sourceData as MmcifFormat;
    const rowCount = sourceData.data.frame.categories.partial_atomic_charges.rowCount;
    const typeIds = sourceData.data.frame.categories.partial_atomic_charges.getField('type_id')?.toIntArray();
    const atomIds = sourceData.data.frame.categories.partial_atomic_charges.getField('atom_id')?.toIntArray();
    const charges = sourceData.data.frame.categories.partial_atomic_charges.getField('charge')?.toFloatArray();

    if (!typeIds || !atomIds || !charges) return atomIdToCharge;

    for (let i = 0; i < rowCount; ++i) {
        const typeId = typeIds[i];
        const atomId = atomIds[i];
        const charge = charges[i];
        if (!atomIdToCharge.has(typeId)) atomIdToCharge.set(typeId, new Map());
        atomIdToCharge.get(typeId)?.set(atomId, charge);
    }

    return atomIdToCharge;
}

function getTypeIdToResidueIdToCharge(model: Model, typeIdToAtomIdToCharge: ChargesData['typeIdToAtomIdToCharge']) {
    const { offsets } = model.atomicHierarchy.residueAtomSegments;
    const residueToCharge: ChargesData['typeIdToResidueToCharge'] = new Map();

    typeIdToAtomIdToCharge.forEach((atomIdToCharge, typeId: number) => {
        for (let residueId = 1; residueId < offsets.length; ++residueId) {
            let charge = 0;
            for (let atomId = offsets[residueId - 1] + 1; atomId <= offsets[residueId]; ++atomId) {
                charge += atomIdToCharge?.get(atomId) || 0;
            }
            for (let atomId = offsets[residueId - 1] + 1; atomId <= offsets[residueId]; ++atomId) {
                if (!residueToCharge.has(typeId)) residueToCharge.set(typeId, new Map());
                residueToCharge.get(typeId)?.set(atomId, Number(charge.toFixed(4)));
            }
        }
    });

    return residueToCharge;
}

function getMaxAbsoluteCharges(
    typeIdToCharge: ChargesData['typeIdToAtomIdToCharge']
): ChargesData['maxAbsoluteAtomCharges'];
function getMaxAbsoluteCharges(
    typeIdToCharge: ChargesData['typeIdToResidueToCharge']
): ChargesData['maxAbsoluteResidueCharges'] {
    const maxAbsoluteCharges: Map<number, number> = new Map();

    typeIdToCharge.forEach((idToCharge, typeId) => {
        const charges = Array.from(idToCharge.values());
        const min = Math.min(...charges);
        const max = Math.max(...charges);
        const bound = Math.max(Math.abs(min), max);
        maxAbsoluteCharges.set(typeId, bound);
    });

    return maxAbsoluteCharges;
}

function getMaxAbsoluteChargesAll(
    maxAbsoluteAtomCharges: ChargesData['maxAbsoluteAtomCharges'],
    maxAbsoluteResidueCharges: ChargesData['maxAbsoluteResidueCharges']
): ChargesData['maxAbsoluteCharges'] {
    const maxAbsoluteCharges: Map<number, number> = new Map();

    maxAbsoluteAtomCharges.forEach((_, typeId) => {
        const maxAtomCharge = maxAbsoluteAtomCharges.get(typeId) || 0;
        const maxResidueCharge = maxAbsoluteResidueCharges.get(typeId) || 0;
        const maxAll = Math.max(maxAtomCharge, maxResidueCharge);
        maxAbsoluteCharges.set(typeId, maxAll);
    });

    return maxAbsoluteCharges;
}

function hasPartialChargesCategories(model: Model): boolean {
    if (!MmcifFormat.is(model.sourceData)) return false;
    const names = model.sourceData.data.frame.categoryNames;
    return (
        names.includes('atom_site') &&
        names.includes('partial_atomic_charges') &&
        names.includes('partial_atomic_charges_meta')
    );
}

export function isApplicable(model?: Model): boolean {
    return !!model && model.sourceData.kind === 'mmCIF' && hasPartialChargesCategories(model);
}

export const SbNcbrPartialChargesPropertyProvider: CustomModelProperty.Provider<
    PartialChargesPropertyParams,
    PartialCharges
> = CustomModelProperty.createProvider({
    label: 'SB NCBR Partial Charges Property Provider',
    descriptor: CustomPropertyDescriptor({
        name: 'sb-ncbr-property-provider',
    }),
    type: 'static',
    defaultParams: PartialChargesPropertyParams,
    getParams: () => PartialChargesPropertyParams,
    isApplicable: (model: Model) => isApplicable(model),
    obtain: (_ctx: CustomProperty.Context, model: Model) => getData(model),
});
