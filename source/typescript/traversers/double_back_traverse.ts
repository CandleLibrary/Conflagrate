import { Yielder } from "../yielders/yielder.js";
import { getChildContainerLength, getChildContainer } from "./child_container_functions.js";
import { TraversedNode } from "../types/traversed_node.js";
import { Traverser } from "./Traverser.js";
import { MetaRoot } from "./traverse.js";

class DoubleBackTraverser<T, K extends keyof T, B> extends Traverser<T, K, B> {

    next() {
        const { BEGINNING, node, max_depth, node_stack, val_length_stack, key, yielder, meta } = this;

        if (BEGINNING) {

            this.BEGINNING = false;

            if (!yielder) this.yielder = new Yielder<TraversedNode<T>, K>();
        }

        // Prevent infinite loop from a non-acyclic graph;
        if (this.sp > 100000)
            throw new RangeError("Max node tree depth reached. The tree may be a cyclical graph.");

        while (this.sp >= 0) {

            let node = node_stack[this.sp];

            const
                len = val_length_stack[this.sp],
                limit = (len >> 16),
                index = len & 0xFFFF;

            let y = null;

            const child_len = val_length_stack[this.sp + 1];
            let child_limit = (child_len >> 16);
            let child_index = child_len & 0xFFFF;

            //if children have not been initialized do so know
            if (child_limit == 0) {
                child_limit = getChildContainerLength(node, key);
                val_length_stack[this.sp + 1] = (child_limit << 16);
            }

            if (node)
                //@ts-ignore
                y = yielder.yield(node, this.sp, node_stack, val_length_stack, meta);

            //if node has children yield the first child
            if (child_limit > 0 && child_index < child_limit) {
                node_stack[this.sp + 1] = getChildContainer(node, key)[child_index];
                this.sp++;
            }

            //if node has a sibling yield that next
            else if (index < limit && this.sp > 0) {

                const parent = node_stack[this.sp - 1];

                //Reset children stack for sibling
                val_length_stack[this.sp + 1] = 0;

                const index = (++val_length_stack[this.sp]) & 0xFFFF;

                node_stack[this.sp] = getChildContainer(parent, key)[index];

            }
            // Return to parent
            else {
                //Reset children stack
                val_length_stack[this.sp + 1] = 0;

                this.sp--;
            }

            if (y) return { value: y, done: false };
        }
        //@ts-ignore
        yielder.complete(node_stack[0], this.sp, node_stack, val_length_stack, meta);

        return { value: null, done: true };
    }
}

/**
 * This traverses a tree and yields node descending and ascending, depth first. Non-leaf nodes will be yielded 
 * twice. Yielders can be used to perform non-destructive edits on the AST.
 * @param node - The root node of the AST tree.
 * @param key - The property of a node that contains its immediate descendants
 * @param max_depth - The maximum level of the tree to return nodes from, starting at level 1 for the root node.
 */
export function double_back_traverse<T, K extends keyof T>(node: T, key: K, max_depth: number = Infinity) {

    max_depth = Math.max(0, Math.min(100000, max_depth - 1));

    return new DoubleBackTraverser<T, K, MetaRoot<T, K>>(node, key, { depth: 0, key, index: 0, parent: null, next: null, prev: null }, max_depth);
}

