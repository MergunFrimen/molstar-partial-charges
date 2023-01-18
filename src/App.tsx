import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { useEffect } from "react";
import { ACC2Wrapper } from "./acc2";

declare global {
  interface Window {
    molstar?: ACC2Wrapper;
  }
}

function MolstarWrapperContainer() {
  useEffect(() => {
    async function init() {
      window.molstar = new ACC2Wrapper();
      await window.molstar.init('app');
    }
    init();
  }, []);
  return (
  <div style={{ width: 640, height: 480, position: 'absolute'}}></div>
  );
}

export default function App() {
  return (
    <div id='app'>
      <MolstarWrapperContainer />
    </div>
  );
}