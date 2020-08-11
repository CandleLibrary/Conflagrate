import { addModuleToCFW } from "@candlefw/cfw";

import { filter } from "./yielders/filter.js";

import { make_replaceable } from "./yielders/replaceable.js";

import { traverse } from "./traversers/traverse.js";

import { make_skippable } from "./yielders/skippable.js";

import { double_back_traverse } from "./traversers/double_back_traverse.js";

import { extract } from "./yielders/extract_root_node.js";

import { replace, ReplaceFunction } from "./yielders/replace.js";

import { add_parent } from "./yielders/add_parent.js";

import { bit_filter } from "./yielders/bit_filter.js";

import {
    createSourceMap,
    createSourceMapJSON,
    decodeJSONSourceMap,
    getSourceLineColumn,
    getPositionLexerFromJSONSourceMap
} from "./sourcemap/source_map.js";

import { SourceMap } from "./types/source_map.js";

import { skip_root } from "./yielders/skip_root.js";

import {
    FormatRule,
    buildRenderers,
    buildFormatRules,
    renderCompressed,
    renderWithFormatting,
    renderWithSourceMap,
    renderWithFormattingAndSourceMap,
    CustomFormatFunction
} from "./render/render.js";
import { copy } from "./copy.js";


export {
    copy,
    // Source Map
    SourceMap,
    createSourceMapJSON,
    decodeJSONSourceMap,
    getSourceLineColumn,
    createSourceMap,
    getPositionLexerFromJSONSourceMap,

    //Traversal

    skip_root,
    traverse,
    double_back_traverse,
    extract,
    filter,
    make_replaceable,
    make_skippable,
    replace,
    add_parent,
    ReplaceFunction,
    bit_filter,

    //Rendering
    CustomFormatFunction,
    FormatRule,
    buildRenderers,
    buildFormatRules,
    renderCompressed,
    renderWithFormatting,
    renderWithSourceMap,
    renderWithFormattingAndSourceMap
};

addModuleToCFW({
    copy,

    // Source Map
    createSourceMapJSON,
    decodeJSONSourceMap,
    getSourceLineColumn,
    createSourceMap,
    getPositionLexerFromJSONSourceMap,

    //Traversal
    skip_root,
    traverse,
    double_back_traverse,
    extract,
    filter,
    make_replaceable,
    make_skippable,
    replace,
    add_parent,
    bit_filter,

    //Rendering
    buildRenderers,
    buildFormatRules,
    renderCompressed,
    renderWithFormatting,
    renderWithSourceMap,
    renderWithFormattingAndSourceMap
}, "conflagrate");