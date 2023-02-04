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
    typeIdToAtomIdToCharge: Map<TypeId, IdToCharge>;
    typeIdToResidueToCharge: Map<TypeId, IdToCharge>;
    maxAbsoluteCharges: IdToCharge;
    maxAbsoluteAtomCharges: IdToCharge;
    maxAbsoluteResidueCharges: IdToCharge;
};
type PartialCharges = PropertyWrapper<ChargesData | undefined>;

const ACC2PropertyParams = {
    typeId: PD.Numeric(1),
};
type ACC2PropertyParams = typeof ACC2PropertyParams;

async function getData(model: Model): Promise<CustomProperty.Data<PartialCharges>> {
    const info = PropertyWrapper.createInfo();

    if (!isApplicable(model)) return { value: { info, data: undefined } };

    const atomIdToCharge = getAtomIdToCharge(model);
    const residueToCharge = getResidueToCharges(model, atomIdToCharge);
    const maxAbsoluteAtomCharges = getMaxAbsoluteCharges(atomIdToCharge);
    const maxAbsoluteResidueCharges = getMaxAbsoluteCharges(residueToCharge);
    const maxAbsoluteCharges = getMaxAbsoluteChargesAll(maxAbsoluteAtomCharges, maxAbsoluteResidueCharges);

    return {
        value: {
            info,
            data: {
                typeIdToAtomIdToCharge: atomIdToCharge,
                typeIdToResidueToCharge: residueToCharge,
                maxAbsoluteAtomCharges,
                maxAbsoluteResidueCharges,
                maxAbsoluteCharges,
            },
        },
    };
}

function getAtomIdToCharge(model: Model): ChargesData['typeIdToAtomIdToCharge'] {
    const atomIdToCharge: ChargesData['typeIdToAtomIdToCharge'] = new Map();

    const sourceData = model.sourceData as MmcifFormat;
    const rowCount = sourceData.data.frame.categories.partial_atomic_charges.rowCount;
    const typeIds = sourceData.data.frame.categories.partial_atomic_charges.getField('type_id')?.toIntArray();
    const atomIds = sourceData.data.frame.categories.partial_atomic_charges.getField('atom_id')?.toIntArray();
    const charges = sourceData.data.frame.categories.partial_atomic_charges.getField('charge')?.toFloatArray();

    // TODO: remove
    // if (!typeIds || !atomIds || !charges) throw new Error('Invalid data');
    if (!typeIds || !atomIds || !charges) return atomIdToCharge;

    for (let i = 0; i < rowCount; ++i) {
        const typeId = typeIds[i];
        const atomId = atomIds[i];
        const charge = charges[i];
        if (!atomIdToCharge.has(typeId)) atomIdToCharge.set(typeId, new Map());
        atomIdToCharge.get(typeId)?.set(atomId, charge);
    }

    // TODO: don't know if this is necessary
    // ACC2PropertyParams.typeId.defaultValue = Math.min(...typeIds);

    return atomIdToCharge;
}

function getResidueToCharges(model: Model, typeIdToAtomIdToCharge: ChargesData['typeIdToAtomIdToCharge']) {
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
                residueToCharge.get(typeId)?.set(atomId, charge);
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
        const charges = idToCharge.values() || [];
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
