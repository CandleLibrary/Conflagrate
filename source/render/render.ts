import { addNewColumn, addNewLines, incrementColumn, getLastLine } from "./source_map_functions.js";

import { Lexer } from "@candlefw/wind";

const node_id_bit_offset = 23;

export const enum FormatRule {
    MIN_LIST_ELE_LIMIT_SHIFT = 0,

    MIN_LIST_ELE_LIMIT = 1 << MIN_LIST_ELE_LIMIT_SHIFT,

    LIST_SPLIT_SHIFT = 4,
    LIST_SPLIT = 1 << LIST_SPLIT_SHIFT,

    NEW_LINES_SHIFT = 8,
    NEW_LINES = 1 << NEW_LINES_SHIFT,

    INDENT_SHIFT = 12,
    INDENT = 1 << INDENT_SHIFT,

    OPTIONAL_SPACE_SHIFT = 16,
    OPTIONAL_SPACE = 1 << OPTIONAL_SPACE_SHIFT,
}

function tabFill(count: number): string {
    return ("    ").repeat(count);
}


type RenderStub<T> = (
    node: T,
    env: RenderEnvironment<T>,
    level: number,
    line: number,
    map?: Array<number[]>,
    source_index?: number,
    names?: Map<string, number>,
) => { str: string, level: number, line: number; };

class RenderAction<T> {
    action_list: Array<RenderStub<T>>;

    constructor(action_list: Array<RenderStub<T>>) {
        this.action_list = action_list;
    }

    render(
        node: T,
        env: RenderEnvironment<T>,
        map: Array<number[]>,
        level: number,
        source_index?: number,
        names?: Map<string, number>
    )
        : string {

        let string = [], line = 0;

        for (const action of this.action_list) {
            const { str, level: lvl, line: ln }
                = action(node, env, level, line, map, source_index, names);
            line = ln;
            level = lvl;
            string.push(str);
        }

        return string.join("");
    }
}

interface ConditionBranch<T> {
    prop: string,
    action: RenderAction<T>;
}

interface ValuePresenceBranch<T> {
    flag: number,
    action: RenderAction<T>;
}

class NodeRenderer<T> {
    condition_branches: Array<ConditionBranch<T>>;
    val_presence_branches: Array<ValuePresenceBranch<T>>;
    default_branch: RenderAction<T>;
    HAS_CONDITIONS: boolean;
    HAS_VAL_ABSENCE: boolean;


    constructor(condition_branches: Array<ConditionBranch<T>>, val_presence_branches: Array<ValuePresenceBranch<T>>, default_branch: RenderAction<T>) {
        this.HAS_CONDITIONS = !!condition_branches.length;
        this.HAS_VAL_ABSENCE = !!val_presence_branches.length;
        this.condition_branches = condition_branches;
        this.val_presence_branches = val_presence_branches;
        this.default_branch = default_branch;
    }

    render(node: T & { pos: Lexer, nodes: T[], type: number; },
        env: RenderEnvironment<T>,
        level: number = 0,
        map: Array<number[]> = null,
        source_index: number = -1,
        names = null
    ): string {

        for (const cond of this.condition_branches) {
            if (!!node[cond.prop])
                return cond.action.render(node, env, map, level, source_index, names);
        }

        const flag = (node.nodes) ? node.nodes.map((v, i) => !!v ? 1 << i : 0).reduce((r, v) => r | v, 0) : 0x7FFFFFFF;

        for (const cond of this.val_presence_branches) {
            if ((cond.flag & flag) == flag)
                return cond.action.render(node, env, map, level, source_index, names);
        }

        return this.default_branch.render(node, env, map, level, source_index, names);
    }
}

