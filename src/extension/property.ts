import { Model } from 'molstar/lib/commonjs/mol-model/structure';
import { CustomProperty } from 'molstar/lib/commonjs/mol-model-props/common/custom-property';
import { ParamDefinition as PD } from 'molstar/lib/commonjs/mol-util/param-definition';
import { MmcifFormat } from 'molstar/lib/commonjs/mol-model-formats/structure/mmcif';
import { CustomPropertyDescriptor } from 'molstar/lib/commonjs/mol-model/custom-property';
import { CustomModelProperty } from 'molstar/lib/commonjs/mol-model-props/common/custom-model-property';
import { arrayMinMax } from 'molstar/lib/commonjs/mol-util/array';

type TypeId = number;
type IdToCharge = Map<number, number>;
export interface SBNcbrPartialChargeData {
    typeIdToMethod: Map<TypeId, string>;
    typeIdToAtomIdToCharge: Map<TypeId, IdToCharge>;
    typeIdToResidueToCharge: Map<TypeId, IdToCharge>;
    maxAbsoluteAtomCharges: IdToCharge;
    maxAbsoluteResidueCharges: IdToCharge;
    maxAbsoluteAtomChargeAll: number;
}

const PartialChargesPropertyParams = {
    typeId: PD.Select<number>(0, [[0, '0']]),
};
type PartialChargesPropertyParams = typeof PartialChargesPropertyParams;
const defaultPartialChargesPropertyParams = PD.clone(PartialChargesPropertyParams);

function getParams(model: Model) {
    const typeIdToMethod = getTypeIdToMethod(model);
    const options = Array.from(typeIdToMethod.entries()).map(
        ([typeId, method]) => [typeId, method] as [number, string]
    );
    return {
        typeId: PD.Select<number>(1, options),
    };
}

// eslint-disable-next-line @typescript-eslint/require-await
async function getData(model: Model): Promise<CustomProperty.Data<SBNcbrPartialChargeData | undefined>> {
    if (!SbNcbrPartialChargesPropertyProvider.isApplicable(model)) return { value: undefined };

    const typeIdToMethod = getTypeIdToMethod(model);
    const typeIdToAtomIdToCharge = getTypeIdToAtomIdToCharge(model);
    const typeIdToResidueToCharge = getTypeIdToResidueIdToCharge(model, typeIdToAtomIdToCharge);
    const maxAbsoluteAtomCharges = getMaxAbsoluteCharges(typeIdToAtomIdToCharge);
    const maxAbsoluteResidueCharges = getMaxAbsoluteCharges(typeIdToResidueToCharge);
    const maxAbsoluteAtomChargeAll = getMaxAbsoluteAtomChargeAll(maxAbsoluteAtomCharges, maxAbsoluteResidueCharges);

    return {
        value: {
            typeIdToMethod,
            typeIdToAtomIdToCharge,
            typeIdToResidueToCharge,
            maxAbsoluteAtomCharges,
            maxAbsoluteResidueCharges,
            maxAbsoluteAtomChargeAll,
        },
    };
}

function getTypeIdToMethod(model: Model) {
    const typeIdToMethod: SBNcbrPartialChargeData['typeIdToMethod'] = new Map();

    const sourceData = model.sourceData as MmcifFormat;
    const rowCount = sourceData.data.frame.categories.sb_ncbr_partial_atomic_charges_meta.rowCount;
    const typeIds = sourceData.data.frame.categories.sb_ncbr_partial_atomic_charges_meta.getField('id');
    const methods = sourceData.data.frame.categories.sb_ncbr_partial_atomic_charges_meta.getField('method');

    if (!typeIds || !methods) {
        return typeIdToMethod;
    }

    for (let i = 0; i < rowCount; ++i) {
        const typeId = typeIds.int(i);
        const method = methods.str(i);
        typeIdToMethod.set(typeId, method);
    }

    return typeIdToMethod;
}

function getTypeIdToAtomIdToCharge(model: Model): SBNcbrPartialChargeData['typeIdToAtomIdToCharge'] {
    const atomIdToCharge: SBNcbrPartialChargeData['typeIdToAtomIdToCharge'] = new Map();

    const sourceData = model.sourceData as MmcifFormat;
    const rowCount = sourceData.data.frame.categories.sb_ncbr_partial_atomic_charges.rowCount;
    const typeIds = sourceData.data.frame.categories.sb_ncbr_partial_atomic_charges.getField('type_id');
    const atomIds = sourceData.data.frame.categories.sb_ncbr_partial_atomic_charges.getField('atom_id');
    const charges = sourceData.data.frame.categories.sb_ncbr_partial_atomic_charges.getField('charge');

    if (!typeIds || !atomIds || !charges) return atomIdToCharge;

    for (let i = 0; i < rowCount; ++i) {
        const typeId = typeIds.int(i);
        const atomId = atomIds.int(i);
        const charge = charges.float(i);
        if (!atomIdToCharge.has(typeId)) atomIdToCharge.set(typeId, new Map());
        atomIdToCharge.get(typeId)?.set(atomId, charge);
    }

    return atomIdToCharge;
}

