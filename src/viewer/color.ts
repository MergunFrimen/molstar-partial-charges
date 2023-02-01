import { Bond, StructureElement, StructureProperties } from 'molstar/lib/mol-model/structure';
import { ColorTheme } from 'molstar/lib/mol-theme/color';
import { ThemeDataContext } from 'molstar/lib/mol-theme/theme';
import { Color } from 'molstar/lib/mol-util/color';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { Location } from 'molstar/lib/mol-model/location';
import { ACC2PropertyProvider, isApplicable } from './property';
import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';

const Colors = {
    Bond: Color(0x999999),
    Error: Color(0x00ff00),
    MissingCharge: Color(0xffffff),
};

export const ACC2ColorThemeParams = {
    max: PD.Numeric(0, { min: 0 }),
    typeId: PD.Numeric(-1, undefined, { isHidden: true }),
    absolute: PD.Boolean(false, { isHidden: false }),
    showResidueCharge: PD.Boolean(false, { isHidden: false }),
};
export type ACC2ColorThemeParams = typeof ACC2ColorThemeParams;

export function getACC2ColorThemeParams() {
    return PD.clone(ACC2ColorThemeParams);
}

function getColor(chargeValue: number, maxAbsoluteCharge: number): Color {
    const colors = {
        default: Color(0xffffff),
        min: Color(0xff0000),
        mid: Color(0xffffff),
        max: Color(0x0000ff),
    };
    const chargeRange = {
        min: -maxAbsoluteCharge,
        mid: 0,
        max: maxAbsoluteCharge,
    };

    if (chargeRange.min === chargeRange.max || chargeValue < chargeRange.min || chargeValue > chargeRange.max) {
        return colors.default;
    }

    if (chargeValue < chargeRange.mid) {
        const d = chargeRange.mid - chargeRange.min || 1;
        const t = (chargeValue - chargeRange.min) / d;
        return Color.interpolate(colors.min, colors.mid, t);
    } else {
        const d = chargeRange.max - chargeRange.mid || 1;
        const t = (chargeValue - chargeRange.mid) / d;
        return Color.interpolate(colors.mid, colors.max, t);
    }
}

export function ACC2ColorTheme(
    ctx: ThemeDataContext,
    props: PD.Values<ACC2ColorThemeParams>
): ColorTheme<ACC2ColorThemeParams> {
    const model = ctx.structure?.models[0];
    if (!model) throw new Error('No model found');
    const data = ACC2PropertyProvider.get(model).value?.data;
    const typeId = ACC2PropertyProvider.getParams(model).typeId.defaultValue;
    ACC2ColorThemeParams.typeId.defaultValue = typeId;

    function color(location: Location): Color {
        if (data === undefined) return Colors.Error;
        if (Bond.isLocation(location)) return Colors.Bond;
        if (!StructureElement.Location.is(location)) return Colors.Error;

        const { atomIdToCharge, residueToCharge, maxAbsoluteCharges } = data;
        const { absolute, showResidueCharge: isResidue } = props;

        const maxCharge = absolute ? props.max : maxAbsoluteCharges.get(typeId) || 0;
        // console.log(maxCharge);
        const id = StructureProperties.atom.id(location);
        const charges = isResidue ? residueToCharge.get(typeId) : atomIdToCharge.get(typeId);
        const chargeValue = charges?.get(id);
        if (!charges || chargeValue === undefined) return Colors.MissingCharge;

        return getColor(chargeValue, maxCharge);
    }

    return {
        factory: ACC2ColorTheme,
        granularity: 'group',
        color,
        props,
        description: 'Assign colors to atoms and residues based on partial charges.',
    };
}

export const ACC2ColorThemeProvider: ColorTheme.Provider<ACC2ColorThemeParams, 'acc2-partial-charges'> = {
    label: 'ACC2 Partial Charges',
    name: 'acc2-partial-charges',
    category: ColorTheme.Category.Atom,
    factory: ACC2ColorTheme,
    getParams: getACC2ColorThemeParams,
    defaultValues: PD.getDefaultValues(ACC2ColorThemeParams),
    isApplicable: (ctx: ThemeDataContext) =>
        !!ctx.structure && ctx.structure.models.some((model) => isApplicable(model)),
    ensureCustomProperties: {
        attach: (ctx: CustomProperty.Context, data: ThemeDataContext) =>
            data.structure
                ? ACC2PropertyProvider.attach(ctx, data.structure.models[0], void 0, true)
                : Promise.resolve(),
        detach: (data) => data.structure && ACC2PropertyProvider.ref(data.structure.models[0], false),
    },
};
