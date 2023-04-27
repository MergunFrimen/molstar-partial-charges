import React from 'react';
import { useState } from 'react';
import { CollapsableControls, CollapsableState } from 'molstar/lib/mol-plugin-ui/base';
import { ExtensionSvg } from 'molstar/lib/mol-plugin-ui/controls/icons';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { ParameterControls } from 'molstar/lib/mol-plugin-ui/controls/parameters';
import { useBehavior } from 'molstar/lib/mol-plugin-ui/hooks/use-behavior';
import { SbNcbrPartialChargesPropertyProvider } from './property';
import { ControlRow, TextInput } from 'molstar/lib/mol-plugin-ui/controls/common';

export class SbNcbrPartialChargesUI extends CollapsableControls {
    protected defaultState(): CollapsableState {
        return {
            header: 'SB NCBR Partial Charges',
            isCollapsed: false,
            brand: { accent: 'purple', svg: ExtensionSvg },
        };
    }
    protected renderControls(): JSX.Element | null {
        return (
            <>
                <ChargeSetControls plugin={this.plugin} />
                <AbsoluteControls plugin={this.plugin} />
                <ShowResidueControls plugin={this.plugin} />
                <AbsoluteChargeRangeControls plugin={this.plugin} />
            </>
        );
    }
}

// TODO: update this somehow
const ChargeSets = {
    chargeSet: PD.Select<'1' | '2' | '3' | '4' | '5' | '6'>('1', [
        ['1', 'SQE+qp/Schindler 2021 (CCD_gen)'],
        ['2', 'EEM/Racek 2016 (ccd2016_npa)'],
        ['3', 'QEq/Rappe 1991'],
        ['4', 'EQeq/None'],
        ['5', 'SQE/Schindler 2021 (CCD_gen)'],
        ['6', 'SQE+q0/Schindler 2021 (CCD_gen)'],
    ]),
};

function ChargeSetControls({ plugin }: { plugin: PluginContext }) {
    const [chargeSet, setChargeSet] = useState(PD.getDefaultValues(ChargeSets));
    // useBehavior(plugin.managers.structure.hierarchy.behaviors.selection); // triggers UI update
    const isBusy = useBehavior(plugin.behaviors.state.isBusy);
    const hierarchy = plugin.managers.structure.hierarchy.current;

    // gets the model once the hierarchy is loaded
    if (hierarchy.structures.length !== 0) {
        const model = plugin.managers.structure.hierarchy.current.structures[0].model?.cell?.obj?.data;
        const typeId = SbNcbrPartialChargesPropertyProvider.getParams(model)?.typeId.defaultValue;
        console.log(typeId);
    }

    function onChange(chargeSet: any) {
        setChargeSet(chargeSet);
        console.log(chargeSet);
    }
    return (
        <>
            <ParameterControls params={ChargeSets} values={chargeSet} onChangeValues={onChange} isDisabled={false} />
        </>
    );
}

const ChargeRange = {
    chargeRange: PD.Numeric(1, { min: 0, max: 5, step: 0.1 }),
};

function AbsoluteChargeRangeControls({ plugin }: { plugin: PluginContext }) {
    const [chargeRange, setChargeRange] = useState(PD.getDefaultValues(ChargeRange));

    function onChange(value: any) {
        setChargeRange(value);
        console.log(value);
    }

    return (
        <>
            <ControlRow
                label="Charge range"
                control={
                    <div style={{ display: 'flex', textAlignLast: 'center', left: '80px' }}>
                        <TextInput
                            numeric
                            onChange={onChange}
                            value={chargeRange.chargeRange}
                            delayMs={250}
                            style={{ order: 1, flex: '1 1 auto', minWidth: 0 }}
                            className="msp-form-control"
                            blurOnEnter={true}
                            blurOnEscape={true}
                        />
                    </div>
                }
            />
        </>
    );
}

const Absolute = {
    absolute: PD.Boolean(false),
};

function AbsoluteControls({ plugin }: { plugin: PluginContext }) {
    const [absolute, setAbsolute] = useState(PD.getDefaultValues(Absolute));

    function onChange(a: any) {
        setAbsolute(!absolute);
        console.log(absolute);
    }
    return (
        <>
            <ParameterControls params={Absolute} values={setAbsolute} onChangeValues={onChange} isDisabled={false} />
        </>
    );
}

const ShowResidue = {
    ShowResidue: PD.Boolean(false),
};

function ShowResidueControls({ plugin }: { plugin: PluginContext }) {
    const [showResidue, setShowResidue] = useState(PD.getDefaultValues(ShowResidue));

    function onChange(a: any) {
        setShowResidue(!showResidue);
        console.log(showResidue);
    }
    return (
        <>
            <ParameterControls
                params={ShowResidue}
                values={setShowResidue}
                onChangeValues={onChange}
                isDisabled={false}
            />
        </>
    );
}
