import React from 'react';
import { CollapsableControls, CollapsableState } from 'molstar/lib/mol-plugin-ui/base';
import { ExtensionSvg } from 'molstar/lib/mol-plugin-ui/controls/icons';

export class SbNcbrPartialChargesUI extends CollapsableControls {
    protected defaultState(): CollapsableState {
        return {
            header: 'SB NCBR Partial Charges',
            isCollapsed: false,
            brand: { accent: 'purple', svg: ExtensionSvg },
        };
    }
    protected renderControls(): JSX.Element | null {
        return <></>;
    }
}
