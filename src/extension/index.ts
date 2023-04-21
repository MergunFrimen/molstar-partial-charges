import { LociLabelProvider } from 'molstar/lib/mol-plugin-state/manager/loci-label';
import { PluginBehavior } from 'molstar/lib/mol-plugin/behavior';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { SbNcbrPartialChargesColorThemeProvider } from './color';
import { SbNcbrPartialChargesPropertyProvider } from './property';
import { SbNcbrPartialChargesLociLabelProvider } from './labels';
import { SbNcbrPartialChargesUI } from './ui';

const SbNcbrPartialCharges = PluginBehavior.create<{ autoAttach: boolean; showToolTip: boolean }>({
    name: 'sb-ncbr-partial-charges',
    category: 'misc',
    display: {
        name: 'SB NCBR Partial Charges',
    },
    ctor: class extends PluginBehavior.Handler<{ autoAttach: boolean; showToolTip: boolean }> {
        private SbNcbrPartialChargesLociLabelProvider: LociLabelProvider = SbNcbrPartialChargesLociLabelProvider(
            this.ctx
        );

        register(): void {
            this.ctx.customModelProperties.register(SbNcbrPartialChargesPropertyProvider, this.params.autoAttach);
            this.ctx.representation.structure.themes.colorThemeRegistry.add(SbNcbrPartialChargesColorThemeProvider);
            this.ctx.managers.lociLabels.addProvider(this.SbNcbrPartialChargesLociLabelProvider);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
            this.ctx.customStructureControls.set('sb-ncbr-partial-charges-ui', SbNcbrPartialChargesUI as any);
        }

        unregister() {
            this.ctx.customModelProperties.unregister(SbNcbrPartialChargesPropertyProvider.descriptor.name);
            this.ctx.representation.structure.themes.colorThemeRegistry.remove(SbNcbrPartialChargesColorThemeProvider);
            this.ctx.managers.lociLabels.removeProvider(this.SbNcbrPartialChargesLociLabelProvider);
            this.ctx.customStructureControls.delete('sb-ncbr-partial-charges-ui');
        }
    },
    params: () => ({
        autoAttach: PD.Boolean(true),
        showToolTip: PD.Boolean(true),
    }),
});

export default SbNcbrPartialCharges;
