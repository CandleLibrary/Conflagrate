import { Yielder } from "./yielder.js";

import { getChildContainerLength, getChildContainer } from "./child_container_functions.js";

type ASTIterator<T, K extends keyof T> = Iterable<T> & {

    /**
     * Adds a Yielder to the end of the yield chain.
     *
     * @param next_yielder A Node Yielder
     */
    then: (arg0: Yielder<T, K>) => ASTIterator<T, K>;
};

/**
 * This template function will traverse a generic AST of type {T} and return nodes depth first. It uses Yielders 
 * to perform non-destructive transforms on the AST.
 * @param node - The root node of the AST tree.
 * @param children_key - The property of the node that contains its immediate descendants
 * @param max_depth - The maximum level of the tree to return nodes from, starting level at 1 for the root node. 
 */
export function traverse<T, K extends keyof T>(node: T, children_key: K, max_depth: number = Infinity) {

    let yielder: Yielder<T, K> = null;


    max_depth = Math.max(0, Math.min(100000, max_depth - 1));

    const AstTraverser: ASTIterator<T, K> = {
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

                        if (!yielder) yielder = new Yielder<T, K>();

                        const y = yielder.yield(node, stack_pointer, node_stack, val_length_stack);

                        if (y) return { value: y, done: false };
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

                            const y = yielder.yield(child, stack_pointer, node_stack, val_length_stack);

                            if (y) return { value: y, done: false };

                        } else
                            stack_pointer--;

                    }

                    yielder.complete(node_stack[0], stack_pointer, node_stack, val_length_stack);

                    return { value: null, done: true };
                }
            };
        },

        then: function (next_yielder: Yielder<T, K>) {

            if (typeof next_yielder == "function")
                //@ts-ignore
                next_yielder = next_yielder();

            if (!yielder)
                yielder = next_yielder;
            else
                yielder.then(next_yielder, children_key);

            return AstTraverser;
        },
    };

    return AstTraverser;
}

