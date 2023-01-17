import { useEffect, createRef } from "react";
import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import "molstar/lib/mol-plugin-ui/skin/light.scss";

declare global {
  interface Window {
    molstar?: PluginUIContext;
  }
}


export default function App() {
  const parent = createRef<HTMLDivElement>();
  const plugin = PluginUIContext;

  useEffect(() => {
    async function init() {
        window.molstar = await createPluginUI(parent.current as HTMLDivElement);

        const data = await window.molstar.builders.data.download(
          { url: "https://files.rcsb.org/download/3PTB.pdb" }, /* replace with your URL */
          { state: { isGhost: true } }
        );
        const trajectory =
          await window.molstar.builders.structure.parseTrajectory(data, "pdb");
        await window.molstar.builders.structure.hierarchy.applyPreset(
          trajectory,
          "default"
        );
    }
    init();
    return () => {
      window.molstar?.dispose();
      window.molstar = undefined;
    };
  }, []);

  return <div ref={parent} style={{ width: 640, height: 480 }}/>;
}