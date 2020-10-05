import { traverse } from "./traverse.js";
export interface NodeHandler<T, D> {
    priority: number;
    handleNode: (node: T, data: D, skip: () => void, parent: T) => T | undefined | Promise<T | undefined>;
}
export function createHandlers<T, D>(size): NodeHandler<T, D>[][] {
    const handlers = [],
        def: NodeHandler<T, D> = {
            priority: -9999999,
            handleNode: n => n
        };

    for (let i = 0; i < size; i++)
        handlers[i] = [def];

    return handlers;
}

export function setHandler<T, D>(
    handlers: NodeHandler<T, D>[][],
    getIndex: (number) => number,
    handler: NodeHandler<T, D>,
    ...types: number[]): NodeHandler<T, D>[][] {

    if (!handlers)
        handlers = [];

    for (const type of types) {

        const index: number = getIndex(type);

        if (!handlers[index /*Math.max((type >>> 23), 0)*/])
            handlers[index /*Math.max((type >>> 23), 0)*/] = [];

        const handler_array = handlers[index /*Math.max((type >>> 23), 0)*/];

        handler_array.push(handler);

        handler_array.sort((a, b) => a.priority > b.priority ? -1 : 1);;
    }

    return handlers;
}

export function expandableTraverse<D, T, K extends keyof T, R extends keyof T>(
    handlers: NodeHandler<T, D>[][],
    ast: T,
    children: K,
    type: R,
    getIndex: (number) => number,
    data: D
): T {

    const extract = { ast: null };

    main_loop: for (const { node, meta: { skip, parent, replace } } of traverse<T, K>(ast, children)
        .skipRoot()
        .makeReplaceable()
        .makeSkippable()
        .extract(extract)) {

        for (const handler of handlers[getIndex(node[type])]) {

            const result = handler.handleNode(node, data, skip, parent);

            if (result instanceof Promise)
                throw new Error("expandableTraverse cannot parse NodeHandlers that return promises. Use asyncExpandableTraverse instead.");

            if (result != node) {

                if (result === null || result !== undefined) {

                    replace(result);

                    if (result === null)
                        continue main_loop;

                }
                else
                    continue;
            } break;
        }
    }

    return extract.ast;
}

export async function asyncExpandableTraverse<D, T, K extends keyof T, R extends keyof T>(
    handlers: NodeHandler<T, D>[][],
    ast: T,
    children: K,
    type: R,
    getIndex: (number) => number,
    data: D
): T {

    const extract = { ast: null };

    main_loop: for (const { node, meta: { skip, parent, replace } } of traverse<T, K>(ast, children)
        .skipRoot()
        .makeReplaceable()
        .makeSkippable()
        .extract(extract)) {

        for (const handler of handlers[getIndex(node[type])]) {

            const pending = handler.handleNode(node, data, skip, parent);

            let result = null;

            if (pending instanceof Promise) result = await pending;
            else result = pending;
            if (result != node) {

                if (result === null || result !== undefined) {

                    replace(result);

                    if (result === null)
                        continue main_loop;

                }
                else
                    continue;
            } break;
        }
    }

    return extract.ast;
}


export function expandableMutableTraverse<D, T, K extends keyof T, R extends keyof T>(
    handlers: NodeHandler<T, D>[][],
    ast: T,
    children: K,
    type: R,
    getIndex: (number) => number,
    data: D
): T {

    const extract = { ast: null };

    main_loop: for (const { node, meta: { skip, parent, mutate } } of traverse<T, K>(ast, children)
        .skipRoot()
        .makeMutable()
        .makeSkippable()
        .extract(extract)) {

        for (const handler of handlers[getIndex(node[type])]) {

            const result = handler.handleNode(node, data, skip, parent);

            if (result instanceof Promise)
                throw new Error("expandableTraverse cannot parse NodeHandlers that return promises. Use asyncExpandableTraverse instead.");

            if (result != node) {

                if (result === null || result !== undefined) {

                    mutate(result);

                    if (result === null)
                        continue main_loop;

                }
                else
                    continue;
            } break;
        }
    }

    return extract.ast;
}

export async function asyncExpandableMutableTraverse<D, T, K extends keyof T, R extends keyof T>(
    handlers: NodeHandler<T, D>[][],
    ast: T,
    children: K,
    type: R,
    getIndex: (number) => number,
    data: D
): T {

    const extract = { ast: null };

    main_loop: for (const { node, meta: { skip, parent, mutate } } of traverse<T, K>(ast, children)
        .skipRoot()
        .makeMutable()
        .makeSkippable()
        .extract(extract)) {

        for (const handler of handlers[getIndex(node[type])]) {

            const pending = handler.handleNode(node, data, skip, parent);

            let result = null;

            if (pending instanceof Promise) result = await pending;
            else result = pending;

            if (result != node) {

                if (result === null || result !== undefined) {

                    mutate(result);

                    if (result === null)
                        continue main_loop;

                }
                else
                    continue;
            } break;
        }
    }

    return extract.ast;
}