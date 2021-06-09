/* 
 * Copyright (C) 2021 Anthony Weathersby - The Hydrocarbon Parser Compiler
 * see /source/typescript/hydrocarbon.ts for full copyright and warranty 
 * disclaimer notice.
 */

import { NodeMappings } from "../types/node_mappings.js";
import { NodeRenderer, RendererState } from "../types/render_types";
import { parser_factory } from "./parser.js";

const { parser: render_compiler } = parser_factory;

function getSourcePosition(state: RendererState<any, any>): { line: number, column: number; } {
    return { line: 0, column: 0 };
};

function addLiteral(state: RendererState<any, any>, literal_string: string) {
    state.PREVIOUS_SPACE = literal_string[literal_string.length - 1][0] == " ";
    return literal_string;
}

function addSpace(state, IS_OPTIONAL) {
    if (state.PREVIOUS_SPACE)
        return "";

    state.PREVIOUS_SPACE = true;

    if (IS_OPTIONAL) return " ";

    return " ";
}

function addNewLine(state, IS_OPTIONAL) {
    state.PREVIOUS_SPACE = true;
    return "\n" + (" ").repeat(state.indent * 4);
}

function increaseIndent(state, IS_OPTIONAL) {
    state.indent++;
}

function decreaseIndent(state, IS_OPTIONAL) {
    state.indent--;
}

function emptyProp(state, prop) {

    const property = state.node[prop];

    if (!property) return true;

    if (Array.isArray(property) && property.length == 0) return true;

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

    let str = "";

    if (property === null || property === undefined) {
        if (IS_OPTIONAL || index == Infinity)
            str = "";
        else
            throw new Error(`Property [${prop}] is not present on node ${state.node[state.mappings.type_lookup(node, "" + (node[state.mappings.typename]))]}`);

    } else {

        if (typeof property == "object") {

            if (Array.isArray(property)) {

                const delimiter_string: string = delimiter.map(d => d(state)).join("");

                str = property.map(node => (state.node = node, renderFunction(state))).join(delimiter_string);

            } else {

                str = renderFunction(state, property);
            }
        } else {
            str = property.toString();
        }

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
): string {
    const str = renderFunction(state, node, true);
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

    if (typeof node == "string") {
        return node;
    } else {

        const renderer = getRenderer(node, mappings, renderers);

        if (!(renderer?.render)) {
            if (node?.[mappings.typename]) {
                return `[No template pattern defined for ${node?.[mappings.typename]}]`;
            } else {
                throw "WTF!?!";
            }
        } else {

            if (FORCE_TEMPLATE) {
                return renderer.template_function(state, renderTemplateFunction);
            } else {
                return renderer.render(state, renderTemplateFunction);
            }
        }
    }
}

export function render<Node, TypeName extends keyof Node>(
    node: Node,
    mappings: NodeMappings<Node, TypeName>,
    renderers: NodeRenderer<Node, TypeName>[]
) {

    const state: RendererState<Node, TypeName> = {
        column: 0,
        indent: 0,
        line: 0,
        PREVIOUS_SPACE: false,
        map: [],
        mappings,
        renderers,
        node,
        custom: {}
    };

    return renderFunction(state, node);
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

    for (const { template, type, custom_render } of mappings.mappings) {

        const index = mappings.type_lookup(<Node>{ [mappings.typename]: type }, type);

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

            const renderer = render_compiler(template, env).result[0];

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

    return renderers;
}