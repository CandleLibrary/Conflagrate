/* 
 * Copyright (C) 2021 Anthony Weathersby - The Hydrocarbon Parser Compiler
 * see /source/typescript/hydrocarbon.ts for full copyright and warranty 
 * disclaimer notice.
 */

import { FormatRule } from "./FormatRule";

import { custom_render_function } from "./render_types";

export type getNodeMappingIndex<T> = (node: T) => number;
export interface NodeMapping<
    Node,
    > {
    type: Node[keyof Node],

    child_keys?: (keyof Node)[];

    /**
        A template pattern may contain template insertion points marked by a [$]
        character. For each insertion point there is an action to perform depending
        on the surrounding syntax:
        
        1. Value-Index-Insertion

        \@\\n+\?? => This indicates the rendering of the node contained in parent.nodes[<\n*>] should be
                rendered and the result inserted at this point. 

        1. Value-Name-Insertion

        \@_\w+\?? => This indicates the rendering of the node referenced at parent[<\w+>] should be
                rendered and the result inserted at this point.

        2. Spread-Value-Insertion
        
        \@...[.\s] => This indicates that all node.nodes should be rendered and results inserted into
                the output string with a single character separating the entries. If there are proceeding 
                Value-Index-Insertion, the spread will start at the index location following the 
                one specified in Value-Index-Insertion. The spread will be delimited by the character 
                following [@...]

        3. Non-Value-Insertion 
        
        \@\w* => This indicates that a property of node should be inserted into the output
                string, after being coerced to a string value using the string constructor
                String()

        3. Conditional-Insertion
        
        \@(\w+,\.+) => This indicates the truthiness of a node property determines whether
                a string expression is   rendered.
    */
    template?: string;

    /**
     * A number indicating the type of formatting to 
     * apply when rendering this node
     */
    format_rule?: FormatRule;

    /**
     * A user supplied render function 
     */
    custom_render?: custom_render_function<Node, keyof Node>;
}

const map = cm<AST, AST, "type">("ADD", ["type"]);

export interface NodeMappings<
    Root,
    TypeKey extends keyof Root,
    R extends Root = any
    > {
    typename: TypeKey;

    type_lookup: (node: Root, name: string) => number;

    /**
     * Given a node and its type returns an index into the mappings
     * table for that node.
     */
    //type_lookup?: (node: Node, type: Node[TypeValueProp]) => number;
    mappings: (NodeMapping<R>)[];
}


const enum J {
    TACO = "ASA",
    MANGO = "BASA",
}
interface N {
    type: J;

    x: N;
}