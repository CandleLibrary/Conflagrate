import { skribble_mappings } from "../../hydrocarbon/build/library/skribble/mappings.js";
import { sk } from "../../hydrocarbon/build/library/skribble/skribble.js";
import { constructRenderers, render } from "../build/library/render/render_experimental.js";

//const renderers = constructRenderers(skribble_mappings);
//const node = (sk`fn tickle:u32(){loop (true) 2 + 3}`);
//console.log({ node });
//assert(render(node, skribble_mappings, renderers) == "");

const node2 = (sk`fn tickle:u32(){loop (true) return : loop () 2; 0}`);

//assert(node2 == "");