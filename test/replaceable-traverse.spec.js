

import {
    bidirectionalTraverse,
    traverse,
    breadthTraverse
} from "../build/library/conflagrate.js";


assert_group("Standard traverse with replace and extract", sequence, () => {
    const tree = {
        n: "A",
        ch: [
            { n: "B", ch: [{ n: "C" }] },
            { n: "D", ch: [{ n: "E" }] }, { n: "Z" }
        ]
    };

    const d = { ast: null };

    keep: for (const { node, meta } of traverse(tree, "ch").makeReplaceable().extract(d)) {
        if (node.n == "C") {
            meta.replace({ n: "R" });
        } else if (node.n == "D") {
            meta.replace([{ n: "R1" }, { n: "R2" }]);
        }
    }

    assert(d == {
        ast: {
            n: 'A',
            ch: [
                { n: 'B', ch: [{ n: 'R' }] },
                { n: 'R1' },
                { n: 'R2' },
                { n: 'Z' }
            ]
        }
    });
});

assert_group("Standard traverse with replacement of root and extract", sequence, () => {
    const tree = {
        n: "A",
        ch: [
            { n: "B", ch: [{ n: "C" }] },
            { n: "D", ch: [{ n: "E" }] }
        ]
    };

    const d = { ast: null };

    keep: for (const { node, meta } of traverse(tree, "ch").makeReplaceable().extract(d)) {
        if (node.n == "A") {
            meta.replace({ n: "R", ch: [{ n: "D" }] });
        } else if (node.n == "D") {
            meta.replace([{ n: "R1" }, { n: "R2" }]);
        }
    }

    assert(d.ast == { n: 'R', ch: [{ n: 'R1' }, { n: 'R2' }] });
});


assert_group("Bi-direction traverse with replace and extract", sequence, () => {
    const tree = {
        n: "A",
        ch: [
            { n: "B", ch: [{ n: "C" }] },
            { n: "D", ch: [{ n: "E" }] }
        ]
    };

    const d = { ast: null };

    keep: for (const { node, meta } of bidirectionalTraverse(tree, "ch").makeReplaceable().extract(d)) {
        if (node.n == "C") {
            meta.replace({ n: "R" });
        } else if (node.n == "D") {
            meta.replace([{ n: "R1" }, { n: "R2" }]);
        }
    }

    assert(d.ast == {
        n: "A",
        ch: [
            { n: "B", ch: [{ n: "R" }] },
            { n: "R1" }, { n: "R2" }
        ]
    });
});

assert_group("Bi-direction traverse with replacement of root and extract", sequence, () => {
    const tree = {
        n: "A",
        ch: [
            { n: "B", ch: [{ n: "C" }] },
            { n: "D", ch: [{ n: "E" }] }
        ]
    };

    const d = { ast: null };

    keep: for (const { node, meta } of bidirectionalTraverse(tree, "ch").makeReplaceable().extract(d)) {
        if (node.n == "A") {
            meta.replace({ n: "R", ch: [{ n: "D" }] });
        } else if (node.n == "D") {
            meta.replace([{ n: "R1" }, { n: "R2" }]);
        }
    }

    assert(d.ast == { n: 'R', ch: [{ n: 'R1' }, { n: 'R2' }] });
});
