import { Yielder } from "../yielders/yielder.js";
import { getChildContainerLength, getChildContainer } from "./child_container_functions.js";
import { TraversedNode } from "../types/traversed_node.js";
import { Traverser } from "./core_traverser_class.js";
import { MetaRoot } from "./traverse.js";


class breadthTraverser<T, K extends keyof T, B> extends Traverser<T, K, B> {
    base_line: number;

    max_depth_reached: number;

    constructor(root: T, key: K, meta: B & { traverse_state: number; } & MetaRoot<T, K>, max_depth) {

        super(root, key, meta, max_depth);

        this.base_line = 0;

        this.max_depth_reached = 0;
    }
    next() {
        const { BEGINNING, node, node_stack, val_length_stack, key, yielder, meta, max_depth } = this;

        // Prevent infinite loop from a cyclical graph;
        if (this.sp > 100000)
            throw new (class CyclicalError extends Error {
            })("Max node tree depth reached. The tree may actually be a cyclical graph.");

        if (BEGINNING) {

            this.base_line = 0;

            this.BEGINNING = false;

            if (!this.yielder) this.yielder = new Yielder<TraversedNode<T>, K>();

            if (node) {

                node_stack[this.sp] = node;
                val_length_stack[this.sp] = getChildContainerLength(node, key) << 16;
                this.max_depth_reached = 0;

                //@ts-ignore dd
                const y = this.yielder.yield(node, this.sp, node_stack, val_length_stack, meta);

                meta.parent = null;

                if (y)
                    return { value: { node: y, meta }, done: false };

            } else {

                return { value: null, done: true };
            }
        }

        //Configure baseline

        while (this.sp >= 0 && this.base_line < max_depth + 1) {

            const len = this.val_length_stack[this.sp], limit = (len & 0xFFFF0000) >> 16, index = (len & 0xFFFF);

            if (index < limit) {

                const
                    children: T[] = getChildContainer(node_stack[this.sp], key),
                    child = children[index];

                val_length_stack[this.sp]++;

                this.sp++;

                node_stack[this.sp] = child;

                val_length_stack[this.sp] = getChildContainerLength(child, key) << 16;

                if (this.sp == this.base_line) {

                    this.max_depth_reached = Math.max(this.sp, this.max_depth);
                    this.sp--;

                    if (child) {
                        meta.parent = node_stack[this.sp - 1];
                        meta.prev = children[index - 1];
                        meta.next = children[index + 1];
                        meta.index = index;
                        meta.depth = this.sp + 1;
                        //@ts-ignore
                        const y = this.yielder.yield(child, this.sp, node_stack, val_length_stack, meta);

                        if (y) return { value: { node: y, meta }, done: false };
                    }
                }

            } else if (this.sp == 0) {

                if (this.max_depth < this.base_line)
                    break;

                val_length_stack[this.sp] = getChildContainerLength(node, key) << 16;
                this.max_depth_reached = 0;
                this.base_line++;
            } else {
                this.sp--;
            }
        }

        //@ts-ignore
        yielder.complete(node_stack[0], this.sp, node_stack, val_length_stack, meta);

        return { value: null, done: true };
    }
}

/**
 * This traverses a tree and yields nodes breadth first. 
 * 
 * @param node - The root node of the AST tree.
 * @param key - The property of a node that contains its immediate descendants
 * @param max_depth - The maximum level of the tree to return nodes from, starting at level 1 for the root node.
 */
export function breadthTraverse<T, K extends keyof T>(node: T, key: K, max_depth: number = Infinity) {

    max_depth = Math.max(0, Math.min(100000, max_depth - 1));

    return new breadthTraverser<T, K, MetaRoot<T, K>>(node, key, { depth: 0, key, index: 0, parent: null, next: null, prev: null, traverse_state: 0 }, max_depth);
}

