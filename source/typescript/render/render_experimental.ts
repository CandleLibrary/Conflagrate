/* 
 * Copyright (C) 2021 Anthony Weathersby - The Hydrocarbon Parser Compiler
 * see /source/typescript/hydrocarbon.ts for full copyright and warranty 
 * disclaimer notice.
 */
import { Token } from "@candlelib/hydrocarbon";

import { NodeMappings } from "../types/node_mappings.js";

import { NodeRenderer, RendererState } from "../types/render_types";

import framework from "./parser_new.js";

import { Logger } from "@candlelib/log";
import { addNewColumn, addNewLines, incrementColumn, getLastLine } from "./source_map_functions.js";
import { createSourceMap } from "../sourcemap/source_map.js";
import { SourceMap } from "../conflagrate.js";

const { parse: render_compiler } = await framework;

function addLiteral(state: RendererState<any, any>, literal_string: string) {

    state.PREVIOUS_SPACE = literal_string[literal_string.length - 1][0] == " ";

    if (state.CREATE_MAP && state.token)
        addNewColumn(state.map, state.column, 0, state.token.line, state.token.column);

    state.column += literal_string.length;

    return literal_string;
}

function addSpace(state: RendererState<any, any>, IS_OPTIONAL) {

    state.PREVIOUS_SPACE = true;

    if (IS_OPTIONAL && !state.FORMAT) return "";

    state.column += 1;

    return " ";
}

function addNewLine(state: RendererState<any, any>, IS_OPTIONAL) {

    if (IS_OPTIONAL && !state.FORMAT)
        return "";

    state.PREVIOUS_SPACE = true;

    state.line++;
    state.column = state.indent * 4;

    if (state.CREATE_MAP) {
        addNewLines(state.map, 1);
    }

    return "\n" + (" ").repeat(state.indent * 4);
}

function increaseIndent(state: RendererState<any, any>, IS_OPTIONAL) {
    state.indent++;
}

function decreaseIndent(state: RendererState<any, any>, IS_OPTIONAL) {
    state.indent--;
}

function emptyProp(state, prop, index) {


    const property = state.node[prop];

    if (!property) return true;

    if (Array.isArray(property)) {

        index = index ? parseInt(index) : null;

        if (typeof index == "number") {


            if (!property[index]) return true;

        } else if (property.length == 0)
            return true;
    }

    if ((property instanceof Map || property instanceof Set) && property.size == 0) return true;

    return false;
}

function propertyToString<Node, TypeName extends keyof Node>(
    state: RendererState<Node, TypeName>,
    prop: string,
    index: number = 0,
    IS_OPTIONAL: boolean = false,
    delimiter: ((state: RendererState<Node, TypeName>) => string)[] = [() => ""]
) {

    const property = state.node[prop];
    const node = state.node;
    const token = state.token;

    let str = "";

    if (property === null || property === undefined) {
        if (IS_OPTIONAL || index == Infinity)
            str = "";
        else
            throw new Error(`Property [${prop}] is not present on node [${node[state.mappings.typename]}]`);

    } else {

        if (typeof property == "object") {
            if (property instanceof Token) {
                str = property.toString();


                if (token && state.CREATE_MAP)
                    addNewColumn(state.map, state.column, 0, token.line, token.column);


                state.column += str.length;
            } else if (Array.isArray(property)) {

                if (index < 0 || index == Infinity) {

                    const start = index < 0 ? -index : 0, end = property.length - 1;

                    const strings = [];

                    for (let i = start; i < end + 1; i++) {
                        state.node = property[i];
                        strings.push(renderFunction(state));
                        if (i < end) {
                            state.node = node;
                            state.token = token;
                            for (const rule of delimiter)
                                strings.push(rule(state));
                        }
                    }

                    str = strings.join("");

                } else {

                    state.node = property[index];

                    str = renderFunction(state, property[index]);
                }

            } else {
                str = renderFunction(state, property);
            }
        } else {
            str = property.toString();

            if (token && state.CREATE_MAP)
                addNewColumn(state.map, state.column, 0, token.line, token.column);

            state.column += str.length;
        }

        state.token = token;
        state.node = node;
    }

    state.PREVIOUS_SPACE = (str[str.length - 1] == " ");

    return str;
}

function getRenderer<Node, TypeName extends keyof Node>(
    node: Node,
    mappings: NodeMappings<Node, TypeName>,
    renderers: NodeRenderer<Node, TypeName>[],
): NodeRenderer<Node, TypeName> {

    const index = mappings.type_lookup(node, node[mappings.typename] + "");

    return renderers[index];
}

