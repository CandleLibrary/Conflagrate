/* 
 * Copyright (C) 2021 Anthony Weathersby - The Hydrocarbon Parser Compiler
 * see /source/typescript/hydrocarbon.ts for full copyright and warranty 
 * disclaimer notice.
 */

import { NodeMappings } from "./node_mappings.js";
import { Token } from "@candlelib/hydrocarbon";
export interface RendererState<Node, TypeName extends keyof Node> {

    /**
     * The node that is being rendered
     */
    node: Node;
    /**
     * The current indentation level of the output 
     */
    indent: number,
    /**
     * The current line number of the output
     */
    line: number,
    /**
     * The current column number of the output
     */
    column: number,
    /**
     * The array of NodeMapping for the AST
     */
    mappings: NodeMappings<Node, TypeName>,
    /**
     * An array of NodRenderer object for the current AST
     */
    renderers: NodeRenderer<Node, TypeName>[],
    /**
     * An array of source map objects for the output text
     */
    map: Array<number[]>,
    /**
     * An optional user supplied state object that can be used
     * of lookup tables, activation frames, etc.
     */
    custom?: any;
    /**
     * True if the last character written is a space or newline character
     */
    PREVIOUS_SPACE: boolean;
    /**
     * Enable optional formatting rules
     */
    FORMAT: boolean;
    /**
     * Enable source map generation
     */
    CREATE_MAP: boolean;
    /**
     * The Token object of the current node
     */
    token: Token
}

export interface renderFunction<Node, TypeName extends keyof Node> {
    (
        state: RendererState<Node, TypeName>,

        node?: any,

        FORCE_TEMPLATE?: boolean

    ): string,
}

/**
 * Returns a rendered string for a given AST node
 */
export interface render_function<Node, TypeName extends keyof Node> {
    (state: RendererState<Node, TypeName>, render_fn: renderFunction<Node, TypeName>): string;
}
/**
 * A uses defined render function.
 */
export type custom_render_function<Node, TypeName extends keyof Node> = render_function<Node, TypeName>;
export interface NodeRenderer<Node, TypeName extends keyof Node> {
    type: Node[TypeName];

    /**
     * Either the template render function or a custom render
     * function that receives state and the template render function
     * (if present) as arguments
     */
    render: render_function<Node, TypeName> | custom_render_function<Node, TypeName>;

    /**
     * For use with custom render functions
     */
    template_function: render_function<Node, TypeName>;
}
