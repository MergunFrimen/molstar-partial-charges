import { Bond, StructureElement, StructureProperties, Unit } from 'molstar/lib/mol-model/structure';
import { ColorTheme } from 'molstar/lib/mol-theme/color';
import { ThemeDataContext } from 'molstar/lib/mol-theme/theme';
import { Color } from 'molstar/lib/mol-util/color';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { Location } from 'molstar/lib/mol-model/location';
import { SbNcbrPartialChargesPropertyProvider, isApplicable } from './property';
import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';

const Colors = {
    Bond: Color(0xffffff),
    Error: Color(0x00ff00),
    MissingCharge: Color(0xffffff),
};

export const PartialChargesThemeParams = {
    max: PD.Numeric(0, { min: 0 }),
    typeId: PD.Numeric(-1, undefined, { isHidden: true }),
    absolute: PD.Boolean(false, { isHidden: false }),
    showResidueCharge: PD.Boolean(true, { isHidden: false }),
};
export type PartialChargesThemeParams = typeof PartialChargesThemeParams;

export function getPartialChargesThemeParams() {
    return PD.clone(PartialChargesThemeParams);
}

function getColor(charge: number, maxAbsoluteCharge: number): Color {
    const colors = {
        negative: Color(0xff0000),
        zero: Color(0xffffff),
        positive: Color(0x0000ff),
    };

    if (charge === 0) return colors.zero;
    if (charge <= -maxAbsoluteCharge) return colors.negative;
    if (charge >= maxAbsoluteCharge) return colors.positive;

    const t = maxAbsoluteCharge !== 0 ? Math.abs(charge) / maxAbsoluteCharge : 1;
    const endColor = charge < 0 ? colors.negative : colors.positive;

    return Color.interpolate(colors.zero, endColor, t);
}

export function PartialChargesColorTheme(
    ctx: ThemeDataContext,
    props: PD.Values<PartialChargesThemeParams>
): ColorTheme<PartialChargesThemeParams> {
    const model = ctx.structure?.models[0];
    if (!model) throw new Error('No model found');
    const data = SbNcbrPartialChargesPropertyProvider.get(model).value?.data;
    const typeId = SbNcbrPartialChargesPropertyProvider.getParams(model).typeId.defaultValue;

    function color(location: Location): Color {
        if (!data) return Colors.Error;

        const { typeIdToAtomIdToCharge, typeIdToResidueToCharge, maxAbsoluteCharges } = data;
        const { absolute, showResidueCharge } = props;

        let id = -1;
        if (StructureElement.Location.is(location)) {
            if (Unit.isAtomic(location.unit)) {
                id = StructureProperties.atom.id(location);
            }
        } else if (Bond.isLocation(location)) {
            if (Unit.isAtomic(location.aUnit)) {
                const l = StructureElement.Location.create(ctx.structure?.root);
                l.unit = location.aUnit;
                l.element = location.aUnit.elements[location.aIndex];
                id = StructureProperties.atom.id(l);
            }
        }

        const maxCharge = absolute ? props.max : maxAbsoluteCharges.get(typeId) || 0;
        const charge = showResidueCharge
            ? typeIdToResidueToCharge.get(typeId)?.get(id)
            : typeIdToAtomIdToCharge.get(typeId)?.get(id);

        if (charge === undefined) return Colors.MissingCharge;

        return getColor(charge, maxCharge);
    }

    return {
        factory: PartialChargesColorTheme,
        granularity: 'group',
        color,
        props,
        description: 'Assign colors to atoms and residues based on their partial charge.',
    };
}

export const SbNcbrPartialChargesColorThemeProvider: ColorTheme.Provider<
    PartialChargesThemeParams,
    'sb-ncbr-partial-charges'
> = {
    label: 'SB NCBR Partial Charges',
    name: 'sb-ncbr-partial-charges',
    category: ColorTheme.Category.Atom,
    factory: PartialChargesColorTheme,
    getParams: getPartialChargesThemeParams,
    defaultValues: PD.getDefaultValues(PartialChargesThemeParams),
    isApplicable: (ctx: ThemeDataContext) =>
        !!ctx.structure && ctx.structure.models.some((model) => isApplicable(model)),
    ensureCustomProperties: {
        attach: (ctx: CustomProperty.Context, data: ThemeDataContext) =>
            data.structure
                ? SbNcbrPartialChargesPropertyProvider.attach(ctx, data.structure.models[0], void 0, true)
                : Promise.resolve(),
        detach: (data) => data.structure && SbNcbrPartialChargesPropertyProvider.ref(data.structure.models[0], false),
    },
};