export function renderTemplateFunction<Node, TypeName extends keyof Node>(
    state: RendererState<Node, TypeName>,
    node: Node = null,
    FORCE_TEMPLATE = true
): string {
    const str = renderFunction(state, node, FORCE_TEMPLATE);
    state.PREVIOUS_SPACE = (str[str.length - 1] == " ");
    return str;

}
export function renderFunction<Node, TypeName extends keyof Node>(
    state: RendererState<Node, TypeName>,
    node: Node = null,
    FORCE_TEMPLATE = false
): string {

    const { node: state_node, renderers, mappings } = state;

    node = node || state_node;

    state.node = node;

    let str = "";

    let token: Token = state.token;

    for (const prop in node) {
        if (node[prop] instanceof Token) {
            //@ts-ignore
            token = node[prop];
            break;
        }
    }

    if (token)
        state.token = token;
    if (["string", "number", "boolean", "null", "undefined", "bigint"].includes(typeof node)) {

        str = String(node);

    } else if (!node)
        return "";
    else {

        if (node?.[mappings.typename]) {
            const renderer = getRenderer(node, mappings, renderers);

            if (!(renderer?.render)) {
                return `[No template pattern defined for ${node?.[mappings.typename]}]`;
            } else if (FORCE_TEMPLATE) {
                return renderer.template_function(state, renderTemplateFunction);
            } else {
                return renderer.render(state, renderTemplateFunction);
            }
        } else {
            //Default to string rendering
            str = node.toString();
        }
    }

    if (str) {
        const token = state.token;

        if (token && state.CREATE_MAP)
            addNewColumn(state.map, state.column, 0, token.line, token.column);

        state.column += str.length;

        return str;
    }
}

export function render<Node, TypeName extends keyof Node>(
    node: Node,
    mappings: NodeMappings<Node, TypeName>,
    renderers: NodeRenderer<Node, TypeName>[],
    ENABLE_OPTIONAL_FORMATTING: boolean = false,
    ENABLE_SOURCE_MAP_GENERATING: boolean = false
): {
    string: string, source_map?: SourceMap;
} {

    const state: RendererState<Node, TypeName> = {
        column: 0,
        indent: 0,
        line: 0,
        PREVIOUS_SPACE: false,
        map: [],
        mappings,
        renderers,
        node,
        token: null,
        custom: {},
        CREATE_MAP: ENABLE_SOURCE_MAP_GENERATING,
        FORMAT: ENABLE_OPTIONAL_FORMATTING
    };

    if (state.CREATE_MAP) getLastLine(state.map);

    const output = renderFunction(state, node);

    let source_map = null;

    if (state.CREATE_MAP)
        source_map = createSourceMap(state.map, "", "", null, null, []);

    return {
        string: output,
        source_map,
    };
}

const env = {
    propertyToString,
    render,
    emptyProp,
    addLiteral,
    addSpace,
    addNewLine,
    increaseIndent,
    decreaseIndent,
};

export function constructRenderers<Node, TypeName extends keyof Node>(mappings: NodeMappings<Node, TypeName>) {

    const renderers: NodeRenderer<Node, TypeName>[] = new Array(mappings.mappings.length);

    for (const map of mappings.mappings) {

        const { template, type, custom_render } = map;

        const index = mappings.type_lookup(<Node>{ [mappings.typename]: type }, type);

        if (index == undefined) {
            Logger
                .get("conflagrate")
                .get("renderer")
                .get("build")
                .activate().error(`Could not derive mapping index for ${type} on template`, map);
            throw new Error(`Could not find renderer for ${type}`);
        }

        if (!template) {

            const default_template = () => `[No template defined for: ${type} ]`;

            if (custom_render) {
                renderers[index] = ({
                    type,
                    render: custom_render,
                    template_function: default_template
                });
            } else {

                renderers[index] = ({
                    type,
                    render: default_template,
                    template_function: default_template
                });
            }

        } else {

            const { result, err } = render_compiler(template + "  ", env);

            if (err) {
                console.log(mappings.typename, { template });
                throw err;
            } else {
                const [renderer] = result;

                if (custom_render) {
                    renderers[index] = ({
                        type,
                        render: custom_render,
                        template_function: renderer
                    });
                } else {
                    renderers[index] = ({ type, render: renderer, template_function: renderer });
                }
            }
        }
    }

    return renderers;
}