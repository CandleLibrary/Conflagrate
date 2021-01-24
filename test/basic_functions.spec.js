

import {
    traverse,
} from "../build/library/conflagrate.js";

import {
    createTestTree
} from "./tools.js";

assert_group(sequence, () => {
    let a = 0;
    const b = { num: 0 };
    const r = createTestTree(5, b, ["A", "B", "C"], [5, 2, 4, 8], 20);
    traverse(r, "children").run(n => void a++);
    assert("All Nodes Traversed", a === b.num);
});

assert_group(sequence, "FILTERING", () => {
    let a = 0;
    const b = { num: 0 };
    const r = createTestTree(5, b, ["A", "B", "C"], [5, 2, 4, 8], 20);
    const control = traverse(r, "children").run(n => n).some(n => n.type == "A");
    const result = traverse(r, "children")
        .filter("type", "B", "C")
        .run(n => n);

    assert("Sanity Check", control == true);
    assert(result.every(n => n.type !== "A") == true);
});
