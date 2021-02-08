import { Yielder } from "../yielders/yielder.js";

// https://stackoverflow.com/questions/23130292/test-for-array-of-string-type-in-typescript
type ArrayElement<ArrayType extends readonly unknown[], ObjType extends unknown> = ArrayType[number];

export interface TraverserOutput<Node, Key extends keyof Node, Meta> {
    //@ts-ignore
    node: Node; //| Node[Key];
    meta: Meta;
};

export type CombinedYielded<NextYielder, PrevYielder> = NextYielder & PrevYielder;

export interface ASTIterator<Node, Key extends keyof Node, Meta> {

    [Symbol.iterator](): { next(): { done?: boolean, value: TraverserOutput<Node, Key, Meta>; }; };
    /**
     * Iterate through the Iterator
     */
    run: () => void;

    then(arg0: Yielder<Node, Key>): ASTIterator<Node, Key, CombinedYielded<Yielder<Node, Key>, Meta>>;
};