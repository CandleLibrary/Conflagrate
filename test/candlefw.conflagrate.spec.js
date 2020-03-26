

import {
    createSourceMapJSON,
    decodeJSONSourceMap,
    getSourceLineColumn,
    createSourceMap,
    createSourceMapEntry,
    getPositionLexerFromJSONSourceMap,
    skip_root,
    double_back_traverse,
    extract,
    filter,
    make_replaceable,
    make_skippable,
    replace,
    add_parent,
    bit_filter,
    traverse,
} from "../build/library/conflagrate.js";

const r = Math.random, rn = Math.round;

function createTestTree(max_children = 3, node_count = { num: 0 }, types = [], bit_types = [], max_depth = 3) {

    const
        children_count = max_depth > 0 ? Math.max(rn(r() * max_children - 1), 1) : 0,
        types_index = Math.max(rn((r() * types.length) - 1), 0),
        bit_types_index = Math.max(rn((r() * bit_types.length) - 1), 0);

    node_count.num++;

    return {

        bit_type: bit_types[bit_types_index],

        type: types[types_index],

        children: Array(children_count).fill(
            null
        ).map(() => createTestTree(
            max_children,
            node_count,
            types,
            bit_types,
            max_depth - 1
        ))
    };
}

"@candlefw/conflagrate test spec";
{
    const random = (Math.random() * 100) | 0;


    "Test Traversal"; "#";
    let a = 0;

    const b = { num: 0 };

    const r = createTestTree(5, b, ["A", "B", "C"], [5, 2, 4, 8], 20);

    SEQUENCE: {
        for (const { node } of traverse(r, "children")) { a++; }
        "All Nodes Traversed";
        ((a === b.num));
    }

    for (const { node } of traverse(r, "children").filter("type", "B", "C")) {
        "Filtering";
        ((node.type !== "A"));
    }
}