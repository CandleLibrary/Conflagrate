
export class Yielder<T, K extends keyof T> {
    nx: Yielder<T, K>;

    key: K;
    constructor() {
        this.nx = null;
    }
    complete(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[]): T | null {
        return this.completeNext(node, stack_pointer, node_stack, val_length_stack);
    }

    completeNext(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[]): T | null {
        if (this.nx)
            return this.nx.complete(node, stack_pointer, node_stack, val_length_stack);
        return node;
    }
    yield(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[]): T | null {
        return this.yieldNext(node, stack_pointer, node_stack, val_length_stack);
    }

    yieldNext(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[]): T | null {
        if (this.nx)
            return this.nx.yield(node, stack_pointer, node_stack, val_length_stack);
        return node;
    }

    then(yielder: Yielder<T, K>, subnode_key: K): Yielder<T, K> {

        this.key = subnode_key;

        if (this.nx)
            return this.nx.then(yielder, subnode_key);

        this.nx = yielder;

        return yielder;
    }
}
