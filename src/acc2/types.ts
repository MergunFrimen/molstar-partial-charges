import { StructureRepresentationRegistry } from 'molstar/lib/mol-repr/structure/registry';
import { ColorTheme } from 'molstar/lib/mol-theme/color';
import { SizeTheme } from 'molstar/lib/mol-theme/size';
import { ACC2ColorThemeParams } from './color';

export interface RepresentationStyle {
    polymer?: RepresentationStyle.Entry,
    nonPolymer?: RepresentationStyle.Entry,
    water?: RepresentationStyle.Entry
}

export namespace RepresentationStyle {
    export type Entry = {
        color?: ColorTheme.BuiltIn | 'acc2-partial-charges',
        colorParams?: ColorTheme.BuiltInParams<ColorTheme.BuiltIn> | ACC2ColorThemeParams,
        type?: StructureRepresentationRegistry.BuiltIn,
        typeParams?: StructureRepresentationRegistry.BuiltInParams<StructureRepresentationRegistry.BuiltIn>,
        size?: SizeTheme.BuiltIn;
        sizeParams?: SizeTheme.BuiltInParams<SizeTheme.BuiltIn>;
    }
}


export enum StateElements {
    Model = 'model',
    Assembly = 'assembly',

    Polymer = 'polymer',
    PolymerVisual = 'polymer-visual',

    NonPolymer = 'non-polymer',
    NonPolymerVisual = 'non-polymer-visual',

    Water = 'water',
    WaterVisual = 'water-visual',
}
