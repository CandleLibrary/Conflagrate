import { traverse } from "../build/library/conflagrate.js";
import { createMappedTestTree } from "./tools.js";


let a = 0;
const b = { num: 0 };
const r = createMappedTestTree(5, b, ["A", "B", "C"], [5, 2, 4, 8], 20);
traverse(r, "children").run(n => void a++);
assert("All Nodes Traversed", name(`${a} Nodes Traversed `), a === b.num);
