import { Yielder } from "../yielders/yielder.js";
import { getChildContainerLength, getChildContainer } from "./child_container_functions.js";
import { TraversedNode } from "../types/traversed_node.js";
import { Traverser } from "./core_traverser_class.js";
import { MetaRoot } from "./traverse.js";

export enum TraverseState {
    ENTER,
    EXIT,
    LEAF
};

class bidirectionalTraverser<T, K extends keyof T, B> extends Traverser<T, K, B & { traverse_state: TraverseState; }> {

    yield_on_exit_only: boolean;

    constructor(root: T, key: K, meta: B & { traverse_state: number; } & MetaRoot<T, K>, yield_on_exit_only, max_depth) {

        super(root, key, meta, max_depth);

        this.yield_on_exit_only = yield_on_exit_only;
    }
    next() {
        const { BEGINNING, node, max_depth, node_stack, val_length_stack, key, yielder, meta } = this;

        // Prevent infinite loop from a cyclical graph;
        if (this.sp > 100000)
            throw new (class CyclicalError extends Error {
            })("Max node tree depth reached. The tree may actually be a cyclical graph.");

        if (BEGINNING) {

            this.BEGINNING = false;

            if (!this.yielder) this.yielder = new Yielder<TraversedNode<T>, K>();

            if (node) {

                if (!this.yield_on_exit_only || getChildContainerLength(node, key) == 0) {

                    //@ts-ignore dd
                    const y = this.yielder.yield(node, this.sp, node_stack, val_length_stack, meta);

                    meta.parent = null;

                    if (y)
                        return { value: { node: y, meta }, done: false };
                }
            } else {

                return { value: null, done: true };
            }
        }

        while (this.sp >= 0) {

            const len = this.val_length_stack[this.sp], limit = (len & 0xFFFF0000) >> 16, index = (len & 0xFFFF);

            if (this.sp < max_depth && index < limit) {

                meta.parent = node_stack[this.sp];

                const children: T[] = getChildContainer(node_stack[this.sp], key), child = children[index];

                val_length_stack[this.sp]++;

                this.sp++;

                node_stack[this.sp] = child;

                const child_length = getChildContainerLength(child, key);

                val_length_stack[this.sp] = child_length << 16;

                if (child) {
                    meta.prev = children[index - 1];
                    meta.next = children[index + 1];
                    meta.index = index;
                    meta.depth = this.sp;
                    meta.traverse_state = child_length == 0 ? TraverseState.LEAF : TraverseState.ENTER;

                    if (!this.yield_on_exit_only || child_length == 0) {

                        //@ts-ignore
                        const y = this.yielder.yield(child, this.sp, node_stack, val_length_stack, meta);

                        if (y)
                            return { value: { node: y, meta }, done: false };
                    }
                }
            } else {

                this.sp--;

                if (this.sp >= 0) {

                    const len = this.val_length_stack[this.sp], limit = (len & 0xFFFF0000) >> 16, index = (len & 0xFFFF);

                    if (index >= limit) {

                        const len = this.val_length_stack[this.sp - 1] || 0, index = (len & 0xFFFF);

                        meta.parent = node_stack[this.sp];

                        const node = node_stack[this.sp];

                        if (node) {

                            const children: T[] = getChildContainer(node_stack[this.sp - 1], key);

                            meta.prev = children[index - 1];
                            meta.next = children[index + 1];
                            meta.index = index;
                            meta.depth = this.sp;
                            meta.traverse_state = TraverseState.EXIT;

                            //@ts-ignore
                            const y = this.yielder.yield(node, this.sp, node_stack, val_length_stack, meta);

                            if (y)
                                return { value: { node: y, meta }, done: false };
                        }
                    }
                }
            }
        }
        //@ts-ignore
        yielder.complete(node_stack[0], this.sp, node_stack, val_length_stack, meta);

        return { value: null, done: true };
    }
}

/**
 * This traverses a tree and yields node descending and ascending, depth first. Interior nodes will be yielded 
 * twice. Yield modifiers can be used to perform both non-destructive and destructive edits on the AST.
 * 
 * Meta object contains an extra property, `traverse_state`, which is an integer with three states:
 * - `0` : The traverser is entering an interior.
 * - `1` : The traverser is exiting an interior.
 * - `2` : The traverser is yielding a leaf node. 
 * 
 * @param node - The root node of the AST tree.
 * @param key - The property of a node that contains its immediate descendants
 * @param yield_on_exit_only - The traverser will yield interior nodes on exit only.
 * @param max_depth - The maximum level of the tree to return nodes from, starting at level 1 for the root node.
 */
export function bidirectionalTraverse<T, K extends keyof T>(node: T, key: K, yield_on_exit_only: boolean = false, max_depth: number = Infinity) {

    max_depth = Math.max(0, Math.min(100000, max_depth - 1));

    return new bidirectionalTraverser<T, K, MetaRoot<T, K>>(node, key, { depth: 0, key, index: 0, parent: null, next: null, prev: null, traverse_state: 0 }, yield_on_exit_only, max_depth);
}

