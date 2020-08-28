import { Yielder } from "./yielder.js";

/**
 * Adds a skip method to the node, which, when called, causes the traverser to skip the node's children
 */
export function make_skippable<T, K extends keyof T>(): SkippableYielder<T, K> {
    return new SkippableYielder<T, K>();
}

export class SkippableYielder<T, K extends keyof T> extends Yielder<T, K> {

    protected stack_pointer: number;
    protected val_length_stack: number[];

    protected modifyMeta(meta, val_length_stack, node_stack) {
        this.val_length_stack = val_length_stack;
        meta.skip = this.skip.bind(this);
    }

    /**
    * Adds a skip method to the node, which, when called, causes the traverser to skip over a certain 
    * number of the nodes children.
    * 
    * @param skip_to_child_index The index of child node to skip to. If undefined, all child nodes are skipped.
    */
    skip(skip_to_child_index: number = Infinity) {

        const { stack_pointer, val_length_stack } = this;

        if (skip_to_child_index == undefined) skip_to_child_index = ((val_length_stack[stack_pointer] & 0xFFFF0000) >> 16) + 1;

        val_length_stack[stack_pointer] = (val_length_stack[stack_pointer] & 0xFFFF0000) | skip_to_child_index;
    }

    protected yield(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta) {
        this.stack_pointer = stack_pointer;
        return this.yieldNext(node, stack_pointer, node_stack, val_length_stack, meta);
    }
}
