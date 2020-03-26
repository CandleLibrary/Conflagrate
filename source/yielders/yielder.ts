
export class Yielder<T, K extends keyof T> {
    protected nx: Yielder<T, K>;

    key: K;
    constructor(yielder_function?, complete_function?) {
        this.nx = null;

        if (yielder_function)
            this.yield = yielder_function;
        if (complete_function)
            this.complete = complete_function;
    }
    protected complete(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta: object): T | null {
        return this.completeNext(node, stack_pointer, node_stack, val_length_stack, meta);
    }

    protected completeNext(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta: object): T | null {
        if (this.nx)
            return this.nx.complete(node, stack_pointer, node_stack, val_length_stack, meta);
        return node;
    }
    protected yield(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta: object): T | null {
        return this.yieldNext(node, stack_pointer, node_stack, val_length_stack, meta);
    }

    protected yieldNext(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta: object): T | null {
        if (this.nx)
            return this.nx.yield(node, stack_pointer, node_stack, val_length_stack, meta);
        return node;
    }

    protected modifyMeta(meta: any, val_length_stack: number[], node_stack: T[]) { }

    protected then(yielder: Yielder<T, K>, subnode_key: K): Yielder<T, K> {

        this.key = subnode_key;

        if (this.nx)
            return this.nx.then(yielder, subnode_key);

        this.nx = yielder;

        return yielder;
    }
}
