import { Yielder } from "./yielder.js";
import { getChildContainerLength, getChildContainer } from "./child_container_functions.js";
import { TraversedNode } from "./types/traversed_node.js";
import { ASTIterator } from "./types/node_iterator.js";

/**
 * This traverses a tree and yields nodes depth first. Uses Yielders 
 * to perform non-destructive transforms on the AST.
 * @param node - The root node of the AST tree.
 * @param children_key - The property of a node that contains its immediate descendants.
 * @param max_depth - The maximum level of the tree to return nodes from, starting at 1 level for the root node.
 */
export function traverse<T, K extends keyof T>(node: T, children_key: K, max_depth: number = Infinity) {

    let yielder: Yielder<TraversedNode<T>, K> = null;

    max_depth = Math.max(0, Math.min(100000, max_depth - 1));

    const AstTraverser: ASTIterator<TraversedNode<T>, K> = {
        [Symbol.iterator]: () => {
            let
                stack_pointer = 0,
                BEGINNING = true;

            const
                node_stack = [node],
                val_length_stack = [getChildContainerLength(node, children_key) << 16];

            return {

                next() {

                    // Prevent infinite loop from a non-acyclic graph;
                    if (stack_pointer > 100000)
                        throw new RangeError("Max node tree depth reached. The tree may be a cyclical graph.");

                    if (BEGINNING) {

                        BEGINNING = false;

                        if (!yielder) yielder = new Yielder<TraversedNode<T>, K>();

                        if (node) {

                            const y = yielder.yield(node, stack_pointer, node_stack, val_length_stack);

                            if (y) return { value: y, done: false };
                        } else {
                            return { value: null, done: true };
                        }
                    }

                    while (stack_pointer >= 0) {

                        const
                            len = val_length_stack[stack_pointer],
                            limit = (len & 0xFFFF0000) >> 16,
                            index = len & 0xFFFF;

                        if (stack_pointer < max_depth && index < limit) {

                            const

                                children: T[] = getChildContainer(node_stack[stack_pointer], children_key),

                                child = children[index];

                            val_length_stack[stack_pointer]++;

                            stack_pointer++;

                            node_stack[stack_pointer] = child;

                            val_length_stack[stack_pointer] = getChildContainerLength(child, children_key) << 16;

                            if (child) {
                                const y = yielder.yield(child, stack_pointer, node_stack, val_length_stack);

                                if (y) return { value: y, done: false };
                            }

                        } else
                            stack_pointer--;

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

