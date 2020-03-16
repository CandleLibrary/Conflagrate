import URL from "@candlefw/url";
import { Lexer } from "@candlefw/whind";
import { encodeVLQBase64, decodeVLQBase64Array } from "./vlq_base64.js";
import { SourceMap, Segment, Line } from "./types/source_map.js";

export function createSourceMap(): SourceMap {
    return {
        version: 3,
        file: "",
        names: [],
        sourceContent: [],
        sourceRoot: "",
        sources: new Map,
        mappings: [],
        meta: {
            current_offset: 0,
            original_column: 0,
            original_line: 0,
            current_source: 0,
            original_source: 0
        }
    };
}
export function createSourceMapEntry(
    current_line,
    current_column,
    original_line,
    original_column,
    original_file_name,
    original_name,
    source_map?: SourceMap
): SourceMap {

    if (!source_map)
        source_map = createSourceMap();

    let last_line = source_map.mappings[source_map.mappings.length - 1];

    if (!last_line) {
        last_line = {
            index: 0,
            segments: []
        };

        source_map.mappings.push(last_line);
    }

    while (current_line > last_line.index) {

        last_line = {
            index: last_line.index + 1,
            segments: []
        };
        source_map.mappings.push(last_line);
    }

    let segment = <Segment>{};

    segment.column = current_column;

    let source_index = -1;

    if (original_file_name) {
        if (source_map.sources.has(original_file_name))
            source_index = source_map.sources.get(original_file_name);
        else {
            source_index = source_map.sources.size;
            source_map.sources.set(original_file_name, source_map.sources.size);
        }
    }

    if (source_index > -1) {
        segment.column = current_column;
        segment.source = source_index;
        segment.original_line = original_line;
        segment.original_column = original_column;
    }

    last_line.segments.push(<Segment>segment);

    return source_map;
};

export function createSourceMapJSON(map: SourceMap, ...content: string[]) {

    let
        source = 0,
        original_line = 0,
        original_column = 0,
        original_name = 0;

    const output = {
        version: map.version,
        file: map.file || "",
        sourceRoot: map.sourceRoot,
        sources: Array.from(map.sources.keys()),
        sourceContent: (map.sourceContent.length > 0) ? map.sourceContent : content,
        names: map.names,
        mappings: map.mappings.map(line => {

            let column = 0;

            return line.segments.map((seg, i) => {

                const segment_string_array = [];

                const column_diff = seg.column - column;
                column = seg.column;
                segment_string_array.push(encodeVLQBase64(column_diff));

                if (seg.source !== undefined) {

                    const source_diff = seg.source - source;
                    source = seg.source;
                    segment_string_array.push(encodeVLQBase64(source_diff));

                    const line_diff = seg.original_line - original_line;
                    original_line = seg.original_line;
                    segment_string_array.push(encodeVLQBase64(line_diff));

                    const original_column_diff = seg.original_column - original_column;
                    original_column = seg.original_column;
                    segment_string_array.push(encodeVLQBase64(original_column_diff));

                    if (seg.original_name) {
                        const original_name_diff = seg.original_column - original_name;
                        original_name = seg.original_column;
                        segment_string_array.push(encodeVLQBase64(original_name_diff));
                    }
                }
                return segment_string_array.join("");

            }).join(",");
        }).join(";")
    };

    return JSON.stringify(output);
}

export function decodeJSONSourceMap(source): SourceMap {
    if (typeof source == "string")
        source = <object>JSON.parse(<string>source);

    let
        name_diff = 0,
        ori_col_diff = 0,
        line_diff = 0,
        source_diff = 0;

    source.mappings = source.mappings.split(";").map(line => {

        let col_diff = 0;

        return <Line>{
            segments: line.split(",").map(segment => {

                const
                    [column, source, original_line, original_column, original_name] = decodeVLQBase64Array(segment),
                    c = (col_diff += (column || 0)),
                    s = (source_diff += (source || 0)),
                    ol = (line_diff += (original_line || 0)),
                    oc = (ori_col_diff += (original_column || 0)),
                    on = (name_diff += (original_name || 0));

                return <Segment>{
                    column: c,
                    source: s,
                    original_line: ol,
                    original_column: oc,
                    original_name: on,
                };
            })
        };
    });

    return source;
}

export function getSourceLineColumn(line: number, column: number, source: SourceMap) {

    const
        segments = source.mappings[line - 1].segments;

    let
        prev_col = segments[0].column,
        seg: Segment = null;

    for (let i = 1; i < segments.length; i++) {

        let curr_col = segments[i].column;

        if (column >= prev_col && column <= curr_col) {
            seg = segments[i - 1];
            break;
        }

        seg = segments[i];
    }

    return {
        line: seg.original_line,
        column: seg.original_column,
        source: seg.source ? source.sources[seg.source] : "",
        name: seg.original_name ? source.names[seg.original_name] : ""
    };
}

export function getPositionLexerFromJSONSourceMap(line: number, column: number, JSON_source: string): Lexer {

    if (typeof JSON_source != "string")
        throw TypeError("Expected a JSON string");

    const
        source = decodeJSONSourceMap(JSON_source),
        seg = getSourceLineColumn(line, column, source);

    let content = source.sourceContent[seg.source];

    const lex = new Lexer(content);

    lex.CHARACTERS_ONLY = true;

    while (!lex.END) {
        if (lex.line == seg.line && lex.char > seg.column) break;
        lex.next();
    }

    return lex;
};
