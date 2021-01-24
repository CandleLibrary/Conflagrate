/**
 * Test double back traversing
 * Things to test
 * - Interior nodes are yielded twice
 * - Leaf nodes are yielded once
 * - With `yield_on_exit_only` set to true, interior nodes are yielded once on the up pass
 * - `traverse_state` meta flags for nodes are accurate.
 * 
 * - these conditions hold tree with a randomly generated tree. 
 */
import { bidirectionalTraverse } from "../build/library/conflagrate.js";

const control_tree = {
    id: "A",
    nodes: [
        {
            id: "B", nodes: [
                { id: "C", nodes: [] }]
        },
        {
            id: "D", nodes: [
                { id: "E", nodes: [] },
                {
                    id: "F", nodes:
                        [{ id: "G", nodes: [{ id: "H", nodes: [] }, { id: "I", nodes: [] }] }]
                }]
        }]
};

assert("`traverse_state` meta flag for nodes is accurate", bidirectionalTraverse(control_tree, "nodes").run((n, meta) => meta.traverse_state).join("") == "00210200221111");
assert("`traverse_state` meta flag for nodes is accurate when [yield_on_exit_only]=true", bidirectionalTraverse(control_tree, "nodes", true).run((n, meta) => meta.traverse_state).join("") == ["212221111"]);
assert("Interior Nodes are yielded twice", bidirectionalTraverse(control_tree, "nodes").run((node) => node.id).join("") == ["ABCBDEFGHIGFDA"]);
assert("Interior Nodes are yielded after leaves when [yield_on_exit_only]=true", bidirectionalTraverse(control_tree, "nodes", true).run((node) => node.id).join("") == ["CBEHIGFDA"]);
assert("Leaf nodes are yielded once", bidirectionalTraverse(control_tree, "nodes").run((node, meta) => meta.traverse_state == 2 ? node.id : null).join("") == ["CEHI"]);
assert("Leaf nodes are yielded once when [yield_on_exit_only]=true", bidirectionalTraverse(control_tree, "nodes", true).run((node, meta) => meta.traverse_state == 2 ? node.id : null).join("") == ["CEHI"]);

