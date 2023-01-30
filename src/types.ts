import { ShapeRepresentation3D } from 'molstar/lib/mol-plugin-state/transforms/representation';
import { Representation } from 'molstar/lib/mol-repr/representation';
import { StructureRepresentationRegistry } from 'molstar/lib/mol-repr/structure/registry';
import { ColorTheme } from 'molstar/lib/mol-theme/color';
import { SizeTheme } from 'molstar/lib/mol-theme/size';

export type Representation3D = {
    colorTheme: Representation3D.Color,
    type: Representation3D.Type,
    sizeTheme: Representation3D.Size,
};

export namespace Representation3D {
    export type Type = {
        name: StructureRepresentationRegistry.BuiltIn | 'default',
        params: StructureRepresentationRegistry.BuiltInParams<StructureRepresentationRegistry.BuiltIn>,
    };
    export type Color = {
        name: ColorTheme.BuiltIn | 'acc2-partial-charges' | 'default',
        params: ColorTheme.BuiltInParams<ColorTheme.BuiltIn>,
    };
    export type Size = {
        name: SizeTheme.BuiltIn
        params: SizeTheme.BuiltInParams<SizeTheme.BuiltIn>,
    };
}