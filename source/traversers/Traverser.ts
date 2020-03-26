import { Yielder } from "../yielders/yielder.js";
import { getChildContainerLength, getChildContainer } from "./child_container_functions.js";
import { TraversedNode } from "../types/traversed_node.js";
import { ASTIterator, TraverserOutput, CombinedYielded } from "../types/node_iterator.js";
import { ReplaceableYielder, make_replaceable, ReplaceableFunction } from "../yielders/replaceable.js";
import { bitFilterYielder, bit_filter } from "../yielders/bit_filter.js";
import { FilterYielder, filter } from "../yielders/filter.js";
import { ReplaceYielder, ReplaceFunction, replace } from "../yielders/replace.js";
import { ExtractYielder, extract } from "../yielders/extract_root_node.js";
import { skip_root } from "../yielders/skip_root.js";
import { make_skippable } from "../conflagrate.js";
import { SkippableYielder } from "../yielders/skippable.js";
import { MetaRoot } from "./traverse.js";
import { MutableFunction, MutableYielder, make_mutable } from "../yielders/mutable.js";
export class Traverser<T, K extends keyof T, B> implements ASTIterator<T, K, B> {
    protected readonly key: K;
    protected readonly node: T;
    protected sp: number;
    protected BEGINNING: boolean;
    protected yielder: Yielder<TraversedNode<T>, K>;
    protected readonly meta: B & MetaRoot<K>;
    protected readonly max_depth: number;
    protected readonly val_length_stack: number[];
    protected readonly node_stack: T[];
    constructor(root: T, key: K, meta: B & MetaRoot<K>, max_depth: number) {
        this.key = key;
        this.node = root;
        this.sp = 0;
        this.BEGINNING = false;
        this.yielder = null;
        this.max_depth = max_depth;
        this.val_length_stack = [];
        this.node_stack = [];
        this.meta = meta;
    }
    [Symbol.iterator]() {
        this.meta.index = 0;
        this.meta.depth = 0;
        this.sp = 0;
        this.BEGINNING = true;
        this.node_stack[0] = this.node;
        this.val_length_stack[0] = getChildContainerLength(this.node, this.key) << 16;
        this.val_length_stack[1] = 0;
        return this;
    }
    next(): {
        done?: boolean;
        value: TraverserOutput<T, B>;
    } {
        const { BEGINNING, node, max_depth, node_stack, val_length_stack, key, yielder, meta } = this;

        // Prevent infinite loop from a cyclical graph;
        if (this.sp > 100000)
            throw new (class CyclicalError extends Error {
            })("Max node tree depth reached. The tree may actually be a cyclical graph.");

        if (BEGINNING) {

            this.BEGINNING = false;

            if (!this.yielder)
                this.yielder = new Yielder<TraversedNode<T>, K>();

            if (node) {
                //@ts-ignore
                const y = this.yielder.yield(node, this.sp, node_stack, val_length_stack, meta);

                if (y)
                    return { value: { node: y, meta }, done: false };
            }
            else {

                return { value: null, done: true };
            }
        }
        while (this.sp >= 0) {

            const len = this.val_length_stack[this.sp], limit = (len & 0xFFFF0000) >> 16, index = len & 0xFFFF;

            if (this.sp < max_depth && index < limit) {

                const children: T[] = getChildContainer(node_stack[this.sp], key), child = children[index];

                val_length_stack[this.sp]++;

                this.sp++;

                node_stack[this.sp] = child;

                val_length_stack[this.sp] = getChildContainerLength(child, key) << 16;

                if (child) {

                    meta.index = index;
                    meta.depth = this.sp;

                    //@ts-ignore
                    const y = yielder.yield(child, this.sp, node_stack, val_length_stack, meta);

                    if (y)
                        return { value: { node: y, meta }, done: false };
                }
            }
            else
                this.sp--;
        }

        //@ts-ignore
        yielder.complete(node_stack[0], this.sp, node_stack, val_length_stack, meta);

        return { value: null, done: true };
    }
    then<U>(next_yielder: U): Traverser<T, K, CombinedYielded<U, B>> {

        //@ts-ignore
        next_yielder.modifyMeta(this.meta, this.val_length_stack, this.node_stack);

        if (typeof next_yielder == "function")
            next_yielder = next_yielder();

        if (!this.yielder)
            //@ts-ignore
            this.yielder = next_yielder;
        else
            //@ts-ignore
            this.yielder.then(next_yielder, this.key);

        //@ts-ignore
        next_yielder.key = this.key;

        return <Traverser<T, K, CombinedYielded<U, B>>><unknown>this;
    }
    run() { for (const { } of this); }

    makeReplaceable(replace_function?: ReplaceableFunction<T>): Traverser<T, K, CombinedYielded<ReplaceableYielder<T, K>, B>> {
        return this.then(make_replaceable<T, K>(replace_function));
    }

    makeMutable(replace_function?: MutableFunction<T>): Traverser<T, K, CombinedYielded<MutableYielder<T, K>, B>> {
        return this.then(make_mutable<T, K>(replace_function));
    }

    bitFilter<A extends keyof T>(key: A, ...bits: number[]): Traverser<T, K, CombinedYielded<bitFilterYielder<T, K>, B>> {
        return this.then(bit_filter<T, K, A>(key, ...bits));
    }

    filter<A extends keyof T>(key: A, ...filter_condition: any[]): Traverser<T, K, CombinedYielded<FilterYielder<T, K>, B>> {
        return this.then(filter<T, K, A>(key, ...filter_condition));
    }

    makeSkippable(): Traverser<T, K, CombinedYielded<SkippableYielder<T, K>, B>> {
        return this.then(make_skippable<T, K>());
    }

    extract(receiver: { ast: any; }): Traverser<T, K, B> {
        return this.then(extract(receiver));
    }

    replace(replace_function: ReplaceFunction<T>): Traverser<T, K, B> {
        return this.then(replace<T, K>(replace_function));
    }

    skipRoot(): Traverser<T, K, B> {
        return this.then(skip_root<T, K>());
    }
};