function getRenderRule<T>(node: T & { pos: Lexer, nodes: T[], type: number; }, format_rules: FormatRule[]) {

    const rule = format_rules[(node.type >>> 23) & 0x1FF] || 0;

    return {
        min_element_split: (rule >> FormatRule.MIN_LIST_ELE_LIMIT_SHIFT) & 0xF,
        new_line_count: (rule >> FormatRule.NEW_LINES_SHIFT) & 0xF,
        line_split_count: (rule >> FormatRule.LIST_SPLIT_SHIFT) & 0xF,
        indent_count: (rule >> FormatRule.INDENT_SHIFT) & 0xF,
        OPTIONAL_SPACE: (rule >> FormatRule.OPTIONAL_SPACE_SHIFT) & 0x1
    };
}

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
function buildRendererFromTemplateString<T>(template_pattern: string): RenderAction<T> {

    type node = T & { pos: Lexer, nodes: node[], type: number; };


    const
        regexA = /\t|\n|%|0|1|((\@)((\((\w+),([^\)]+)\s*\))|(\_)?(\w+)?(\.\.\.([^]))?(\?)?))|(\\\?|[^01\n?@%])+/g,
        regex = /\t|\n|%|0|1|(\@\((\w+),([^\)]+)\s*\))|(\@\.\.\.[^])|(\@[\w\_][\w\_]*\??)|(\@[\w]*\??)|(\\\?|[^01\n?@%])+/g,
        actions_iterator: IterableIterator<RegExpMatchArray> = template_pattern.matchAll(regex),
        actions_iteratorA: IterableIterator<RegExpMatchArray> = template_pattern.matchAll(regexA),
        actions_iteratorB: IterableIterator<RegExpMatchArray> = template_pattern.matchAll(regexA),
        action_list: Array<RenderStub<node>> = [];

    let last_index = -1;
    //*
    for (const match of actions_iteratorA) {

        const [string, , AMP, , COND_PROP, COND_PROP_NAME, COND_PROP_VAL, UNDERSCORE, PROP, SPREAD, DELIM, COND] = match;
        //*
        if (AMP == "@") {

            const CONDITIONAL = COND;

            let prop_name = (PROP && isNaN(PROP)) ? PROP : "nodes";

            const ARRAYED = !!(UNDERSCORE) || prop_name == "nodes";

            if (!isNaN(PROP)) last_index = parseInt(PROP) - 1;

            const delimiter = DELIM == "%" ? "" : DELIM;

            if (!!SPREAD) {

                const index = last_index + 1;

                action_list.push((node: node, env, level, line, map, source_index, names) => {


                    const { line_split_count, min_element_split, OPTIONAL_SPACE } = getRenderRule(node, env.format_rules),
                        nodes = node[prop_name];

                    let sub_map = map ? [] : null, len = nodes.length;

                    const strings = nodes.slice(index).map((n, i) => {

                        let child_map: number[][] = map ? [] : null;

                        const str = render(<node>n, env, child_map, source_index, names, level, node, i);

                        if (map) sub_map.push(child_map);

                        len += str.length;

                        return str;
                    }),
                        SPLIT_LINES = (line_split_count > 0 && min_element_split > 0
                            && (min_element_split < (len / 10) || nodes.length > min_element_split));

                    line += strings.length * +SPLIT_LINES;

                    if (SPLIT_LINES) {

                        const
                            space_fill = tabFill(level),
                            delim_string = ("\n").repeat(line_split_count) + space_fill,
                            dls = delimiter.length;

                        if (map) {
                            const l = sub_map.length;
                            let i = 0;
                            for (const child_map of sub_map) {
                                addNewLines(map, line_split_count);
                                addNewColumn(map, space_fill.length, source_index);
                                getLastLine(map).push(...(child_map[0] || []));
                                map.push(...child_map.slice(1));
                                if (i++ < l)
                                    addNewColumn(map, dls);
                            }
                        }

                        return { str: delim_string + strings.join(delimiter + delim_string), level, line };
                    } else {
                        const
                            delim_string = delimiter + (" ").repeat(OPTIONAL_SPACE);

                        if (map) {
                            const l = sub_map.length;
                            let i = 0;
                            for (const child_map of sub_map) {
                                getLastLine(map).push(...(child_map[0] || []));
                                map.push(...child_map.slice(1));
                                if (i++ < l)
                                    addNewColumn(map, delim_string.length);
                            }
                        }

                        return { str: strings.join(delim_string), level: -1, line };
                    }
                });
            } else if (!!COND_PROP) {

                const
                    CONDITION_PROP_NAME = COND_PROP_NAME,
                    sym = COND_PROP_VAL;

                action_list.push((node: node, env, level, line, map, source_index) => {

                    if (node[CONDITION_PROP_NAME]) {

                        if (map) addNewColumn(map, String(sym).length, source_index, node.pos.line, node.pos.column, sym);

                        return { str: String(sym), level, line };

                    } else return { str: "", level, line };

                });
            } else if (ARRAYED) {
                const index = last_index;
                const string = [...actions_iteratorB];

                action_list.push((node: node, env, level, line, map, source_index, names) => {

                    const d = string;


                    if (CONDITIONAL && !node[prop_name][index]) return { str: "", level, line, d };

                    return ({
                        str: render(node[prop_name][index], env, map, source_index, names, level, node, index),
                        line,
                        level
                    });
                });
            } else {
                action_list.push((node: node, env, level, line, map, source_index) => {

                    let str = "";

                    if (node[prop_name]) {
                        str = env.formatString(node[prop_name], prop_name, node);

                        if (map) addNewColumn(map, str.length, source_index, node.pos.line, node.pos.column, str);
                    }

                    return { str, level, line };
                });
            }
        } else
            switch (string[0]) {

                case "\n": {

                    action_list.push((node: node, env, level, line, map, source_index) => {

                        const { new_line_count } = getRenderRule(node, env.format_rules),
                            str = new_line_count > 0 ? ("\n").repeat(new_line_count) + tabFill(level) : "";

                        line += new_line_count;

                        if (map && new_line_count > 0) {
                            addNewLines(map, new_line_count);
                            addNewColumn(map, tabFill(level).length, source_index, node.pos.line, node.pos.column);
                        }

                        return { str, level, line };
                    });
                } break;
                case "%": {

                    action_list.push((node: node, env, level, line, map, source_index) => {

                        const { OPTIONAL_SPACE } = getRenderRule(node, env.format_rules),
                            str = (" ").repeat(OPTIONAL_SPACE);

                        if (map) incrementColumn(map, OPTIONAL_SPACE);

                        return { str, level, line };
                    });
                } break;

                case "1": {

                    action_list.push((node: node, env, level, line) => {

                        const { indent_count } = getRenderRule(node, env.format_rules);

                        return { str: "", level: level + indent_count, line };
                    });
                } break;

                case "0": {

                    action_list.push((node: node, env, level, line, map, source_index) => {

                        const { indent_count } = getRenderRule(node, env.format_rules),
                            REMOVE_INDENT = (indent_count && line > 0),
                            nl = REMOVE_INDENT ? ("\n") + tabFill(level - indent_count) : "";

                        line += +REMOVE_INDENT;

                        if (map && +REMOVE_INDENT) {
                            addNewLines(map, 1);
                            addNewColumn(map, tabFill(level - indent_count).length, source_index, node.pos.line, node.pos.column);
                        }

                        return { str: nl, level: level - indent_count, line };

                    });
                } break;

                default: {

                    const str = string.replace(/\\\?/, "?");

                    if (str)
                        action_list.push((node: node, env, level, line, map, source_index) => {

                            const out_str = env.formatString(str, "", node);

                            if (map) addNewColumn(map, out_str.length, source_index, node.pos.line, node.pos.column);

                            return { str: out_str, level, line };
                        });
                } break;
            }
    }

    return new RenderAction(action_list);
};

