/**
 * Test breadth traverse
 * Things to test
 * - Nodes of each depth are yielded before proceeding to the next depth
 * - Leaf nodes are yielded once
 * - With `yield_on_exit_only` set to true, interior nodes are yielded once on the up pass
 * - `traverse_state` meta flags for nodes are accurate.
 * 
 * - these conditions hold tree with a randomly generated tree. 
 */
import { breadthTraverse } from "../build/library/conflagrate.js";

const control_tree = {
    id: "A",
    nodes: [
        {
            id: "B", nodes: [
                {
                    id: "C", nodes: []
                }]
        },
        {
            id: "D", nodes: [
                {
                    id: "E", nodes: []
                },
                {
                    id: "F", nodes:
                        [
                            {
                                id: "G", nodes: [
                                    {
                                        id: "H", nodes: [
                                            {
                                                id: "O", nodes: []
                                            },
                                            {
                                                id: "P", nodes: []
                                            }]
                                    },
                                    {
                                        id: "I", nodes: []
                                    }
                                ]
                            }]
                },
                {
                    id: "I", nodes: [
                        {
                            id: "J", nodes:
                                [
                                    {
                                        id: "M", nodes: [
                                            {
                                                id: "N", nodes: []
                                            }
                                        ]
                                    }
                                ]
                        }
                    ]
                },
                {
                    id: "K", nodes: [
                        {
                            id: "L", nodes: []
                        }
                    ]
                }
            ]
        }]
};

assert("The id of each node is in the correct order", breadthTraverse(control_tree, "nodes").run((node) => node.id).join("") == ["ABDCEFIKGJLHIMOPN"]);
assert("The depth assigned to max_depth argument is not exceeded", breadthTraverse(control_tree, "nodes", 4).run((node) => node.id).join("") == ["ABDCEFIKGJL"]);
assert("Each depth of nodes is in series", breadthTraverse(control_tree, "nodes").run((node, meta) => meta.depth).join("") == ["01122222333444555"]);

