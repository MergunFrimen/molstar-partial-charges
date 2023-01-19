import { ACC2ColorThemeProvider } from './color';
import { ACC2PropertyProvider } from './property';
import { PluginBehavior } from 'molstar/lib/mol-plugin/behavior';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';

export const ACC2PartialCharges = PluginBehavior.create<{ autoAttach: boolean, showToolTip: boolean }>({
    name: 'acc2-partial-charges-prop',
    category: 'custom-props',
    display: {
        name: 'ACC2 Partial Charges',
        description: 'Partial charges of atoms and residues.',
    },
    ctor: class extends PluginBehavior.Handler<{ autoAttach: boolean, showToolTip: boolean }> {
        private provider = ACC2PropertyProvider;

        register(): void {
            this.ctx.customModelProperties.register(this.provider, this.params.autoAttach);
            this.ctx.representation.structure.themes.colorThemeRegistry.add(ACC2ColorThemeProvider);
        }

        update(p: { autoAttach: boolean, showToolTip: boolean }) {
            const updated = this.params.autoAttach !== p.autoAttach;
            this.params.autoAttach = p.autoAttach;
            this.params.showToolTip = p.showToolTip;
            this.ctx.customModelProperties.setDefaultAutoAttach(this.provider.descriptor.name, this.params.autoAttach);
            return updated;
        }

        unregister() {
            this.ctx.customModelProperties.unregister(ACC2PropertyProvider.descriptor.name);
            this.ctx.representation.structure.themes.colorThemeRegistry.remove(ACC2ColorThemeProvider);
        }
    },
    params: () => ({
        autoAttach: PD.Boolean(true),
        showToolTip: PD.Boolean(true)
    })
});
