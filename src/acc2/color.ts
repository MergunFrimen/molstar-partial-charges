import { Bond, StructureElement, StructureProperties } from 'molstar/lib/mol-model/structure';
import { ColorTheme } from 'molstar/lib/mol-theme/color';
import { ThemeDataContext } from 'molstar/lib/mol-theme/theme';
import { Color } from 'molstar/lib/mol-util/color';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { Location } from 'molstar/lib/mol-model/location';
import { ACC2Property, ACC2PropertyProvider } from './property';
import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';

const BondColor = Color(0x999999);
const ErrorColor = Color(0x00ff00);

export const ACC2ColorThemeParams = {
    min: PD.Numeric(0),
    max: PD.Numeric(0),
    typeId: PD.Numeric(1, undefined, { isHidden: true }),
    absolute: PD.Boolean(false, { isHidden: false }),
    isResidue: PD.Boolean(false, { isHidden: false }),
};
export type ACC2ColorThemeParams = typeof ACC2ColorThemeParams;

export function getACC2ColorThemeParams(ctx: ThemeDataContext) {
    return PD.clone(ACC2ColorThemeParams);
}

function getColor(value: number, min: number, max: number, absolute: boolean): Color {
    const colors = [Color(0xff0000), Color(0xffffff), Color(0x0000ff)];
    const defaultColor = Color(0xffffff);

    if (!absolute) {
        const bound = Math.max(Math.abs(min), max);
        min = -bound;
        max = bound;
    }
    const [minColor, midColor, maxColor] = colors;
    const mid = (min + max) / 2;

    if (min === max || value < min || max < value) {
        return defaultColor;
    }

    if (value < mid) {
        const d = (mid - min) || 1;
        const t = (value - min) / d;
        return Color.interpolate(minColor, midColor, t);
    } else {
        const d = (max - mid) || 1;
        const t = (value - mid) / d;
        return Color.interpolate(midColor, maxColor, t);
    }
}

export function ACC2ColorTheme(ctx: ThemeDataContext, props: PD.Values<ACC2ColorThemeParams>): ColorTheme<ACC2ColorThemeParams> {
    const model = ctx.structure?.models[0]!;
    const data = ACC2PropertyProvider.get(model).value?.data;
    const typeId = ACC2PropertyProvider.getParams(model).typeId.defaultValue;

    function color(location: Location): Color {
        if (data === undefined) return ErrorColor;
        if (Bond.isLocation(location)) return BondColor;
        if (!StructureElement.Location.is(location)) return ErrorColor;

        const { atomIdToCharge, residueToCharge, chargesMin, chargesMax } = data;
        const { absolute, isResidue } = props;
        const min = absolute ? props.min : chargesMin.get(typeId)!;
        const max = absolute ? props.max : chargesMax.get(typeId)!;
        const id = StructureProperties.atom.id(location);
        const charges = isResidue ? residueToCharge.get(typeId) : atomIdToCharge.get(typeId);
        const charge = charges?.get(id);
        if (!charges || charge === undefined) return ErrorColor;

        return getColor(charge, min, max, absolute);
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
    isApplicable: (ctx: ThemeDataContext) => !!ctx.structure && ctx.structure.models.some(model => ACC2Property.isApplicable(model)),
    ensureCustomProperties: {
        attach: (ctx: CustomProperty.Context, data: ThemeDataContext) => data.structure ? ACC2PropertyProvider.attach(ctx, data.structure.models[0], void 0, true) : Promise.resolve(),
        detach: (data) => data.structure && ACC2PropertyProvider.ref(data.structure.models[0], false)
    }
};
