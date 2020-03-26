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
    * Adds a skip method to the node, which, when called, causes the traverser to skip the node's children
    */
    skip(n: number = 0) {
        const { stack_pointer, val_length_stack } = this;
        val_length_stack[stack_pointer] = (val_length_stack[stack_pointer] & 0xFFFF0000) | n;
    }

    protected yield(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta) {
        this.stack_pointer = stack_pointer;
        return this.yieldNext(node, stack_pointer, node_stack, val_length_stack, meta);
    }
}
