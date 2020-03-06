import { Yielder } from "./yielder.js";
import { getChildContainerLength, getChildContainer } from "./child_container_functions.js";
import { TraversedNode } from "./types/traversed_node.js";
import { ASTIterator } from "./types/node_iterator.js";

/**
 * This traverses a tree and yields node descending and ascending, depth first. Non-leaf nodes will be yielded 
 * twice. Yielders can be used to perform non-destructive edits on the AST.
 * @param node - The root node of the AST tree.
 * @param children_key - The property of a node that contains its immediate descendants
 * @param max_depth - The maximum level of the tree to return nodes from, starting at level 1 for the root node.
 */
export function double_back_traverse<T, K extends keyof T>(node: T, children_key: K, max_depth: number = Infinity) {

    let yielder: Yielder<TraversedNode<T>, K> = null;

    max_depth = Math.max(0, Math.min(100000, max_depth - 1));

    const AstTraverser: ASTIterator<TraversedNode<T>, K> = {
        [Symbol.iterator]: () => {
            let
                stack_pointer = 0,
                BEGINNING = true;
            console.log("STATE", node);

            const
                node_stack: T[] = [node],
                val_length_stack = [getChildContainerLength(node, children_key) << 16, 0];

            return {

                next() {

                    if (BEGINNING) {

                        BEGINNING = false;

                        if (!yielder) yielder = new Yielder<TraversedNode<T>, K>();
                    }

                    // Prevent infinite loop from a non-acyclic graph;
                    if (stack_pointer > 100000)
                        throw new RangeError("Max node tree depth reached. The tree may be a cyclical graph.");

                    while (stack_pointer >= 0) {

                        let node = node_stack[stack_pointer];

                        const
                            len = val_length_stack[stack_pointer],
                            limit = (len >> 16),
                            index = len & 0xFFFF;

                        let y = null;

                        const child_len = val_length_stack[stack_pointer + 1];
                        let child_limit = (child_len >> 16);
                        let child_index = child_len & 0xFFFF;

                        //if children have not been initialized do so know
                        if (child_limit == 0) {
                            child_limit = getChildContainerLength(node, children_key);
                            val_length_stack[stack_pointer + 1] = (child_limit << 16);
                        }

                        if (node)
                            y = yielder.yield(node, stack_pointer, node_stack, val_length_stack);

                        //if node has children yield the first child
                        if (child_limit > 0 && child_index < child_limit) {
                            node_stack[stack_pointer + 1] = getChildContainer(node, children_key)[child_index];
                            stack_pointer++;
                        }

                        //if node has a sibling yield that next
                        else if (index < limit && stack_pointer > 0) {

                            const parent = node_stack[stack_pointer - 1];

                            //Reset children stack for sibling
                            val_length_stack[stack_pointer + 1] = 0;

                            const index = (++val_length_stack[stack_pointer]) & 0xFFFF;

                            node_stack[stack_pointer] = getChildContainer(parent, children_key)[index];

                        }
                        // Return to parent
                        else {
                            //Reset children stack
                            val_length_stack[stack_pointer + 1] = 0;

                            stack_pointer--;
                        }

                        if (y) return { value: y, done: false };
                    }

                    yielder.complete(node_stack[0], stack_pointer, node_stack, val_length_stack);

                    return { value: null, done: true };
                }
            };
        },

        then: function (next_yielder: Yielder<TraversedNode<T>, K>) {

            if (typeof next_yielder == "function")
                //@ts-ignore
                next_yielder = next_yielder();

            if (!yielder)
                yielder = next_yielder;
            else
                yielder.then(next_yielder, children_key);

            next_yielder.key = children_key;

            return AstTraverser;
        },

        run() {
            for (const node of this);
        }
    };

    return AstTraverser;
}