function getTypeIdToResidueIdToCharge(
    model: Model,
    typeIdToAtomIdToCharge: SBNcbrPartialChargeData['typeIdToAtomIdToCharge']
) {
    const { offsets, count } = model.atomicHierarchy.residueAtomSegments;
    const { atomId: atomIds } = model.atomicConformation;

    const residueToCharge: SBNcbrPartialChargeData['typeIdToResidueToCharge'] = new Map();

    typeIdToAtomIdToCharge.forEach((atomIdToCharge, typeId: number) => {
        if (!residueToCharge.has(typeId)) residueToCharge.set(typeId, new Map());
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const residueCharges = residueToCharge.get(typeId)!;
        for (let rI = 0; rI < count; rI++) {
            let charge = 0;
            for (let aI = offsets[rI], _aI = offsets[rI + 1]; aI < _aI; aI++) {
                const atom_id = atomIds.value(aI);
                charge += atomIdToCharge.get(atom_id) || 0;
            }
            for (let aI = offsets[rI], _aI = offsets[rI + 1]; aI < _aI; aI++) {
                const atom_id = atomIds.value(aI);
                residueCharges.set(atom_id, charge);
            }
        }
    });

    return residueToCharge;
}

function getMaxAbsoluteCharges(
    typeIdToCharge: SBNcbrPartialChargeData['typeIdToAtomIdToCharge']
): SBNcbrPartialChargeData['maxAbsoluteAtomCharges'];
function getMaxAbsoluteCharges(
    typeIdToCharge: SBNcbrPartialChargeData['typeIdToResidueToCharge']
): SBNcbrPartialChargeData['maxAbsoluteResidueCharges'] {
    const maxAbsoluteCharges: Map<number, number> = new Map();

    typeIdToCharge.forEach((idToCharge, typeId) => {
        const charges = Array.from(idToCharge.values());
        const [min, max] = arrayMinMax(charges);
        const bound = Math.max(Math.abs(min), max);
        maxAbsoluteCharges.set(typeId, bound);
    });

    return maxAbsoluteCharges;
}

function getMaxAbsoluteAtomChargeAll(
    maxAbsoluteAtomCharges: SBNcbrPartialChargeData['maxAbsoluteAtomCharges'],
    maxAbsoluteResidueCharges: SBNcbrPartialChargeData['maxAbsoluteResidueCharges']
): number {
    let maxAbsoluteCharge = 0;

    maxAbsoluteAtomCharges.forEach((_, typeId) => {
        const maxCharge = maxAbsoluteAtomCharges.get(typeId) || 0;
        if (maxCharge > maxAbsoluteCharge) maxAbsoluteCharge = maxCharge;
    });
    maxAbsoluteResidueCharges.forEach((_, typeId) => {
        const maxCharge = maxAbsoluteResidueCharges.get(typeId) || 0;
        if (maxCharge > maxAbsoluteCharge) maxAbsoluteCharge = maxCharge;
    });

    return maxAbsoluteCharge;
}

export function hasPartialChargesCategories(model: Model): boolean {
    if (!model || !MmcifFormat.is(model.sourceData)) return false;
    const names = model.sourceData.data.frame.categoryNames;
    return (
        names.includes('atom_site') &&
        names.includes('sb_ncbr_partial_atomic_charges') &&
        names.includes('sb_ncbr_partial_atomic_charges_meta')
    );
}

export const SbNcbrPartialChargesPropertyProvider: CustomModelProperty.Provider<
    PartialChargesPropertyParams,
    SBNcbrPartialChargeData | undefined
> = CustomModelProperty.createProvider({
    label: 'SB NCBR Partial Charges Property Provider',
    descriptor: CustomPropertyDescriptor({
        name: 'sb-ncbr-property-provider',
    }),
    type: 'static',
    defaultParams: defaultPartialChargesPropertyParams,
    getParams: (data: Model) => getParams(data),
    isApplicable: (model: Model) => hasPartialChargesCategories(model),
    obtain: (_ctx: CustomProperty.Context, model: Model) => getData(model),
});