export interface NodeRenderDefinition {
    type: number;
    template_pattern?: string | object;
    format_rule?: FormatRule;
}



/**
 *   Builds a string renderer from a RenderableNodeDefinition
 *   @param node_definition
 */
function buildRenderer<T, TypeDefinition>(node_definition: NodeRenderDefinition, typeDefinitions: TypeDefinition): NodeRenderer<T> {

    /* 
        Template pattern may be an object or a string. If it is an object,
        than each key in the object represents a certain condition that is
        checked on RenderableNode that determines what type of NodeRenderer is used
        to render that version of the node.
 
        For each key in the object:
 
            1. If the key is "default", then use the value as the fallback render template for the node.
 
            2. if the key is [ $(not_{number})+ ], use the value as the render template when certain [nodes] are set to null.
 
            3. Otherwise, use the value if the property node.[key] is set to a truthy value. 
    */

    const

        template_pattern = node_definition.template_pattern,

        conditions: Array<ConditionBranch<T>> = [],

        present_vals: Array<ValuePresenceBranch<T>> = [];


    let _default: RenderAction<T> = null;

    /* Elision nodes are special cases that have a unique render action. for compatibility with cfw.js */
    //@ts-ignore
    if (node_definition.type == typeDefinitions.Elision) {

        _default = new RenderAction(

            [(n, m, level, line, map) => {

                //@ts-ignore
                if (map) addNewColumn(map, n.count, n.pos.line, n.pos.column);

                //@ts-ignore
                return { str: (",").repeat(n.count), level, line };
            }]

        );

    } else if (typeof template_pattern == "object") {


        const template_pattern_object = template_pattern;

        for (const key in template_pattern) {

            if (key == "default") {

                _default = buildRendererFromTemplateString(template_pattern_object[key]);

            } else if (key[0] == "$") {

                const flag: number = Array

                    .from(key.slice(1).matchAll(/not_(\d+)/g))

                    .reduce((r: number, m): number => r ^ (1 << (parseInt(m[1]) - 1)), 0x7FFFFFFF);

                present_vals.push({ flag, action: buildRendererFromTemplateString(template_pattern_object[key]) });

            } else

                conditions.push({ prop: key, action: buildRendererFromTemplateString(template_pattern_object[key]) });
        }


    } else
        _default = buildRendererFromTemplateString(template_pattern);

    return new NodeRenderer(conditions, present_vals, _default);
}

