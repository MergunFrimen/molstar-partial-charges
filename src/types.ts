import { StructureRepresentationRegistry } from 'molstar/lib/mol-repr/structure/registry';
import { ColorTheme } from 'molstar/lib/mol-theme/color';

export namespace RepresentationStyle {
    export type Color = ColorTheme.BuiltIn | 'acc2-partial-charges' | 'default';
    export type ColorParams = ColorTheme.BuiltInParams<ColorTheme.BuiltIn>;
    export type Type = StructureRepresentationRegistry.BuiltIn | 'default';
}