type NodeRenderers<T> = NodeRenderer<T>[] & { definitions: Object; };

/**
 * Creates a map of NodeRenderers  
 * 
 *  @param node_definitions
 */
export function buildRenderers<T>(node_definitions: Array<NodeRenderDefinition>, typeDefinitions: Object)
    : NodeRenderers<T> {

    const renderers: NodeRenderers<T> = Object.assign(new Array(512), { definitions: typeDefinitions });

    for (const node_definition of node_definitions) {

        const renderer = buildRenderer(node_definition, typeDefinitions);

        renderers[node_definition.type >>> node_id_bit_offset] = renderer;
    }

    return renderers;

}

export function buildFormatRules(node_definitions: Array<NodeRenderDefinition>)
    : { format_rules: FormatRule[]; } {

    const format_rules = new Array(512);

    for (const node_definition of node_definitions) {

        format_rules[node_definition.type >>> node_id_bit_offset] = node_definition.format_rule;

    }

    return { format_rules };
}

function defaultStringFormatter<T>(val: any, prop_name: string, node: T): string { return String(val); };

type CustomFormatFunction<T> = (val: any, prop_name: string, node: T) => string;
interface RenderEnvironment<T> {
    format_rules: Array<number>;
    renderers: NodeRenderers<T>;
    formatString: CustomFormatFunction<T>;
}


/**
 *  Takes a Renderable Node and produces a string comprising the rendered productions of the ast.
 * @param node - A root node
 * @param map - An optional array to store source map information.
 * @param source_index - The index of the source file to store in the source map information.
 * @param names - A Map of translation names that 
 * @param format_rules - A an array of @type {FormatRule} values.
 * @param formatString - A function that is called on primitive values to allow for syntax highlighting.
 * @param level - Internal Use - Disregard
 * @param parent - Internal Use - Disregard
 * @param index - Internal Use - Disregard
 */
export function render<T>(
    node: T & { type: number, nodes: T[], pos: Lexer; },
    env: RenderEnvironment<T>,

    //source map data
    map: Array<number[]> = null,
    source_index = -1,
    names: Map<string, number> = null,

    level = 0,
    parent = node,
    index = 0
): string {

    const type_enum = env.renderers.definitions;

    if (!node)
        throw new Error(`Unknown node type passed to render method from ${type_enum[parent.type]}.nodes[${index}]`);

    const renderer = env.renderers[node.type >>> node_id_bit_offset];

    if (!renderer)
        throw new Error(`Cannot find string renderer for node type ${type_enum[node.type]} from ${type_enum[parent.type]}.nodes[${index}]`);
    try {

        return renderer.render(node, env, level, map, source_index, names);
    } catch (e) {
        throw new Error(`Cannot render ${type_enum[node.type]} ${parent !== node ? `child of ${type_enum[parent.type]}.nodes[${index}]` : node.type}:\n ${e.message}`);
    }
}

function prepareRender<T>(
    node: T,
    renderers: NodeRenderers<T> = null,
    //source map data
    map: Array<number[]> = null,
    source_index = -1,
    names: Map<string, number> = null,

    //format rules
    format_rules: FormatRule[] = new Array(512).fill(0),
    formatString: CustomFormatFunction<T> = defaultStringFormatter,
): string {

    const env: RenderEnvironment<T> = {
        formatString: formatString || defaultStringFormatter,
        format_rules: format_rules || new Array(512).fill(0),
        renderers,
    };

    //@ts-ignore
    const str = render<T>(node, env, map, source_index, names, 0, node, 0);

    return str;
}

export function renderCompressed<T>(
    node: T,
    renderers: NodeRenderers<T> = null,
) {
    return prepareRender<T>(node, renderers);
}

export function renderWithFormatting<T>(
    node: T,
    renderers: NodeRenderers<T> = null,
    format_rules,
    formatString: CustomFormatFunction<T> = defaultStringFormatter,
) {

    return prepareRender(node, renderers, undefined, undefined, undefined, format_rules, formatString);
}

export function renderWithSourceMap<T>(
    node: T,
    renderers: NodeRenderers<T> = null,

    //source map data
    map: Array<number[]> = null,
    source_index = -1,
    names: Map<string, number> = null,
) {
    return prepareRender(node, renderers, map, source_index, names);
}

export function renderWithFormattingAndSourceMap<T>(
    node: T,
    renderers: NodeRenderers<T> = null,

    //format rules
    format_rules,
    formatString: CustomFormatFunction<T> = defaultStringFormatter,


    //source map data
    map: Array<number[]> = null,
    source_index = -1,
    names: Map<string, number> = null,
) {

    return prepareRender(node, renderers, map, source_index, names, format_rules, formatString);
}