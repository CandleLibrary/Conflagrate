
import { ParserFactoryNext as ParserFactory } from "@candlelib/hydrocarbon";
const recognizer_initializer = (() => {
    var lookup_table;
    var sequence_lookup = new Uint8Array([123, 58, 125, 64, 63, 46, 46, 46, 92, 109, 58, 115, 111, 58, 115, 105, 58, 115, 91, 93, 44, 69, 78, 68, 95, 79, 70, 95, 80, 82, 79, 68, 85, 67, 84, 73, 79, 78, 110, 111, 116, 111, 58, 110, 105, 58, 101, 111, 114]);
    var TokenSymbol = 1;
    var action_ptr = 0;
    var TokenIdentifier = 2;
    var TokenSpace = 4;
    var TokenNewLine = 8;
    var TokenNumber = 16;
    var TokenIdentifierUnicode = 32 | TokenIdentifier;
    var TokenFullNumber = 128 | TokenNumber;
    var UNICODE_ID_CONTINUE = 32;
    var UNICODE_ID_START = 64;
    var NULL_STATE = 0;
    var STATE_ALLOW_SKIP = 1;
    var STATE_ALLOW_OUTPUT = 2;
    function getUTF8ByteLengthFromCodePoint(code_point) {
        if ((code_point) == 0) {
            return 1;
        } else if ((code_point & 0x7F) == code_point) {
            return 1;
        } else if ((code_point & 0x7FF) == code_point) {
            return 2;
        } else if ((code_point & 0xFFFF) == code_point) {
            return 3;
        } else {
            return 4;
        }
    }
    function utf8ToCodePoint(index, buffer) {
        var a = buffer[index];
        var flag = 14;
        if (a & 0x80) {
            flag = a & 0xF0;
            var b = buffer[index + 1];
            if (flag & 0xE0) {
                flag = a & 0xF8;
                var c = buffer[index + 2];
                if ((flag) == 0xF0) {
                    return ((a & 0x7) << 18) | ((b & 0x3F) << 12) | ((c & 0x3F) << 6) | (buffer[index + 3] & 0x3F);
                } else if ((flag) == 0xE0) {
                    return ((a & 0xF) << 12) | ((b & 0x3F) << 6) | (c & 0x3F);
                }
            } else if ((flag) == 0xC) {
                return ((a & 0x1F) << 6) | b & 0x3F;
            }
        } else return a;
        return 0;
    }
    function getTypeAt(code_point) {
        return (lookup_table[code_point] & 0x1F);
    }
    function createState(ENABLE_STACK_OUTPUT) {
        return STATE_ALLOW_SKIP | (ENABLE_STACK_OUTPUT << 1);
    }
    class ParserData {
        constructor(input_len_in, rules_len_in, lexer_in) {
            this.lexer = lexer_in;
            this.state = createState(1);
            this.prod = 0;
            this.VALID = false;
            this.COMPLETED = false;
            this.stack_ptr = 0;
            this.input_ptr = 0;
            this.rules_ptr = 0;
            this.input_len = input_len_in;
            this.rules_len = rules_len_in;
            this.origin_fork = 0;
            this.origin = 0;
            this.alternate = 0;
            if (input_len_in > 0) {
                this.input = new Uint8Array(input_len_in);
            };
            this.rules = new Uint16Array(rules_len_in);
            this.stash = new Uint32Array(256);
            this.stack = [];
        }
    }
    class DataRef {
        constructor(ptr_in, VALID_in, depth_in, byte_offset_in, byte_length_in, line_in) {
            this.byte_offset = byte_offset_in;
            this.byte_length = byte_length_in;
            this.line = line_in;
            this.ptr = ptr_in;
            this.VALID = VALID_in;
            this.depth = depth_in;
            this.command_offset = 0;
            this.command_block = new Uint16Array(64);
        }
    }
    var root_data = 0;
    var tip_data = 0;
    var out_array = new Array(64);
    var data_array = new Array(64);
    var fork_array = new Array(64);
    var out_array_len = 0;
    var data_array_len = 0;
    var fork_array_len = 0;
    class Lexer {
        constructor() {
            this.byte_offset = 0;
            this.byte_length = 0;
            this.token_length = 0;
            this.token_offset = 0;
            this.prev_token_offset = 0;
            this.type = 0;
            this.line = 0;
            this.current_byte = 0;
        };
        isDiscrete(data, assert_class, offset = 0, USE_UNICODE = false) {
            var type = 0;
            offset += this.byte_offset;
            if ((offset >= data.input_len)) return true;;
            var current_byte = data.input[offset];
            if ((!USE_UNICODE || current_byte < 128)) {
                type = getTypeAt(current_byte);
            } else type = getTypeAt(utf8ToCodePoint(offset, data.input));
            return (type & assert_class) == 0;
        };
        setToken(type_in, byte_length_in, token_length_in) {
            this.type = type_in;
            this.byte_length = byte_length_in;
            this.token_length = token_length_in;
        };
        getType(USE_UNICODE, data) {
            if (this.END(data)) return 0;;
            if ((this.type) == 0) {
                if ((!(USE_UNICODE) || this.current_byte < 128)) {
                    this.type = getTypeAt(this.current_byte);
                } else {
                    var code_point = utf8ToCodePoint(this.byte_offset, data.input);
                    this.byte_length = getUTF8ByteLengthFromCodePoint(code_point);
                    this.type = getTypeAt(code_point);
                }
            };
            return this.type;
        };
        isSym(USE_UNICODE, data) {
            return (!this.END(data)) && this.getType(USE_UNICODE, data) == TokenSymbol;
        };
        isNL() {
            return (this.current_byte) == 10 || (this.current_byte) == 13;

        };
        isSP(USE_UNICODE, data) {
            return (this.current_byte) == 32 || USE_UNICODE && (TokenSpace) == this.getType(USE_UNICODE, data);
        };
        isNum(data) {
            if ((this.type) == 0 || (this.type) == TokenNumber) {
                if (this.getType(false, data) == TokenNumber) {
                    var l = data.input_len;
                    var off = this.byte_offset;
                    while ((off++ < l) && 47 < data.input[off] && data.input[off] < 58) {
                        this.byte_length += 1;
                        this.token_length += 1;
                    };
                    this.type = TokenFullNumber;
                    return true;
                } else return false;
            } else return (this.type) == TokenFullNumber;

        };
        isUniID(data) {
            if (((this.type) == 0 || (this.type) == TokenIdentifier)) {
                if ((this.getType(true, data) == TokenIdentifier)) {
                    var l = data.input_len;
                    var off = this.byte_offset;
                    var prev_byte_len = this.byte_length;
                    while ((off + this.byte_length) < l) {
                        var code_point = utf8ToCodePoint(this.byte_offset + this.byte_length, data.input);
                        if ((((UNICODE_ID_START | UNICODE_ID_CONTINUE) & lookup_table[code_point]) > 0)) {
                            this.byte_length += getUTF8ByteLengthFromCodePoint(code_point);
                            prev_byte_len = this.byte_length;
                            this.token_length += 1;
                        } else {
                            break;
                        }
                    };
                    this.byte_length = prev_byte_len;
                    this.type = TokenIdentifierUnicode;
                    return true;
                } else return false;
            } else return (this.type) == TokenIdentifierUnicode;
        };
        copy() {
            var destination = new Lexer();
            var destination_ref = destination;
            destination_ref.byte_offset = this.byte_offset;
            destination_ref.byte_length = this.byte_length;
            destination_ref.token_length = this.token_length;
            destination_ref.token_offset = this.token_offset;
            destination_ref.prev_token_offset = this.prev_token_offset;
            destination_ref.line = this.line;
            destination_ref.byte_length = this.byte_length;
            destination_ref.current_byte = this.current_byte;
            return destination;

        };
        copyInPlace() {
            var destination = new Lexer();
            destination.byte_offset = this.byte_offset;
            destination.byte_length = this.byte_length;
            destination.token_length = this.token_length;
            destination.token_offset = this.token_offset;
            destination.prev_token_offset = this.prev_token_offset;
            destination.line = this.line;
            destination.byte_length = this.byte_length;
            destination.current_byte = this.current_byte;
            return destination;

        };
        sync(source) {
            this.byte_offset = source.byte_offset;
            this.byte_length = source.byte_length;
            this.token_length = source.token_length;
            this.token_offset = source.token_offset;
            this.prev_token_offset = source.prev_token_offset;
            this.line = source.line;
            this.type = source.type;
            this.current_byte = source.current_byte;
            return this;
        };
        slice(source) {
            this.byte_length = this.byte_offset - source.byte_offset;
            this.token_length = this.token_offset - source.token_offset;
            this.byte_offset = source.byte_offset;
            this.token_offset = source.token_offset;
            this.current_byte = source.current_byte;
            this.line = source.line;
            this.type = source.type;
            return this;
        };
        next(data) {
            this.byte_offset += this.byte_length;
            this.token_offset += this.token_length;
            if ((data.input_len < this.byte_offset)) {
                this.type = 0;
                this.byte_length = 0;
                this.token_length = 0;
                this.current_byte = 0;
            } else {
                this.current_byte = data.input[this.byte_offset];
                if ((this.current_byte) == 10) this.line += 1;;
                this.type = 0;
                this.byte_length = 1;
                this.token_length = 1;
            };
            return this;
        };
        END(data) {
            return this.byte_offset >= data.input_len;

        }
    }
    function compare(data, data_offset, sequence_offset, byte_length) {
        var i = data_offset;
        var j = sequence_offset;
        var len = j + byte_length;
        for (; j < len; i++, j++)
            if ((data.input[i] != sequence_lookup[j])) return j - sequence_offset;;
        return byte_length;
    }
    function cmpr_set(l, data, sequence_offset, byte_length, token_length) {
        if ((byte_length) == compare(data, l.byte_offset, sequence_offset, byte_length)) {
            l.byte_length = byte_length;
            l.token_length = token_length;
            return true;
        };
        return false;
    }
    function create_parser_data_object(input_len, rules_len) {
        var lexer = new Lexer();
        var parser_data = new ParserData(input_len, rules_len, lexer);
        return parser_data;

    }
    function fork(data) {
        var fork = create_parser_data_object(0, data.rules_len - data.rules_ptr
        );
        (tip_data).next = fork;
        tip_data = fork;
        var fork_ref = fork;
        var i = 0;
        for (; i < data.stack_ptr + 1; i++) {
            fork_ref.stash[i] = data.stash[i];
            fork_ref.stack[i] = data.stack[i];
        };
        fork_ref.stack_ptr = data.stack_ptr;
        fork_ref.input_ptr = data.input_ptr;
        fork_ref.input_len = data.input_len;
        fork_ref.origin_fork = data.rules_ptr + data.origin_fork;
        fork_ref.origin = data;
        fork_ref.lexer = (data.lexer).copy();
        fork_ref.state = data.state;
        fork_ref.prod = data.prod;
        fork_ref.input = data.input;
        while ((data.alternate)) {
            data = data.alternate;
        };
        data.alternate = fork;
        data_array[data_array_len] = fork;
        data_array_len++;
        return fork;
    }
    function assert_ascii(l, a, b, c, d) {
        var ascii = l.current_byte;
        if (ascii < 32) return ((a & (1 << ascii)) != 0); else if (ascii < 64) return ((b & (1 << (ascii - 32))) != 0); else if (ascii < 96) return ((c & (1 << (ascii - 64))) != 0); else if (ascii < 128) return ((d & (1 << (ascii - 96))) != 0);;
        return false;
    }
    function isOutputEnabled(state) {
        return NULL_STATE != (state & STATE_ALLOW_OUTPUT);
    }
    function set_action(val, data) {
        if ((data.rules_ptr > data.rules_len)) return;;
        data.rules[data.rules_ptr++] = val;
    }
    function add_reduce(state, data, sym_len, body = 0, DNP = false) {
        if (isOutputEnabled(state)) {
            var total = body + sym_len;
            if ((total) == 0) return;;
            if (body > 0xFF || sym_len > 0x1F) {
                var low = (1 << 2) | (body & 0xFFF8);
                var high = sym_len;
                set_action(low, data);
                set_action(high, data);
            } else {
                var low = ((sym_len & 0x1F) << 3) | ((body & 0xFF) << 8);
                set_action(low, data);
            }
        }
    }
    function add_shift(data, tok_len) {
        if (tok_len < 0) return;;
        if (tok_len > 0x1FFF) {
            var low = 1 | (1 << 2) | ((tok_len >> 13) & 0xFFF8);
            var high = (tok_len & 0xFFFF);
            set_action(low, data);
            set_action(high, data);
        } else {
            var low = 1 | ((tok_len << 3) & 0xFFF8);
            set_action(low, data);
        }
    }
    function add_skip(data, skip_delta) {
        if (skip_delta < 1) return;;
        if (skip_delta > 0x1FFF) {
            var low = 2 | (1 << 2) | ((skip_delta >> 13) & 0xFFF8);
            var high = (skip_delta & 0xFFFF);
            set_action(low, data);
            set_action(high, data);
        } else {
            var low = 2 | ((skip_delta << 3) & 0xFFF8);
            set_action(low, data);
        }
    }
    function convert_prod_to_token(data, prod_start) {
        var prod_end = data.rules_ptr;
        var token_len = 0;
        var i = prod_start;
        for (; i < prod_end; i++) {
            var rule = data.rules[i];
            if ((rule & 4) == 1) i++;;
            if ((rule & 3) > 0) {
                var length = (rule >> 3) & 0x1FFF;
                if ((rule & 4) == 1) length = ((length << 16) | data.rules[i]);;
                token_len += length;
            }
        };
        data.rules_ptr = prod_start;
        add_shift(data, token_len);
    }
    function mark(val, data) {
        return action_ptr;
    }
    function reset(mark, origin, advanced, state) {
        action_ptr = mark;
        advanced.sync(origin);
        return state;

    }
    function consume(l, data, state) {
        if (isOutputEnabled(state)) add_shift(data, l.token_length);;
        l.next(data);
        return true;
    }
    function pushFN(data, _fn_ref) {
        data.stack[++data.stack_ptr] = _fn_ref;
    }
    function stepKernel(data, lexer, stack_base) {
        var ptr = data.stack_ptr;
        var _fn = data.stack[ptr];
        var stash = data.stash[ptr];
        data.stack_ptr--;
        var result = _fn(lexer, data, data.state, data.prod, stash);
        data.stash[ptr] = result;
        data.stash[ptr + 1] = result;
        data.prod = result;
        if ((result < 0 || data.stack_ptr < stack_base)) {
            data.VALID = (data.lexer).END(data) && (result >= 0);
            return false;
        };
        return true;
    }
    function addDataToOutArray(data, index) {
        var i = out_array_len;
        if (i > 63) i = 63;;
        out_array_len = i + 1;
        for (; i > index; i--) {
            out_array[i] = out_array[i - 1];
        };
        out_array[index] = data;
    }
    function removeEntryFromDataArray(index) {
        data_array_len--;
        var j = index;
        for (; j < data_array_len; j++) {
            data_array[j] = data_array[j + 1];
        }
    }
    function insertData(data) {
        var in_ref = data;
        var i = 0;
        for (; i < out_array_len; i++) {
            var exist_ref = out_array[i];
            if (in_ref.VALID) {
                if ((!exist_ref.VALID)) {
                    break;
                }
            } else {
                if ((!exist_ref.VALID && (exist_ref.input_ptr < in_ref.input_ptr))) {
                    break;
                }
            }
        };
        if ((i < 64)) addDataToOutArray(data, i);
    }
    function run() {
        while ((data_array_len > 0)) {
            var i = 0;
            for (; i < data_array_len; i++) {
                var data = data_array[i];
                if ((!stepKernel(data, data.lexer, 0))) {
                    data.COMPLETED = true;
                    removeEntryFromDataArray(i--);
                    insertData(data);
                }
            }
        }
    }
    function branch_04b8ba9ae9de80ef(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  num id sym @ f:s m:s o:s o:n { i:s i:e or } ] END_OF_FILE  ]';
        '"⤋⤋⤋  peek-production-symbols ⤋⤋⤋"';
        '18:51 member_spread_group_80_0_=>τ[ • delimiter_sequence τ] [ τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s ]';
        pushFN(data, branch_778bb7d40c06f5f0);
        pushFN(data, $delimiter_sequence);
        return data.rules_ptr;
    }
    function branch_0bea948da3fbf810(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  id  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '19:54 literal_list_90=>• θid [ θid ]';
        consume(l, data, state);
        add_reduce(state, data, 1, 31);
        return prod_start;
    }
    function branch_0c9d97682b645001(l, data, state, prod, prod_start) {
        return 6;
    }
    function branch_0e736f25d2c99c6b(l, data, state, prod, prod_start) {
        'Number of end groups1 [    ]';
        'All symbols [  ? } or @ sym id num f:s m:s o:s o:n { i:s i:e END_OF_FILE END_OF_PRODUCTION  ]';
        '6:28 member_select=>τ@ θid member_select_group_64_0_ • τ? [ τ? ]';
        '6:30 member_select=>τ@ θid member_select_group_64_0_ • [ τ}, τor, τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if (l.current_byte == 63) {
            pushFN(data, branch_e5b05349fe7e0ae6);
            return branch_8e2ad15a96e5c4cb(l, data, state, prod, prod_start);
        } else {
            '"--LEAF--"';
            'Leaf [  } or @ sym id num f:s m:s o:s o:n { i:s i:e END_OF_FILE END_OF_PRODUCTION  ]';
            '"⤋⤋⤋  assert-end ⤋⤋⤋"';
            '6:30 member_select=>τ@ θid member_select_group_64_0_ • [ τ}, τor, τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
            add_reduce(state, data, 3, 14);
            return 2;
        };
        return - 1;
    }
    function branch_10d5f2cf3f7457df(l, data, state, prod, prod_start) {
        convert_prod_to_token(data, prod_start);
        add_reduce(state, data, 1, 18);
        return prod_start;
    }
    function branch_16466f4cba62e160(l, data, state, prod, prod_start) {
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if ((((l.current_byte == 125) && consume(l, data, state)))) {
            add_reduce(state, data, 9, 4);
            return prod_start;
        };
        return - 1;
    }
    function branch_1736f764c2c74ffb(l, data, state, prod, prod_start) {
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        pushFN(data, branch_ceef34c6f56b41d4);
        pushFN(data, $delimiter_sequence);
        return data.rules_ptr;
    }
    function branch_19be0f9e4cd6933b(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  sym  ]';
        '"⤋⤋⤋  assert-peek ⤋⤋⤋"';
        '19:52 literal_list_90=>• τf:s θsym [ τf:s ]';
        consume(l, data, state);
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if ((((l.isSym(true, data)) && consume(l, data, state)))) {
            add_reduce(state, data, 2, 29);
            return prod_start;
        };
        return - 1;
    }
    function branch_1aa8ee49fcb8ea2c(l, data, state, prod, prod_start) {
        'Number of end groups1 [    ]';
        'All symbols [  ? } or @ sym id num f:s m:s o:s o:n { i:s i:e END_OF_FILE END_OF_PRODUCTION  ]';
        '6:28 member_select=>τ@ θid member_select_group_64_0_ • τ? [ τ? ]';
        '6:30 member_select=>τ@ θid member_select_group_64_0_ • [ τ}, τor, τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if (l.current_byte == 63) {
            pushFN(data, branch_0c9d97682b645001);
            return branch_8e2ad15a96e5c4cb(l, data, state, prod, prod_start);
        } else {
            '"--LEAF--"';
            'Leaf [  } or @ sym id num f:s m:s o:s o:n { i:s i:e END_OF_FILE END_OF_PRODUCTION  ]';
            '"⤋⤋⤋  assert-end ⤋⤋⤋"';
            '6:30 member_select=>τ@ θid member_select_group_64_0_ • [ τ}, τor, τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
            add_reduce(state, data, 3, 14);
            return 6;
        };
        return - 1;
    }
    function branch_1b7cf8ca2c2e326f(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  id  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '9:38 literal_token=>• θid [ θid ]';
        consume(l, data, state);
        add_reduce(state, data, 1, 2);
        return prod_start;
    }
    function branch_1bc914abd67f3394(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  }  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '5:26 optional_flagged=>τ{ θid optional_flagged_group_32_0_ τ: rules • τ} [ τ} ]';
        consume(l, data, state);
        add_reduce(state, data, 6, 10);
        return prod_start;
    }
    function branch_1c506044841d35a0(l, data, state, prod, prod_start) {
        return 7;
    }
    function branch_2091b32189a54f1a(l, data, state, prod, prod_start) {
        'Number of end groups0 [    ]';
        'All symbols [  :  ]';
        '5:24 optional_flagged=>τ{ θid optional_flagged_group_32_0_ • τ: rules τor rules τ} [ τ: ]';
        '5:26 optional_flagged=>τ{ θid optional_flagged_group_32_0_ • τ: rules τ} [ τ: ]';
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if (l.current_byte == 58) {
            consume(l, data, state);
            'Number of end groups0 [    ]';
            'All symbols [  1  ]';
            '5:24 optional_flagged=>τ{ θid optional_flagged_group_32_0_ τ: • rules τor rules τ} [ τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
            '5:26 optional_flagged=>τ{ θid optional_flagged_group_32_0_ τ: • rules τ} [ τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
            pushFN(data, branch_6982ccf5c0bd78c4);
            pushFN(data, $rules);
            return data.rules_ptr;
        };
        return - 1;
    }
    function branch_236f044844390c7e(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  num  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '9:39 literal_token=>• θnum [ θnum ]';
        consume(l, data, state);
        add_reduce(state, data, 1, 2);
        return prod_start;
    }
    function branch_29f4c4eebf914875(l, data, state, prod, prod_start) {
        'Number of end groups0 [    ]';
        'All symbols [  :  ]';
        '5:20 optional_flagged=>τ{ τnot θid optional_flagged_group_32_0_ • τ: rules τor rules τ} [ τ: ]';
        '5:22 optional_flagged=>τ{ τnot θid optional_flagged_group_32_0_ • τ: rules τ} [ τ: ]';
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if (l.current_byte == 58) {
            consume(l, data, state);
            'Number of end groups0 [    ]';
            'All symbols [  1  ]';
            '5:20 optional_flagged=>τ{ τnot θid optional_flagged_group_32_0_ τ: • rules τor rules τ} [ τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
            '5:22 optional_flagged=>τ{ τnot θid optional_flagged_group_32_0_ τ: • rules τ} [ τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
            pushFN(data, branch_ca5d46c9c06f05e1);
            pushFN(data, $rules);
            return data.rules_ptr;
        };
        return - 1;
    }
    function branch_2a528cf79d742e58(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  or  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '5:20 optional_flagged=>τ{ τnot θid optional_flagged_group_32_0_ τ: rules • τor rules τ} [ τor ]';
        consume(l, data, state);
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        pushFN(data, branch_16466f4cba62e160);
        pushFN(data, $rules);
        return data.rules_ptr;
    }
    function branch_2a82c27f5e58b682(l, data, state, prod, prod_start) {
        'Number of end groups0 [    ]';
        'All symbols [  or }  ]';
        '5:21 optional_flagged=>τ{ τnot θid τ: rules • τor rules τ} [ τor ]';
        '5:23 optional_flagged=>τ{ τnot θid τ: rules • τ} [ τ} ]';
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if (cmpr_set(l, data, 47, 2, 2)) {
            pushFN(data, branch_fbc20da8ba6cdd60);
            return branch_5b506031ac3bf9fc(l, data, state, prod, prod_start);
        } else if (l.current_byte == 125) {
            pushFN(data, branch_fbc20da8ba6cdd60);
            return branch_e4e02020312b47fb(l, data, state, prod, prod_start);
        };
        return - 1;
    }
    function branch_300ae9aaa952da0b(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  num  ]';
        '"⤋⤋⤋  assert-peek-vp ⤋⤋⤋"';
        '19:60 literal_list_90=>literal_list_90 • θnum [ θnum ]';
        consume(l, data, state);
        add_reduce(state, data, 2, 32);
        return prod_start;
    }
    function branch_31e5f4c1b867dc18(l, data, state, prod, prod_start) {
        pushFN(data, $rules_goto);
        return 1;
    }
    function branch_33eb10e464a746f5(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  f:s  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '8:35 literal=>• τf:s literal_list_90 [ τf:s ]';
        consume(l, data, state);
        pushFN(data, branch_3d873818c51f1d96);
        pushFN(data, $literal_list_90);
        return data.rules_ptr;
    }
    function branch_3951b91d4b3ba9c0(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  sym  ]';
        '"⤋⤋⤋  assert-peek-vp ⤋⤋⤋"';
        '9:37 literal_token=>literal_token • θsym [ θsym ]';
        consume(l, data, state);
        add_reduce(state, data, 2, 3);
        return prod_start;
    }
    function branch_39b2426793e4ffe8(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  id  ]';
        '"⤋⤋⤋  assert-peek ⤋⤋⤋"';
        '19:57 literal_list_90=>• τf:s θid [ τf:s ]';
        consume(l, data, state);
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if ((((l.isUniID(data)) && consume(l, data, state)))) {
            add_reduce(state, data, 2, 29);
            return prod_start;
        };
        return - 1;
    }
    function branch_3d873818c51f1d96(l, data, state, prod, prod_start) {
        add_reduce(state, data, 2, 19);
        return prod_start;
    }
    function branch_428dc7b9fe62a6a5(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  num  ]';
        '"⤋⤋⤋  assert-peek-vp ⤋⤋⤋"';
        '9:41 literal_token=>literal_token • θnum [ θnum ]';
        consume(l, data, state);
        add_reduce(state, data, 2, 3);
        return prod_start;
    }
    function branch_42d12d281048de17(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  ?  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '6:29 member_select=>τ@ θid • τ? [ τ? ]';
        consume(l, data, state);
        add_reduce(state, data, 3, 13);
        return prod_start;
    }
    function branch_4892fc240550f9dd(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  @ sym id num f:s m:s o:s o:n { i:s i:e  ]';
        '"⤋⤋⤋  peek-production-symbols ⤋⤋⤋"';
        '1:2 rules=>rules • rule [ τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
        pushFN(data, branch_d8b88c4564c36010);
        pushFN(data, $rule);
        return data.rules_ptr;
    }
    function branch_48f7098c6b996866(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  } or @ sym id num f:s m:s o:s o:n { i:s i:e END_OF_FILE  ]';
        '"⤋⤋⤋  assert-peek ⤋⤋⤋"';
        '7:33 member_spread=>τ@ θid • τ... [ τ... ]';
        consume(l, data, state);
        add_reduce(state, data, 3, 17);
        return prod_start;
    }
    function branch_49ad9d404a04d2f8(l, data, state, prod, prod_start) {
        add_reduce(state, data, 1, 1);
        return 0;
    }
    function branch_53834bf3ecfdeb43(l, data, state, prod, prod_start) {
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if ((((l.current_byte == 125) && consume(l, data, state)))) {
            add_reduce(state, data, 8, 5);
            return prod_start;
        };
        return - 1;
    }
    function branch_563965b4ddf3944c(l, data, state, prod, prod_start) {
        add_reduce(state, data, 1, 2);
        pushFN(data, $rules_goto);
        return 1;
    }
    function branch_5ab43fca4edcabf1(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  m:s  ]';
        '"⤋⤋⤋  peek-production-symbols ⤋⤋⤋"';
        '4:16 delimiter_items=>• mandatory_space [ τm:s ]';
        pushFN(data, branch_a02a770eec4af430);
        pushFN(data, $mandatory_space);
        return data.rules_ptr;
    }
    function branch_5abb008d2a3e6ab8(l, data, state, prod, prod_start) {
        add_reduce(state, data, 1, 2);
        pushFN(data, $delimiter_sequence_goto);
        return 3;
    }
    function branch_5b506031ac3bf9fc(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  or  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '5:21 optional_flagged=>τ{ τnot θid τ: rules • τor rules τ} [ τor ]';
        consume(l, data, state);
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        pushFN(data, branch_53834bf3ecfdeb43);
        pushFN(data, $rules);
        return data.rules_ptr;
    }
    function branch_5e5beb64df451473(l, data, state, prod, prod_start) {
        add_reduce(state, data, 4, 16);
        return prod_start;
    }
    function branch_60754a6e74fc0bfc(l, data, state, prod, prod_start) {
        return 4;
    }
    function branch_6078b37309b48400(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  o:s m:s o:n sym id num f:s  ]';
        '"⤋⤋⤋  peek-production-symbols ⤋⤋⤋"';
        '3:14 delimiter_sequence=>delimiter_sequence • delimiter_items [ τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s ]';
        pushFN(data, branch_d8b88c4564c36010);
        pushFN(data, $delimiter_items);
        return data.rules_ptr;
    }
    function branch_6982ccf5c0bd78c4(l, data, state, prod, prod_start) {
        'Number of end groups0 [    ]';
        'All symbols [  or }  ]';
        '5:24 optional_flagged=>τ{ θid optional_flagged_group_32_0_ τ: rules • τor rules τ} [ τor ]';
        '5:26 optional_flagged=>τ{ θid optional_flagged_group_32_0_ τ: rules • τ} [ τ} ]';
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if (cmpr_set(l, data, 47, 2, 2)) {
            pushFN(data, branch_fbc20da8ba6cdd60);
            return branch_c6a48cc329500138(l, data, state, prod, prod_start);
        } else if (l.current_byte == 125) {
            pushFN(data, branch_fbc20da8ba6cdd60);
            return branch_1bc914abd67f3394(l, data, state, prod, prod_start);
        };
        return - 1;
    }
    function branch_762f31abff344055(l, data, state, prod, prod_start) {
        pushFN(data, $delimiter_sequence_goto);
        return 3;
    }
    function branch_778bb7d40c06f5f0(l, data, state, prod, prod_start) {
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if ((((l.current_byte == 93) && consume(l, data, state)))) {
            add_reduce(state, data, 3, 28);
            return prod_start;
        };
        return - 1;
    }
    function branch_7e6849341e46cd34(l, data, state, prod, prod_start) {
        pushFN(data, $literal_list_90_goto);
        return 19;
    }
    function branch_84ba1354e8aad795(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  }  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '5:22 optional_flagged=>τ{ τnot θid optional_flagged_group_32_0_ τ: rules • τ} [ τ} ]';
        consume(l, data, state);
        add_reduce(state, data, 7, 6);
        return prod_start;
    }
    function branch_89343746d55d884a(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  id  ]';
        '"⤋⤋⤋  assert-peek-vp ⤋⤋⤋"';
        '19:59 literal_list_90=>literal_list_90 • θid [ θid ]';
        consume(l, data, state);
        add_reduce(state, data, 2, 32);
        return prod_start;
    }
    function branch_8b7d703256f62225(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  num  ]';
        '"⤋⤋⤋  assert-peek-vp ⤋⤋⤋"';
        '19:63 literal_list_90=>literal_list_90 • τf:s θnum [ τf:s ]';
        consume(l, data, state);
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if ((((l.isNum(data)) && consume(l, data, state)))) {
            add_reduce(state, data, 3, 30);
            return prod_start;
        };
        return - 1;
    }
    function branch_8bd5edca03a09e64(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  num  ]';
        '"⤋⤋⤋  assert-peek ⤋⤋⤋"';
        '19:58 literal_list_90=>• τf:s θnum [ τf:s ]';
        consume(l, data, state);
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if ((((l.isNum(data)) && consume(l, data, state)))) {
            add_reduce(state, data, 2, 29);
            return prod_start;
        };
        return - 1;
    }
    function branch_8d2b6fa8570dd919(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  id  ]';
        '"⤋⤋⤋  assert-peek-vp ⤋⤋⤋"';
        '9:40 literal_token=>literal_token • θid [ θid ]';
        consume(l, data, state);
        add_reduce(state, data, 2, 3);
        return prod_start;
    }
    function branch_8e2ad15a96e5c4cb(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  ?  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '6:28 member_select=>τ@ θid member_select_group_64_0_ • τ? [ τ? ]';
        consume(l, data, state);
        add_reduce(state, data, 4, 12);
        return prod_start;
    }
    function branch_94e896064dab122b(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  sym  ]';
        '"⤋⤋⤋  assert-peek-vp ⤋⤋⤋"';
        '19:61 literal_list_90=>literal_list_90 • θsym [ θsym ]';
        consume(l, data, state);
        add_reduce(state, data, 2, 32);
        return prod_start;
    }
    function branch_964bf512fd03c7dd(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  or  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '5:25 optional_flagged=>τ{ θid τ: rules • τor rules τ} [ τor ]';
        consume(l, data, state);
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        pushFN(data, branch_ec0ea2cccb199a0b);
        pushFN(data, $rules);
        return data.rules_ptr;
    }
    function branch_99d0131b024d331a(l, data, state, prod, prod_start) {
        return 18;
    }
    function branch_9cc82f267f77aa54(l, data, state, prod, prod_start) {
        pushFN(data, $literal_token_goto);
        return 9;
    }
    function branch_a02a770eec4af430(l, data, state, prod, prod_start) {
        return prod_start;
    }
    function branch_a8e0917141cd0427(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  sym id num f:s  ]';
        '"⤋⤋⤋  peek-production-symbols ⤋⤋⤋"';
        '4:19 delimiter_items=>• literal [ θsym, θid, θnum, τf:s ]';
        pushFN(data, branch_a02a770eec4af430);
        pushFN(data, $literal);
        return data.rules_ptr;
    }
    function branch_b25dbc2457ef69ab(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  }  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '5:27 optional_flagged=>τ{ θid τ: rules • τ} [ τ} ]';
        consume(l, data, state);
        add_reduce(state, data, 5, 11);
        return prod_start;
    }
    function branch_b675ee6c6273e548(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  ,  ]';
        '"⤋⤋⤋  peek-production-symbols ⤋⤋⤋"';
        '18:50 member_spread_group_80_0_=>τ[ • member_spread_group_80_0__group_129_0_ delimiter_sequence τ] [ θnum ]';
        pushFN(data, branch_1736f764c2c74ffb);
        pushFN(data, $member_spread_group_80_0__group_129_0_);
        return data.rules_ptr;
    }
    function branch_c093568304f24c09(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  num  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '19:55 literal_list_90=>• θnum [ θnum ]';
        consume(l, data, state);
        add_reduce(state, data, 1, 31);
        return prod_start;
    }
    function branch_c4273563b8b7bea6(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  o:s m:s o:n sym id f:s  ]';
        '"⤋⤋⤋  peek-production-symbols ⤋⤋⤋"';
        '18:51 member_spread_group_80_0_=>τ[ • delimiter_sequence τ] [ τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s ]';
        pushFN(data, branch_778bb7d40c06f5f0);
        pushFN(data, $delimiter_sequence);
        return data.rules_ptr;
    }
    function branch_c6a48cc329500138(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  or  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '5:24 optional_flagged=>τ{ θid optional_flagged_group_32_0_ τ: rules • τor rules τ} [ τor ]';
        consume(l, data, state);
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        pushFN(data, branch_d637a75e3022d2da);
        pushFN(data, $rules);
        return data.rules_ptr;
    }
    function branch_ca5d46c9c06f05e1(l, data, state, prod, prod_start) {
        'Number of end groups0 [    ]';
        'All symbols [  or }  ]';
        '5:20 optional_flagged=>τ{ τnot θid optional_flagged_group_32_0_ τ: rules • τor rules τ} [ τor ]';
        '5:22 optional_flagged=>τ{ τnot θid optional_flagged_group_32_0_ τ: rules • τ} [ τ} ]';
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if (cmpr_set(l, data, 47, 2, 2)) {
            pushFN(data, branch_fbc20da8ba6cdd60);
            return branch_2a528cf79d742e58(l, data, state, prod, prod_start);
        } else if (l.current_byte == 125) {
            pushFN(data, branch_fbc20da8ba6cdd60);
            return branch_84ba1354e8aad795(l, data, state, prod, prod_start);
        };
        return - 1;
    }
    function branch_cbf7f9db4a285300(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  sym  ]';
        '"⤋⤋⤋  assert-peek-vp ⤋⤋⤋"';
        '19:53 literal_list_90=>literal_list_90 • τf:s θsym [ τf:s ]';
        consume(l, data, state);
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if ((((l.isSym(true, data)) && consume(l, data, state)))) {
            add_reduce(state, data, 3, 30);
            return prod_start;
        };
        return - 1;
    }
    function branch_ceef34c6f56b41d4(l, data, state, prod, prod_start) {
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if ((((l.current_byte == 93) && consume(l, data, state)))) {
            add_reduce(state, data, 4, 27);
            return prod_start;
        };
        return - 1;
    }
    function branch_d637a75e3022d2da(l, data, state, prod, prod_start) {
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if ((((l.current_byte == 125) && consume(l, data, state)))) {
            add_reduce(state, data, 8, 8);
            return prod_start;
        };
        return - 1;
    }
    function branch_d8b88c4564c36010(l, data, state, prod, prod_start) {
        add_reduce(state, data, 2, 3);
        return prod_start;
    }
    function branch_db9be5e1e028be87(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  o:s  ]';
        '"⤋⤋⤋  peek-production-symbols ⤋⤋⤋"';
        '4:15 delimiter_items=>• optional_space [ τo:s ]';
        pushFN(data, branch_a02a770eec4af430);
        pushFN(data, $optional_space);
        return data.rules_ptr;
    }
    function branch_dd48e99aebc2b79a(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  id  ]';
        '"⤋⤋⤋  assert-peek-vp ⤋⤋⤋"';
        '19:62 literal_list_90=>literal_list_90 • τf:s θid [ τf:s ]';
        consume(l, data, state);
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if ((((l.isUniID(data)) && consume(l, data, state)))) {
            add_reduce(state, data, 3, 30);
            return prod_start;
        };
        return - 1;
    }
    function branch_ded893b92fe51418(l, data, state, prod, prod_start) {
        return 8;
    }
    function branch_dfbf38884c8c151a(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  [  ]';
        '"⤋⤋⤋  peek-production-symbols ⤋⤋⤋"';
        '7:32 member_spread=>τ@ θid τ... • member_spread_group_80_0_ [ τ[ ]';
        pushFN(data, branch_5e5beb64df451473);
        pushFN(data, $member_spread_group_80_0_);
        return data.rules_ptr;
    }
    function branch_e273573036c81352(l, data, state, prod, prod_start) {
        'Number of end groups0 [    ]';
        'All symbols [  or }  ]';
        '5:25 optional_flagged=>τ{ θid τ: rules • τor rules τ} [ τor ]';
        '5:27 optional_flagged=>τ{ θid τ: rules • τ} [ τ} ]';
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if (cmpr_set(l, data, 47, 2, 2)) {
            pushFN(data, branch_fbc20da8ba6cdd60);
            return branch_964bf512fd03c7dd(l, data, state, prod, prod_start);
        } else if (l.current_byte == 125) {
            pushFN(data, branch_fbc20da8ba6cdd60);
            return branch_b25dbc2457ef69ab(l, data, state, prod, prod_start);
        };
        return - 1;
    }
    function branch_e4e02020312b47fb(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  }  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '5:23 optional_flagged=>τ{ τnot θid τ: rules • τ} [ τ} ]';
        consume(l, data, state);
        add_reduce(state, data, 6, 7);
        return prod_start;
    }
    function branch_e5b05349fe7e0ae6(l, data, state, prod, prod_start) {
        return 2;
    }
    function branch_e708bec395c57551(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  sym  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '19:56 literal_list_90=>• θsym [ θsym ]';
        consume(l, data, state);
        add_reduce(state, data, 1, 31);
        return prod_start;
    }
    function branch_ec0ea2cccb199a0b(l, data, state, prod, prod_start) {
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if ((((l.current_byte == 125) && consume(l, data, state)))) {
            add_reduce(state, data, 7, 9);
            return prod_start;
        };
        return - 1;
    }
    function branch_f9e4b8c30f5a8653(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  sym  ]';
        '"⤋⤋⤋  assert ⤋⤋⤋"';
        '9:36 literal_token=>• θsym [ θsym ]';
        consume(l, data, state);
        add_reduce(state, data, 1, 2);
        return prod_start;
    }
    function branch_f9ee2df559b2ded9(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  sym id num  ]';
        '"⤋⤋⤋  peek-production-symbols ⤋⤋⤋"';
        '8:34 literal=>• tk:literal_token [ θsym, θid, θnum ]';
        pushFN(data, branch_10d5f2cf3f7457df);
        pushFN(data, $literal_token);
        return data.rules_ptr;
    }
    function branch_fbc20da8ba6cdd60(l, data, state, prod, prod_start) {
        return 5;
    }
    function branch_ff3d315343437021(l, data, state, prod, prod_start) {
        '"--LEAF--"';
        'Leaf [  [  ]';
        '"⤋⤋⤋  assert-peek ⤋⤋⤋"';
        '7:32 member_spread=>τ@ θid • τ... member_spread_group_80_0_ [ τ... ]';
        consume(l, data, state);
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        pushFN(data, branch_5e5beb64df451473);
        pushFN(data, $member_spread_group_80_0_);
        return data.rules_ptr;
    }
    function dt_b8280b824a69d9e3(l, data) {
        if (3 == compare(data, l.byte_offset + 0, 12, 3)) {
            l.setToken(TokenSymbol, 3, 3);
            return true;
        } else if (3 == compare(data, l.byte_offset + 0, 41, 3)) {
            l.setToken(TokenSymbol, 3, 3);
            return true;
        };
        return false;
    }
    function dt_c64037090c64ac78(l, data) {
        if (3 == compare(data, l.byte_offset + 0, 15, 3)) {
            l.setToken(TokenSymbol, 3, 3);
            return true;
        } else if (3 == compare(data, l.byte_offset + 0, 44, 3)) {
            l.setToken(TokenSymbol, 3, 3);
            return true;
        };
        return false;
    }
    function dt_c6d4f430d0cb402e(l, data) {
        if (2 == compare(data, l.byte_offset + 0, 47, 2)) {
            l.setToken(TokenSymbol, 2, 2);
            return true;
        } else if (3 == compare(data, l.byte_offset + 0, 12, 3)) {
            l.setToken(TokenSymbol, 3, 3);
            return true;
        } else if (3 == compare(data, l.byte_offset + 0, 41, 3)) {
            l.setToken(TokenSymbol, 3, 3);
            return true;
        };
        return false;
    }
    function skip_27d8e42c3256622b(l, data, state) {
        if ((state) == NULL_STATE) return;;
        var off = l.token_offset;
        while (1) {
            if (!(l.isNL() || l.isSP(true, data))) {
                break;
            };
            l.next(data);
        };
        if (isOutputEnabled(state)) add_skip(data, l.token_offset - off);
    }
    function skip_6725b1140c2474a9(l, data, state) {
        if ((state) == NULL_STATE) return;;
        var off = l.token_offset;
        while (1) {
            if (!(l.isNL())) {
                break;
            };
            l.next(data);
        };
        if (isOutputEnabled(state)) add_skip(data, l.token_offset - off);
    }
    function sym_map_4fb65a3b6df1029d(l, data) {
        if (data.input[l.byte_offset + 0] == 93) {
            l.setToken(TokenSymbol, 1, 1);
            return 0;
        } else if (data.input[l.byte_offset + 0] == 111) {
            if (data.input[l.byte_offset + 1] == 114) {
                if (l.isDiscrete(data, TokenIdentifier, 2)) {
                    l.setToken(TokenSymbol, 2, 2);
                    return 0;
                }
            } else if (data.input[l.byte_offset + 1] == 58) {
                if (data.input[l.byte_offset + 2] == 115) {
                    l.setToken(TokenSymbol, 3, 3);
                    return 0;
                } else if (data.input[l.byte_offset + 2] == 110) {
                    l.setToken(TokenSymbol, 3, 3);
                    return 0;
                }
            }
        } else if (data.input[l.byte_offset + 0] == 109) {
            if (data.input[l.byte_offset + 1] == 58) {
                if (data.input[l.byte_offset + 2] == 115) {
                    l.setToken(TokenSymbol, 3, 3);
                    return 0;
                }
            }
        } else if (data.input[l.byte_offset + 0] == 92) {
            l.setToken(TokenSymbol, 1, 1);
            return 0;
        } else if (data.input[l.byte_offset + 0] == 64) {
            l.setToken(TokenSymbol, 1, 1);
            return 0;
        } else if (data.input[l.byte_offset + 0] == 125) {
            l.setToken(TokenSymbol, 1, 1);
            return 0;
        } else if (data.input[l.byte_offset + 0] == 123) {
            l.setToken(TokenSymbol, 1, 1);
            return 0;
        } else if (data.input[l.byte_offset + 0] == 105) {
            if (data.input[l.byte_offset + 1] == 58) {
                if (data.input[l.byte_offset + 2] == 115) {
                    l.setToken(TokenSymbol, 3, 3);
                    return 0;
                } else if (data.input[l.byte_offset + 2] == 101) {
                    l.setToken(TokenSymbol, 3, 3);
                    return 0;
                }
            }
        } else if (data.input[l.byte_offset + 0] == 69) {
            if (data.input[l.byte_offset + 1] == 78) {
                if (data.input[l.byte_offset + 2] == 68) {
                    if (data.input[l.byte_offset + 3] == 95) {
                        if (data.input[l.byte_offset + 4] == 79) {
                            if (data.input[l.byte_offset + 5] == 70) {
                                if (data.input[l.byte_offset + 6] == 95) {
                                    if (data.input[l.byte_offset + 7] == 80) {
                                        if (data.input[l.byte_offset + 8] == 82) {
                                            if (data.input[l.byte_offset + 9] == 79) {
                                                if (data.input[l.byte_offset + 10] == 68) {
                                                    if (data.input[l.byte_offset + 11] == 85) {
                                                        if (data.input[l.byte_offset + 12] == 67) {
                                                            if (data.input[l.byte_offset + 13] == 84) {
                                                                if (data.input[l.byte_offset + 14] == 73) {
                                                                    if (data.input[l.byte_offset + 15] == 79) {
                                                                        if (data.input[l.byte_offset + 16] == 78) {
                                                                            if (l.isDiscrete(data, TokenIdentifier, 17)) {
                                                                                l.setToken(TokenSymbol, 17, 17);
                                                                                return 0;
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };
        if (l.isSym(true, data)) {
            return 1;
        } else if (l.isUniID(data)) {
            return 1;
        } else if (l.isNum(data)) {
            return 1;
        } else if (l.END(data)) {
            return 1;
        };
        return - 1;
    }
    function sym_map_53777c4d3b10aaff(l, data) {
        if (data.input[l.byte_offset + 0] == 92) {
            l.setToken(TokenSymbol, 1, 1);
            return 7;
        } else if (data.input[l.byte_offset + 0] == 105) {
            if (data.input[l.byte_offset + 1] == 58) {
                if (data.input[l.byte_offset + 2] == 101) {
                    l.setToken(TokenSymbol, 3, 3);
                    return 6;
                } else if (data.input[l.byte_offset + 2] == 115) {
                    l.setToken(TokenSymbol, 3, 3);
                    return 5;
                }
            }
        } else if (data.input[l.byte_offset + 0] == 123) {
            l.setToken(TokenSymbol, 1, 1);
            return 4;
        } else if (data.input[l.byte_offset + 0] == 111) {
            if (data.input[l.byte_offset + 1] == 58) {
                if (data.input[l.byte_offset + 2] == 110) {
                    l.setToken(TokenSymbol, 3, 3);
                    return 3;
                } else if (data.input[l.byte_offset + 2] == 115) {
                    l.setToken(TokenSymbol, 3, 3);
                    return 2;
                }
            }
        } else if (data.input[l.byte_offset + 0] == 109) {
            if (2 == compare(data, l.byte_offset + 1, 10, 2)) {
                l.setToken(TokenSymbol, 3, 3);
                return 1;
            }
        } else if (data.input[l.byte_offset + 0] == 64) {
            l.setToken(TokenSymbol, 1, 1);
            return 0;
        };
        if (l.isNum(data)) {
            return 7;
        } else if (l.isUniID(data)) {
            return 7;
        } else if (l.isSym(true, data)) {
            return 7;
        };
        return - 1;
    }
    function $render(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        '"--LEAF--"';
        'Leaf [  @ sym id num f:s m:s o:s o:n { i:s i:e  ]';
        '"⤋⤋⤋  assert-production-symbols ⤋⤋⤋"';
        '0:0 render=>• rules [ τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
        pushFN(data, branch_49ad9d404a04d2f8);
        pushFN(data, $rules);
        return data.rules_ptr;
        return - 1;
    }
    function $rules(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        '"--LEAF--"';
        'Leaf [  @ sym id num f:s m:s o:s o:n { i:s i:e  ]';
        '"⤋⤋⤋  assert-production-symbols ⤋⤋⤋"';
        '1:1 rules=>• rule [ τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
        pushFN(data, branch_563965b4ddf3944c);
        pushFN(data, $rule);
        return data.rules_ptr;
        return - 1;
    }
    function $rules_goto(l, data, state, prod, prod_start) {
        debugger;
        while (1) {
            switch (prod) {
                case 1:
                    {
                        'Number of end groups0 [    ]';
                        'All symbols [  @ sym id num f:s m:s o:s o:n { i:s i:e  ]';
                        '1:2 rules=>rules • rule [ τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
                        '0:0 render=>rules • [  ]';
                        '5:20 optional_flagged=>τ{ τnot θid optional_flagged_group_32_0_ τ: rules • τor rules τ} [ τor ]';
                        '5:21 optional_flagged=>τ{ τnot θid τ: rules • τor rules τ} [ τor ]';
                        '5:24 optional_flagged=>τ{ θid optional_flagged_group_32_0_ τ: rules • τor rules τ} [ τor ]';
                        '5:25 optional_flagged=>τ{ θid τ: rules • τor rules τ} [ τor ]';
                        '5:20 optional_flagged=>τ{ τnot θid optional_flagged_group_32_0_ τ: rules τor rules • τ} [ τ} ]';
                        '5:21 optional_flagged=>τ{ τnot θid τ: rules τor rules • τ} [ τ} ]';
                        '5:22 optional_flagged=>τ{ τnot θid optional_flagged_group_32_0_ τ: rules • τ} [ τ} ]';
                        '5:23 optional_flagged=>τ{ τnot θid τ: rules • τ} [ τ} ]';
                        '5:24 optional_flagged=>τ{ θid optional_flagged_group_32_0_ τ: rules τor rules • τ} [ τ} ]';
                        '5:25 optional_flagged=>τ{ θid τ: rules τor rules • τ} [ τ} ]';
                        '5:26 optional_flagged=>τ{ θid optional_flagged_group_32_0_ τ: rules • τ} [ τ} ]';
                        '5:27 optional_flagged=>τ{ θid τ: rules • τ} [ τ} ]';
                        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                        if (cmpr_set(l, data, 47, 2, 2) || cmpr_set(l, data, 21, 17, 17) || l.current_byte == 125) {
                            return 1;
                        };
                        if (cmpr_set(l, data, 9, 3, 3) || dt_b8280b824a69d9e3(l, data) || dt_c64037090c64ac78(l, data) || assert_ascii(l, 0x0, 0x0, 0x10000001, 0x8000000) || l.isUniID(data) || l.isNum(data) || l.isSym(true, data)) {
                            pushFN(data, branch_31e5f4c1b867dc18);
                            return branch_4892fc240550f9dd(l, data, state, prod, prod_start);
                        }
                    }
            };
            break;
        };
        return (prod == 1) ? prod : - 1;
    }
    function $rule(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  @ m:s o:s o:n { i:s i:e sym id num f:s  ]';
        '2:3 rule=>• member_select [ τ@ ]';
        '2:4 rule=>• member_spread [ τ@ ]';
        '2:5 rule=>• literal [ θsym, θid, θnum, τf:s ]';
        '2:6 rule=>• mandatory_space [ τm:s ]';
        '2:7 rule=>• optional_space [ τo:s ]';
        '2:8 rule=>• optional_newline [ τo:n ]';
        '2:9 rule=>• mandatory_newline [ τo:n ]';
        '2:10 rule=>• optional_flagged [ τ{ ]';
        '2:11 rule=>• indent_start [ τi:s ]';
        '2:12 rule=>• indent_end [ τi:e ]';
        switch (sym_map_53777c4d3b10aaff(l, data)) {
            case 0:
                {
                    'Number of end groups0 [    ]';
                    'All symbols [  id  ]';
                    '2:3 rule=>• member_select [ τ@ ]';
                    '2:4 rule=>• member_spread [ τ@ ]';
                    var pk = l.copyInPlace();
                    skip_27d8e42c3256622b(pk.next(data), data, STATE_ALLOW_SKIP);
                    if (pk.isUniID(data)) {
                        consume(l, data, state);
                        '"⤋⤋⤋  post-peek-consume ⤋⤋⤋"';
                        'Number of end groups0 [    ]';
                        'All symbols [  @  ]';
                        '6:28 member_select=>• τ@ θid member_select_group_64_0_ τ? [ τ@ ]';
                        '6:29 member_select=>• τ@ θid τ? [ τ@ ]';
                        '6:30 member_select=>• τ@ θid member_select_group_64_0_ [ τ@ ]';
                        '6:31 member_select=>• τ@ θid [ τ@ ]';
                        '7:32 member_spread=>• τ@ θid τ... member_spread_group_80_0_ [ τ@ ]';
                        '7:33 member_spread=>• τ@ θid τ... [ τ@ ]';
                        'Number of end groups0 [    ]';
                        'All symbols [  id  ]';
                        '6:28 member_select=>τ@ • θid member_select_group_64_0_ τ? [ θid ]';
                        '6:29 member_select=>τ@ • θid τ? [ θid ]';
                        '6:30 member_select=>τ@ • θid member_select_group_64_0_ [ θid ]';
                        '6:31 member_select=>τ@ • θid [ θid ]';
                        '7:32 member_spread=>τ@ • θid τ... member_spread_group_80_0_ [ θid ]';
                        '7:33 member_spread=>τ@ • θid τ... [ θid ]';
                        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                        if (l.isUniID(data)) {
                            consume(l, data, state);
                            'Number of end groups1 [    ]';
                            'All symbols [  [ ? ... } or @ sym id num f:s m:s o:s o:n { i:s i:e END_OF_FILE END_OF_PRODUCTION  ]';
                            '6:28 member_select=>τ@ θid • member_select_group_64_0_ τ? [ τ[ ]';
                            '6:30 member_select=>τ@ θid • member_select_group_64_0_ [ τ[ ]';
                            '6:29 member_select=>τ@ θid • τ? [ τ? ]';
                            '6:31 member_select=>τ@ θid • [ τ}, τor, τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
                            '7:32 member_spread=>τ@ θid • τ... member_spread_group_80_0_ [ τ... ]';
                            '7:33 member_spread=>τ@ θid • τ... [ τ... ]';
                            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                            if (l.current_byte == 91) {
                                'Number of end groups0 [    ]';
                                'All symbols [  17  ]';
                                '6:28 member_select=>τ@ θid • member_select_group_64_0_ τ? [ τ[ ]';
                                '6:30 member_select=>τ@ θid • member_select_group_64_0_ [ τ[ ]';
                                skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                                pushFN(data, branch_0e736f25d2c99c6b);
                                pushFN(data, $member_select_group_64_0_);
                                return data.rules_ptr;
                            } else if (l.current_byte == 63) {
                                pushFN(data, branch_e5b05349fe7e0ae6);
                                return branch_42d12d281048de17(l, data, state, prod, prod_start);
                            } else if (cmpr_set(l, data, 5, 3, 3)) {
                                'Number of end groups0 [    ]';
                                'All symbols [  [ } or @ sym id num f:s m:s o:s o:n { i:s i:e END_OF_FILE  ]';
                                '7:32 member_spread=>τ@ θid • τ... member_spread_group_80_0_ [ τ... ]';
                                '7:33 member_spread=>τ@ θid • τ... [ τ... ]';
                                var pk = l.copyInPlace();
                                skip_27d8e42c3256622b(pk.next(data), data, STATE_ALLOW_SKIP);
                                if (pk.current_byte == 91) {
                                    pushFN(data, branch_e5b05349fe7e0ae6);
                                    return branch_ff3d315343437021(l, data, state, prod, prod_start);
                                } else {
                                    pushFN(data, branch_e5b05349fe7e0ae6);
                                    return branch_48f7098c6b996866(l, data, state, prod, prod_start);
                                }
                            } else {
                                '"--LEAF--"';
                                'Leaf [  } or @ sym id num f:s m:s o:s o:n { i:s i:e END_OF_FILE END_OF_PRODUCTION  ]';
                                '"⤋⤋⤋  assert-end ⤋⤋⤋"';
                                '6:31 member_select=>τ@ θid • [ τ}, τor, τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
                                add_reduce(state, data, 2, 15);
                                return 2;
                            }
                        }
                    }
                }
            case 1:
                {
                    '"--LEAF--"';
                    'Leaf [  m:s  ]';
                    '"⤋⤋⤋  peek-production-symbols ⤋⤋⤋"';
                    '2:6 rule=>• mandatory_space [ τm:s ]';
                    pushFN(data, branch_e5b05349fe7e0ae6);
                    pushFN(data, $mandatory_space);
                    return data.rules_ptr;
                }
            case 2:
                {
                    '"--LEAF--"';
                    'Leaf [  o:s  ]';
                    '"⤋⤋⤋  peek-production-symbols ⤋⤋⤋"';
                    '2:7 rule=>• optional_space [ τo:s ]';
                    pushFN(data, branch_e5b05349fe7e0ae6);
                    pushFN(data, $optional_space);
                    return data.rules_ptr;
                }
            case 3:
                {
                    consume(l, data, state);
                    '"⤋⤋⤋  post-peek-consume ⤋⤋⤋"';
                    'Number of end groups0 [    ]';
                    'All symbols [  o:n  ]';
                    '13:45 optional_newline=>• τo:n [ τo:n ]';
                    '12:44 mandatory_newline=>• τo:n [ τo:n ]';
                    'Number of end groups2 [    ]';
                    'All symbols [  ] o:s m:s o:n sym id num f:s END_OF_FILE or @ } { i:s i:e END_OF_PRODUCTION  ]';
                    '13:45 optional_newline=>τo:n • [ τ], τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s, τ}, τor, τ@, τ{, τi:s, τi:e ]';
                    '12:44 mandatory_newline=>τo:n • [ τ], τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s, τ}, τor, τ@, τ{, τi:s, τi:e ]';
                    if (sym_map_4fb65a3b6df1029d(l, data) == 1) {
                        '"--LEAF--"';
                        'Leaf [  ] o:s m:s o:n sym id num f:s END_OF_FILE or @ } { i:s i:e END_OF_PRODUCTION  ]';
                        '"⤋⤋⤋  assert-end ⤋⤋⤋"';
                        '13:45 optional_newline=>τo:n • [ τ], τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s, τ}, τor, τ@, τ{, τi:s, τi:e ]';
                        add_reduce(state, data, 1, 23);
                        return 2;
                    } else {
                        '"--LEAF--"';
                        'Leaf [  ] o:s m:s o:n sym id num f:s END_OF_FILE or @ } { i:s i:e END_OF_PRODUCTION  ]';
                        '"⤋⤋⤋  assert-end ⤋⤋⤋"';
                        '12:44 mandatory_newline=>τo:n • [ τ], τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s, τ}, τor, τ@, τ{, τi:s, τi:e ]';
                        add_reduce(state, data, 1, 22);
                        return 2;
                    }
                }
            case 4:
                {
                    '"--LEAF--"';
                    'Leaf [  {  ]';
                    '"⤋⤋⤋  peek-production-symbols ⤋⤋⤋"';
                    '2:10 rule=>• optional_flagged [ τ{ ]';
                    pushFN(data, branch_e5b05349fe7e0ae6);
                    pushFN(data, $optional_flagged);
                    return data.rules_ptr;
                }
            case 5:
                {
                    '"--LEAF--"';
                    'Leaf [  i:s  ]';
                    '"⤋⤋⤋  peek-production-symbols ⤋⤋⤋"';
                    '2:11 rule=>• indent_start [ τi:s ]';
                    pushFN(data, branch_e5b05349fe7e0ae6);
                    pushFN(data, $indent_start);
                    return data.rules_ptr;
                }
            case 6:
                {
                    '"--LEAF--"';
                    'Leaf [  i:e  ]';
                    '"⤋⤋⤋  peek-production-symbols ⤋⤋⤋"';
                    '2:12 rule=>• indent_end [ τi:e ]';
                    pushFN(data, branch_e5b05349fe7e0ae6);
                    pushFN(data, $indent_end);
                    return data.rules_ptr;
                }
            case 7:
                {
                    '"--LEAF--"';
                    'Leaf [  sym id num f:s  ]';
                    '"⤋⤋⤋  peek-production-symbols ⤋⤋⤋"';
                    '2:5 rule=>• literal [ θsym, θid, θnum, τf:s ]';
                    pushFN(data, branch_e5b05349fe7e0ae6);
                    pushFN(data, $literal);
                    return data.rules_ptr;
                }
            default:
                break;
        };
        return - 1;
    }
    function $delimiter_sequence(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        '"--LEAF--"';
        'Leaf [  o:s m:s o:n sym id num f:s  ]';
        '"⤋⤋⤋  assert-production-symbols ⤋⤋⤋"';
        '3:13 delimiter_sequence=>• delimiter_items [ τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s ]';
        pushFN(data, branch_5abb008d2a3e6ab8);
        pushFN(data, $delimiter_items);
        return data.rules_ptr;
        return - 1;
    }
    function $delimiter_sequence_goto(l, data, state, prod, prod_start) {
        debugger;
        'Number of end groups0 [    ]';
        'All symbols [  o:s m:s o:n sym id num f:s  ]';
        '3:14 delimiter_sequence=>delimiter_sequence • delimiter_items [ τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s ]';
        '18:50 member_spread_group_80_0_=>τ[ member_spread_group_80_0__group_129_0_ delimiter_sequence • τ] [ τ] ]';
        '18:51 member_spread_group_80_0_=>τ[ delimiter_sequence • τ] [ τ] ]';
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
        if (cmpr_set(l, data, 21, 17, 17) || l.current_byte == 93) {
            return 3;
        };
        if (dt_b8280b824a69d9e3(l, data) || cmpr_set(l, data, 9, 3, 3) || l.current_byte == 92 || l.isUniID(data) || l.isNum(data) || l.isSym(true, data)) {
            pushFN(data, branch_762f31abff344055);
            return branch_6078b37309b48400(l, data, state, prod, prod_start);
        };
        return (prod == 3) ? prod : - 1;
    }
    function $delimiter_items(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  o:s m:s o:n sym id num f:s  ]';
        '4:15 delimiter_items=>• optional_space [ τo:s ]';
        '4:16 delimiter_items=>• mandatory_space [ τm:s ]';
        '4:17 delimiter_items=>• optional_newline [ τo:n ]';
        '4:18 delimiter_items=>• mandatory_newline [ τo:n ]';
        '4:19 delimiter_items=>• literal [ θsym, θid, θnum, τf:s ]';
        if (cmpr_set(l, data, 12, 3, 3)) {
            pushFN(data, branch_60754a6e74fc0bfc);
            return branch_db9be5e1e028be87(l, data, state, prod, prod_start);
        } else if (cmpr_set(l, data, 9, 3, 3)) {
            pushFN(data, branch_60754a6e74fc0bfc);
            return branch_5ab43fca4edcabf1(l, data, state, prod, prod_start);
        } else if (cmpr_set(l, data, 41, 3, 3)) {
            consume(l, data, state);
            '"⤋⤋⤋  post-peek-consume ⤋⤋⤋"';
            'Number of end groups0 [    ]';
            'All symbols [  o:n  ]';
            '13:45 optional_newline=>• τo:n [ τo:n ]';
            '12:44 mandatory_newline=>• τo:n [ τo:n ]';
            'Number of end groups2 [    ]';
            'All symbols [  ] o:s m:s o:n sym id num f:s END_OF_FILE or @ } { i:s i:e END_OF_PRODUCTION  ]';
            '13:45 optional_newline=>τo:n • [ τ], τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s, τ}, τor, τ@, τ{, τi:s, τi:e ]';
            '12:44 mandatory_newline=>τo:n • [ τ], τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s, τ}, τor, τ@, τ{, τi:s, τi:e ]';
            if (sym_map_4fb65a3b6df1029d(l, data) == 1) {
                '"--LEAF--"';
                'Leaf [  ] o:s m:s o:n sym id num f:s END_OF_FILE or @ } { i:s i:e END_OF_PRODUCTION  ]';
                '"⤋⤋⤋  assert-end ⤋⤋⤋"';
                '13:45 optional_newline=>τo:n • [ τ], τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s, τ}, τor, τ@, τ{, τi:s, τi:e ]';
                add_reduce(state, data, 1, 23);
                return 4;
            } else {
                '"--LEAF--"';
                'Leaf [  ] o:s m:s o:n sym id num f:s END_OF_FILE or @ } { i:s i:e END_OF_PRODUCTION  ]';
                '"⤋⤋⤋  assert-end ⤋⤋⤋"';
                '12:44 mandatory_newline=>τo:n • [ τ], τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s, τ}, τor, τ@, τ{, τi:s, τi:e ]';
                add_reduce(state, data, 1, 22);
                return 4;
            }
        } else {
            pushFN(data, branch_60754a6e74fc0bfc);
            return branch_a8e0917141cd0427(l, data, state, prod, prod_start);
        };
        return - 1;
    }
    function $optional_flagged(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  {  ]';
        '5:20 optional_flagged=>• τ{ τnot θid optional_flagged_group_32_0_ τ: rules τor rules τ} [ τ{ ]';
        '5:21 optional_flagged=>• τ{ τnot θid τ: rules τor rules τ} [ τ{ ]';
        '5:22 optional_flagged=>• τ{ τnot θid optional_flagged_group_32_0_ τ: rules τ} [ τ{ ]';
        '5:23 optional_flagged=>• τ{ τnot θid τ: rules τ} [ τ{ ]';
        '5:24 optional_flagged=>• τ{ θid optional_flagged_group_32_0_ τ: rules τor rules τ} [ τ{ ]';
        '5:25 optional_flagged=>• τ{ θid τ: rules τor rules τ} [ τ{ ]';
        '5:26 optional_flagged=>• τ{ θid optional_flagged_group_32_0_ τ: rules τ} [ τ{ ]';
        '5:27 optional_flagged=>• τ{ θid τ: rules τ} [ τ{ ]';
        if (l.current_byte == 123) {
            consume(l, data, state);
            'Number of end groups0 [    ]';
            'All symbols [  not id  ]';
            '5:20 optional_flagged=>τ{ • τnot θid optional_flagged_group_32_0_ τ: rules τor rules τ} [ τnot ]';
            '5:21 optional_flagged=>τ{ • τnot θid τ: rules τor rules τ} [ τnot ]';
            '5:22 optional_flagged=>τ{ • τnot θid optional_flagged_group_32_0_ τ: rules τ} [ τnot ]';
            '5:23 optional_flagged=>τ{ • τnot θid τ: rules τ} [ τnot ]';
            '5:24 optional_flagged=>τ{ • θid optional_flagged_group_32_0_ τ: rules τor rules τ} [ θid ]';
            '5:25 optional_flagged=>τ{ • θid τ: rules τor rules τ} [ θid ]';
            '5:26 optional_flagged=>τ{ • θid optional_flagged_group_32_0_ τ: rules τ} [ θid ]';
            '5:27 optional_flagged=>τ{ • θid τ: rules τ} [ θid ]';
            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
            if (cmpr_set(l, data, 38, 3, 3)) {
                'Number of end groups0 [    ]';
                'All symbols [  id  ]';
                '5:20 optional_flagged=>τ{ • τnot θid optional_flagged_group_32_0_ τ: rules τor rules τ} [ τnot ]';
                '5:21 optional_flagged=>τ{ • τnot θid τ: rules τor rules τ} [ τnot ]';
                '5:22 optional_flagged=>τ{ • τnot θid optional_flagged_group_32_0_ τ: rules τ} [ τnot ]';
                '5:23 optional_flagged=>τ{ • τnot θid τ: rules τ} [ τnot ]';
                var pk = l.copyInPlace();
                skip_27d8e42c3256622b(pk.next(data), data, STATE_ALLOW_SKIP);
                if (pk.isUniID(data)) {
                    consume(l, data, state);
                    '"⤋⤋⤋  post-peek-consume ⤋⤋⤋"';
                    'Number of end groups0 [    ]';
                    'All symbols [  not  ]';
                    '5:20 optional_flagged=>τ{ • τnot θid optional_flagged_group_32_0_ τ: rules τor rules τ} [ τnot ]';
                    '5:21 optional_flagged=>τ{ • τnot θid τ: rules τor rules τ} [ τnot ]';
                    '5:22 optional_flagged=>τ{ • τnot θid optional_flagged_group_32_0_ τ: rules τ} [ τnot ]';
                    '5:23 optional_flagged=>τ{ • τnot θid τ: rules τ} [ τnot ]';
                    'Number of end groups0 [    ]';
                    'All symbols [  id  ]';
                    '5:20 optional_flagged=>τ{ τnot • θid optional_flagged_group_32_0_ τ: rules τor rules τ} [ θid ]';
                    '5:21 optional_flagged=>τ{ τnot • θid τ: rules τor rules τ} [ θid ]';
                    '5:22 optional_flagged=>τ{ τnot • θid optional_flagged_group_32_0_ τ: rules τ} [ θid ]';
                    '5:23 optional_flagged=>τ{ τnot • θid τ: rules τ} [ θid ]';
                    skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                    if (l.isUniID(data)) {
                        consume(l, data, state);
                        'Number of end groups0 [    ]';
                        'All symbols [  [ :  ]';
                        '5:20 optional_flagged=>τ{ τnot θid • optional_flagged_group_32_0_ τ: rules τor rules τ} [ τ[ ]';
                        '5:22 optional_flagged=>τ{ τnot θid • optional_flagged_group_32_0_ τ: rules τ} [ τ[ ]';
                        '5:21 optional_flagged=>τ{ τnot θid • τ: rules τor rules τ} [ τ: ]';
                        '5:23 optional_flagged=>τ{ τnot θid • τ: rules τ} [ τ: ]';
                        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                        if (l.current_byte == 91) {
                            'Number of end groups0 [    ]';
                            'All symbols [  16  ]';
                            '5:20 optional_flagged=>τ{ τnot θid • optional_flagged_group_32_0_ τ: rules τor rules τ} [ τ[ ]';
                            '5:22 optional_flagged=>τ{ τnot θid • optional_flagged_group_32_0_ τ: rules τ} [ τ[ ]';
                            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                            pushFN(data, branch_29f4c4eebf914875);
                            pushFN(data, $optional_flagged_group_32_0_);
                            return data.rules_ptr;
                        } else if (l.current_byte == 58) {
                            consume(l, data, state);
                            '"⤋⤋⤋  post-peek-consume ⤋⤋⤋"';
                            'Number of end groups0 [    ]';
                            'All symbols [  :  ]';
                            '5:21 optional_flagged=>τ{ τnot θid • τ: rules τor rules τ} [ τ: ]';
                            '5:23 optional_flagged=>τ{ τnot θid • τ: rules τ} [ τ: ]';
                            'Number of end groups0 [    ]';
                            'All symbols [  1  ]';
                            '5:21 optional_flagged=>τ{ τnot θid τ: • rules τor rules τ} [ τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
                            '5:23 optional_flagged=>τ{ τnot θid τ: • rules τ} [ τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
                            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                            pushFN(data, branch_2a82c27f5e58b682);
                            pushFN(data, $rules);
                            return data.rules_ptr;
                        }
                    }
                }
            } else if (l.isUniID(data)) {
                consume(l, data, state);
                '"⤋⤋⤋  post-peek-consume ⤋⤋⤋"';
                'Number of end groups0 [    ]';
                'All symbols [  id  ]';
                '5:24 optional_flagged=>τ{ • θid optional_flagged_group_32_0_ τ: rules τor rules τ} [ θid ]';
                '5:25 optional_flagged=>τ{ • θid τ: rules τor rules τ} [ θid ]';
                '5:26 optional_flagged=>τ{ • θid optional_flagged_group_32_0_ τ: rules τ} [ θid ]';
                '5:27 optional_flagged=>τ{ • θid τ: rules τ} [ θid ]';
                'Number of end groups0 [    ]';
                'All symbols [  [ :  ]';
                '5:24 optional_flagged=>τ{ θid • optional_flagged_group_32_0_ τ: rules τor rules τ} [ τ[ ]';
                '5:26 optional_flagged=>τ{ θid • optional_flagged_group_32_0_ τ: rules τ} [ τ[ ]';
                '5:25 optional_flagged=>τ{ θid • τ: rules τor rules τ} [ τ: ]';
                '5:27 optional_flagged=>τ{ θid • τ: rules τ} [ τ: ]';
                skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                if (l.current_byte == 91) {
                    'Number of end groups0 [    ]';
                    'All symbols [  16  ]';
                    '5:24 optional_flagged=>τ{ θid • optional_flagged_group_32_0_ τ: rules τor rules τ} [ τ[ ]';
                    '5:26 optional_flagged=>τ{ θid • optional_flagged_group_32_0_ τ: rules τ} [ τ[ ]';
                    skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                    pushFN(data, branch_2091b32189a54f1a);
                    pushFN(data, $optional_flagged_group_32_0_);
                    return data.rules_ptr;
                } else if (l.current_byte == 58) {
                    consume(l, data, state);
                    '"⤋⤋⤋  post-peek-consume ⤋⤋⤋"';
                    'Number of end groups0 [    ]';
                    'All symbols [  :  ]';
                    '5:25 optional_flagged=>τ{ θid • τ: rules τor rules τ} [ τ: ]';
                    '5:27 optional_flagged=>τ{ θid • τ: rules τ} [ τ: ]';
                    'Number of end groups0 [    ]';
                    'All symbols [  1  ]';
                    '5:25 optional_flagged=>τ{ θid τ: • rules τor rules τ} [ τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
                    '5:27 optional_flagged=>τ{ θid τ: • rules τ} [ τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
                    skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                    pushFN(data, branch_e273573036c81352);
                    pushFN(data, $rules);
                    return data.rules_ptr;
                }
            }
        };
        return - 1;
    }
    function $member_select(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  @  ]';
        '6:28 member_select=>• τ@ θid member_select_group_64_0_ τ? [ τ@ ]';
        '6:29 member_select=>• τ@ θid τ? [ τ@ ]';
        '6:30 member_select=>• τ@ θid member_select_group_64_0_ [ τ@ ]';
        '6:31 member_select=>• τ@ θid [ τ@ ]';
        if (l.current_byte == 64) {
            consume(l, data, state);
            'Number of end groups0 [    ]';
            'All symbols [  id  ]';
            '6:28 member_select=>τ@ • θid member_select_group_64_0_ τ? [ θid ]';
            '6:29 member_select=>τ@ • θid τ? [ θid ]';
            '6:30 member_select=>τ@ • θid member_select_group_64_0_ [ θid ]';
            '6:31 member_select=>τ@ • θid [ θid ]';
            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
            if (l.isUniID(data)) {
                consume(l, data, state);
                'Number of end groups1 [    ]';
                'All symbols [  [ ? } or @ sym id num f:s m:s o:s o:n { i:s i:e END_OF_FILE END_OF_PRODUCTION  ]';
                '6:28 member_select=>τ@ θid • member_select_group_64_0_ τ? [ τ[ ]';
                '6:30 member_select=>τ@ θid • member_select_group_64_0_ [ τ[ ]';
                '6:29 member_select=>τ@ θid • τ? [ τ? ]';
                '6:31 member_select=>τ@ θid • [ τ}, τor, τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
                skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                if (l.current_byte == 91) {
                    'Number of end groups0 [    ]';
                    'All symbols [  17  ]';
                    '6:28 member_select=>τ@ θid • member_select_group_64_0_ τ? [ τ[ ]';
                    '6:30 member_select=>τ@ θid • member_select_group_64_0_ [ τ[ ]';
                    skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                    pushFN(data, branch_1aa8ee49fcb8ea2c);
                    pushFN(data, $member_select_group_64_0_);
                    return data.rules_ptr;
                } else if (l.current_byte == 63) {
                    pushFN(data, branch_0c9d97682b645001);
                    return branch_42d12d281048de17(l, data, state, prod, prod_start);
                } else {
                    '"--LEAF--"';
                    'Leaf [  } or @ sym id num f:s m:s o:s o:n { i:s i:e END_OF_FILE END_OF_PRODUCTION  ]';
                    '"⤋⤋⤋  assert-end ⤋⤋⤋"';
                    '6:31 member_select=>τ@ θid • [ τ}, τor, τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
                    add_reduce(state, data, 2, 15);
                    return 6;
                }
            }
        };
        return - 1;
    }
    function $member_spread(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  @  ]';
        '7:32 member_spread=>• τ@ θid τ... member_spread_group_80_0_ [ τ@ ]';
        '7:33 member_spread=>• τ@ θid τ... [ τ@ ]';
        if (l.current_byte == 64) {
            consume(l, data, state);
            'Number of end groups0 [    ]';
            'All symbols [  id  ]';
            '7:32 member_spread=>τ@ • θid τ... member_spread_group_80_0_ [ θid ]';
            '7:33 member_spread=>τ@ • θid τ... [ θid ]';
            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
            if (l.isUniID(data)) {
                consume(l, data, state);
                'Number of end groups0 [    ]';
                'All symbols [  ...  ]';
                '7:32 member_spread=>τ@ θid • τ... member_spread_group_80_0_ [ τ... ]';
                '7:33 member_spread=>τ@ θid • τ... [ τ... ]';
                skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                if (cmpr_set(l, data, 5, 3, 3)) {
                    consume(l, data, state);
                    'Number of end groups1 [    ]';
                    'All symbols [  [ } or @ sym id num f:s m:s o:s o:n { i:s i:e END_OF_FILE END_OF_PRODUCTION  ]';
                    '7:32 member_spread=>τ@ θid τ... • member_spread_group_80_0_ [ τ[ ]';
                    '7:33 member_spread=>τ@ θid τ... • [ τ}, τor, τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
                    skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                    if (l.current_byte == 91) {
                        pushFN(data, branch_1c506044841d35a0);
                        return branch_dfbf38884c8c151a(l, data, state, prod, prod_start);
                    } else {
                        '"--LEAF--"';
                        'Leaf [  } or @ sym id num f:s m:s o:s o:n { i:s i:e END_OF_FILE END_OF_PRODUCTION  ]';
                        '"⤋⤋⤋  assert-end ⤋⤋⤋"';
                        '7:33 member_spread=>τ@ θid τ... • [ τ}, τor, τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
                        add_reduce(state, data, 3, 17);
                        return 7;
                    }
                }
            }
        };
        return - 1;
    }
    function $literal(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  f:s sym id num  ]';
        '8:34 literal=>• tk:literal_token [ θsym, θid, θnum ]';
        '8:35 literal=>• τf:s literal_list_90 [ τf:s ]';
        if (l.current_byte == 92) {
            pushFN(data, branch_ded893b92fe51418);
            return branch_33eb10e464a746f5(l, data, state, prod, prod_start);
        } else {
            pushFN(data, branch_ded893b92fe51418);
            return branch_f9ee2df559b2ded9(l, data, state, prod, prod_start);
        };
        return - 1;
    }
    function $literal_token(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  sym id num  ]';
        '9:36 literal_token=>• θsym [ θsym ]';
        '9:38 literal_token=>• θid [ θid ]';
        '9:39 literal_token=>• θnum [ θnum ]';
        if (l.isSym(true, data)) {
            pushFN(data, branch_9cc82f267f77aa54);
            return branch_f9e4b8c30f5a8653(l, data, state, prod, prod_start);
        } else if (l.isUniID(data)) {
            pushFN(data, branch_9cc82f267f77aa54);
            return branch_1b7cf8ca2c2e326f(l, data, state, prod, prod_start);
        } else if (l.isNum(data)) {
            pushFN(data, branch_9cc82f267f77aa54);
            return branch_236f044844390c7e(l, data, state, prod, prod_start);
        };
        return - 1;
    }
    function $literal_token_goto(l, data, state, prod, prod_start) {
        debugger;
        while (1) {
            switch (prod) {
                case 9:
                    {
                        'Number of end groups0 [    ]';
                        'All symbols [  sym id num  ]';
                        '9:37 literal_token=>literal_token • θsym [ θsym ]';
                        '9:40 literal_token=>literal_token • θid [ θid ]';
                        '9:41 literal_token=>literal_token • θnum [ θnum ]';
                        '8:34 literal=>tk:literal_token • [ τ], τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s, τ}, τor, τ@, τ{, τi:s, τi:e ]';
                        skip_6725b1140c2474a9(l/*[ nl ]*/, data, state);
                        if (dt_b8280b824a69d9e3(l, data) || cmpr_set(l, data, 9, 3, 3) || dt_c64037090c64ac78(l, data) || assert_ascii(l, 0x0, 0x0, 0x30000001, 0x28000000)) {
                            return 9;
                        };
                        if (l.isSym(true, data)) {
                            pushFN(data, branch_9cc82f267f77aa54);
                            return branch_3951b91d4b3ba9c0(l, data, state, prod, prod_start);
                        } else if (l.isUniID(data)) {
                            pushFN(data, branch_9cc82f267f77aa54);
                            return branch_8d2b6fa8570dd919(l, data, state, prod, prod_start);
                        } else if (l.isNum(data)) {
                            pushFN(data, branch_9cc82f267f77aa54);
                            return branch_428dc7b9fe62a6a5(l, data, state, prod, prod_start);
                        }
                    }
            };
            break;
        };
        return (prod == 9) ? prod : - 1;
    }
    function $mandatory_space(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  m:s  ]';
        '10:42 mandatory_space=>• τm:s [ τm:s ]';
        if (cmpr_set(l, data, 9, 3, 3)) {
            consume(l, data, state);
            '"--LEAF--"';
            'Leaf [  m:s  ]';
            '"⤋⤋⤋  assert-consume ⤋⤋⤋"';
            '10:42 mandatory_space=>τm:s • [ τ], τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s, τ}, τor, τ@, τ{, τi:s, τi:e ]';
            add_reduce(state, data, 1, 20);
            return 10;
        };
        return - 1;
    }
    function $optional_space(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  o:s  ]';
        '11:43 optional_space=>• τo:s [ τo:s ]';
        if (cmpr_set(l, data, 12, 3, 3)) {
            consume(l, data, state);
            '"--LEAF--"';
            'Leaf [  o:s  ]';
            '"⤋⤋⤋  assert-consume ⤋⤋⤋"';
            '11:43 optional_space=>τo:s • [ τ], τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s, τ}, τor, τ@, τ{, τi:s, τi:e ]';
            add_reduce(state, data, 1, 21);
            return 11;
        };
        return - 1;
    }
    function $mandatory_newline(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  o:n  ]';
        '12:44 mandatory_newline=>• τo:n [ τo:n ]';
        if (cmpr_set(l, data, 41, 3, 3)) {
            consume(l, data, state);
            '"--LEAF--"';
            'Leaf [  o:n  ]';
            '"⤋⤋⤋  assert-consume ⤋⤋⤋"';
            '12:44 mandatory_newline=>τo:n • [ τ], τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s, τ}, τor, τ@, τ{, τi:s, τi:e ]';
            add_reduce(state, data, 1, 22);
            return 12;
        };
        return - 1;
    }
    function $optional_newline(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  o:n  ]';
        '13:45 optional_newline=>• τo:n [ τo:n ]';
        if (cmpr_set(l, data, 41, 3, 3)) {
            consume(l, data, state);
            '"--LEAF--"';
            'Leaf [  o:n  ]';
            '"⤋⤋⤋  assert-consume ⤋⤋⤋"';
            '13:45 optional_newline=>τo:n • [ τ], τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s, τ}, τor, τ@, τ{, τi:s, τi:e ]';
            add_reduce(state, data, 1, 23);
            return 13;
        };
        return - 1;
    }
    function $indent_start(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  i:s  ]';
        '14:46 indent_start=>• τi:s [ τi:s ]';
        if (cmpr_set(l, data, 15, 3, 3)) {
            consume(l, data, state);
            '"--LEAF--"';
            'Leaf [  i:s  ]';
            '"⤋⤋⤋  assert-consume ⤋⤋⤋"';
            '14:46 indent_start=>τi:s • [ τ}, τor, τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
            add_reduce(state, data, 1, 24);
            return 14;
        };
        return - 1;
    }
    function $indent_end(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  i:e  ]';
        '15:47 indent_end=>• τi:e [ τi:e ]';
        if (cmpr_set(l, data, 44, 3, 3)) {
            consume(l, data, state);
            '"--LEAF--"';
            'Leaf [  i:e  ]';
            '"⤋⤋⤋  assert-consume ⤋⤋⤋"';
            '15:47 indent_end=>τi:e • [ τ}, τor, τ@, θsym, θid, θnum, τf:s, τm:s, τo:s, τo:n, τ{, τi:s, τi:e ]';
            add_reduce(state, data, 1, 25);
            return 15;
        };
        return - 1;
    }
    function $optional_flagged_group_32_0_(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  [  ]';
        '16:48 optional_flagged_group_32_0_=>• τ[ θnum τ] [ τ[ ]';
        if (l.current_byte == 91) {
            consume(l, data, state);
            '"--LEAF--"';
            'Leaf [  [  ]';
            '"⤋⤋⤋  assert-consume ⤋⤋⤋"';
            '16:48 optional_flagged_group_32_0_=>τ[ • θnum τ] [ θnum ]';
            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
            if ((((l.isNum(data)) && consume(l, data, state)))) {
                skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                if ((((l.current_byte == 93) && consume(l, data, state)))) {
                    add_reduce(state, data, 3, 26);
                    return 16;
                };
                return - 1;
            };
            return - 1;
        };
        return - 1;
    }
    function $member_select_group_64_0_(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  [  ]';
        '17:49 member_select_group_64_0_=>• τ[ θnum τ] [ τ[ ]';
        if (l.current_byte == 91) {
            consume(l, data, state);
            '"--LEAF--"';
            'Leaf [  [  ]';
            '"⤋⤋⤋  assert-consume ⤋⤋⤋"';
            '17:49 member_select_group_64_0_=>τ[ • θnum τ] [ θnum ]';
            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
            if ((((l.isNum(data)) && consume(l, data, state)))) {
                skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
                if ((((l.current_byte == 93) && consume(l, data, state)))) {
                    add_reduce(state, data, 3, 26);
                    return 17;
                };
                return - 1;
            };
            return - 1;
        };
        return - 1;
    }
    function $member_spread_group_80_0_(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  [  ]';
        '18:50 member_spread_group_80_0_=>• τ[ member_spread_group_80_0__group_129_0_ delimiter_sequence τ] [ τ[ ]';
        '18:51 member_spread_group_80_0_=>• τ[ delimiter_sequence τ] [ τ[ ]';
        if (l.current_byte == 91) {
            consume(l, data, state);
            'Number of end groups0 [    ]';
            'All symbols [  o:s m:s o:n sym id f:s num  ]';
            '18:50 member_spread_group_80_0_=>τ[ • member_spread_group_80_0__group_129_0_ delimiter_sequence τ] [ θnum ]';
            '18:51 member_spread_group_80_0_=>τ[ • delimiter_sequence τ] [ τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s ]';
            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
            if (dt_b8280b824a69d9e3(l, data) || cmpr_set(l, data, 9, 3, 3) || l.current_byte == 92 || l.isUniID(data) || l.isSym(true, data)) {
                pushFN(data, branch_99d0131b024d331a);
                return branch_c4273563b8b7bea6(l, data, state, prod, prod_start);
            } else if (l.isNum(data)) {
                'Number of end groups0 [    ]';
                'All symbols [  , num id sym @ f:s m:s o:s o:n { i:s i:e or } ] END_OF_FILE  ]';
                '18:50 member_spread_group_80_0_=>τ[ • member_spread_group_80_0__group_129_0_ delimiter_sequence τ] [ θnum ]';
                '18:51 member_spread_group_80_0_=>τ[ • delimiter_sequence τ] [ τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s ]';
                var pk = l.copyInPlace();
                skip_27d8e42c3256622b(pk.next(data), data, STATE_ALLOW_SKIP);
                if (pk.current_byte == 44) {
                    pushFN(data, branch_99d0131b024d331a);
                    return branch_b675ee6c6273e548(l, data, state, prod, prod_start);
                } else {
                    pushFN(data, branch_99d0131b024d331a);
                    return branch_04b8ba9ae9de80ef(l, data, state, prod, prod_start);
                }
            }
        };
        return - 1;
    }
    function $literal_list_90(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  f:s id num sym  ]';
        '19:52 literal_list_90=>• τf:s θsym [ τf:s ]';
        '19:57 literal_list_90=>• τf:s θid [ τf:s ]';
        '19:58 literal_list_90=>• τf:s θnum [ τf:s ]';
        '19:54 literal_list_90=>• θid [ θid ]';
        '19:55 literal_list_90=>• θnum [ θnum ]';
        '19:56 literal_list_90=>• θsym [ θsym ]';
        if (l.current_byte == 92) {
            'Number of end groups0 [    ]';
            'All symbols [  sym id num  ]';
            '19:52 literal_list_90=>• τf:s θsym [ τf:s ]';
            '19:57 literal_list_90=>• τf:s θid [ τf:s ]';
            '19:58 literal_list_90=>• τf:s θnum [ τf:s ]';
            var pk = l.copyInPlace();
            skip_27d8e42c3256622b(pk.next(data), data, STATE_ALLOW_SKIP);
            if (pk.isSym(true, data)) {
                pushFN(data, branch_7e6849341e46cd34);
                return branch_19be0f9e4cd6933b(l, data, state, prod, prod_start);
            } else if (pk.isUniID(data)) {
                pushFN(data, branch_7e6849341e46cd34);
                return branch_39b2426793e4ffe8(l, data, state, prod, prod_start);
            } else {
                pushFN(data, branch_7e6849341e46cd34);
                return branch_8bd5edca03a09e64(l, data, state, prod, prod_start);
            }
        } else if (l.isUniID(data)) {
            pushFN(data, branch_7e6849341e46cd34);
            return branch_0bea948da3fbf810(l, data, state, prod, prod_start);
        } else if (l.isNum(data)) {
            pushFN(data, branch_7e6849341e46cd34);
            return branch_c093568304f24c09(l, data, state, prod, prod_start);
        } else if (l.isSym(true, data)) {
            pushFN(data, branch_7e6849341e46cd34);
            return branch_e708bec395c57551(l, data, state, prod, prod_start);
        };
        return - 1;
    }
    function $literal_list_90_goto(l, data, state, prod, prod_start) {
        debugger;
        if (dt_b8280b824a69d9e3(l, data) || cmpr_set(l, data, 9, 3, 3) || dt_c64037090c64ac78(l, data) || assert_ascii(l, 0x0, 0x0, 0x20000001, 0x28000000)) {
            return 19;
        };
        'Number of end groups0 [    ]';
        'All symbols [  f:s id num sym  ]';
        '19:53 literal_list_90=>literal_list_90 • τf:s θsym [ τf:s ]';
        '19:62 literal_list_90=>literal_list_90 • τf:s θid [ τf:s ]';
        '19:63 literal_list_90=>literal_list_90 • τf:s θnum [ τf:s ]';
        '8:35 literal=>τf:s literal_list_90 • [ τ], τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s, τ}, τor, τ@, τ{, τi:s, τi:e ]';
        '19:59 literal_list_90=>literal_list_90 • θid [ θid ]';
        '19:60 literal_list_90=>literal_list_90 • θnum [ θnum ]';
        '19:61 literal_list_90=>literal_list_90 • θsym [ θsym ]';
        if (l.current_byte == 92) {
            'Number of end groups0 [    ]';
            'All symbols [  sym id num  ]';
            '19:53 literal_list_90=>literal_list_90 • τf:s θsym [ τf:s ]';
            '19:62 literal_list_90=>literal_list_90 • τf:s θid [ τf:s ]';
            '19:63 literal_list_90=>literal_list_90 • τf:s θnum [ τf:s ]';
            '8:35 literal=>τf:s literal_list_90 • [ τ], τo:s, τm:s, τo:n, θsym, θid, θnum, τf:s, τ}, τor, τ@, τ{, τi:s, τi:e ]';
            var pk = l.copyInPlace();
            skip_27d8e42c3256622b(pk.next(data), data, STATE_ALLOW_SKIP);
            if (pk.isSym(true, data)) {
                pushFN(data, branch_7e6849341e46cd34);
                return branch_cbf7f9db4a285300(l, data, state, prod, prod_start);
            } else if (pk.isUniID(data)) {
                pushFN(data, branch_7e6849341e46cd34);
                return branch_dd48e99aebc2b79a(l, data, state, prod, prod_start);
            } else if (pk.isNum(data)) {
                pushFN(data, branch_7e6849341e46cd34);
                return branch_8b7d703256f62225(l, data, state, prod, prod_start);
            }
        } else if (l.isUniID(data)) {
            pushFN(data, branch_7e6849341e46cd34);
            return branch_89343746d55d884a(l, data, state, prod, prod_start);
        } else if (l.isNum(data)) {
            pushFN(data, branch_7e6849341e46cd34);
            return branch_300ae9aaa952da0b(l, data, state, prod, prod_start);
        } else if (l.isSym(true, data)) {
            pushFN(data, branch_7e6849341e46cd34);
            return branch_94e896064dab122b(l, data, state, prod, prod_start);
        };
        return (prod == 19) ? prod : - 1;
    }
    function $member_spread_group_80_0__group_129_0_(l, data, state, prod, prod_start) {
        debugger;
        prod_start = data.rules_ptr;
        'Number of end groups0 [    ]';
        'All symbols [  num  ]';
        '20:64 member_spread_group_80_0__group_129_0_=>• θnum τ, [ θnum ]';
        if (l.isNum(data)) {
            consume(l, data, state);
            '"--LEAF--"';
            'Leaf [  num  ]';
            '"⤋⤋⤋  assert-consume ⤋⤋⤋"';
            '20:64 member_spread_group_80_0__group_129_0_=>θnum • τ, [ τ, ]';
            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, state);
            if ((((l.current_byte == 44) && consume(l, data, state)))) {
                add_reduce(state, data, 2, 33);
                return 20;
            };
            return - 1;
        };
        return - 1;
    }
    function dispatch(data, production_index) {
        switch (production_index) {
            case 0:
                {
                    skip_6725b1140c2474a9((data.lexer), data, 16777215);
                    data.stack[0] = $render;
                    data.stash[0] = 0;
                    return;
                }
        }
    }
    function clear_data() {
        var i = 0;
        for (; i < fork_array_len; i++) {

        };
        out_array_len = 0;
    }
    function init_data(input_len, rules_len) {
        clear_data();
        data_array_len = 1;
        var data = create_parser_data_object(input_len, rules_len
        );
        data_array[0] = data;
        return (data).input;
    }
    function init_table() {
        var table = new Uint8Array(382976);
        lookup_table = table;
        return lookup_table;
    }
    function get_fork_pointers() {
        var i = 0;
        for (; i < out_array_len; i++) {
            var data = out_array[i];
            var fork = new DataRef(out_array[i], (data.VALID), (data.origin_fork + data.rules_ptr), (data.lexer).byte_offset, (data.lexer).byte_length, (data.lexer).line
            );
            fork_array[i] = fork;
        };
        return fork_array;
    }
    function block64Consume(data, block, offset, block_offset, limit) {
        var containing_data = data;
        var end = containing_data.origin_fork + data.rules_ptr;
        while ((containing_data.origin_fork > offset)) {
            end = containing_data.origin_fork;
            containing_data = containing_data.origin;
        };
        var start = containing_data.origin_fork;
        offset -= start;
        end -= start;
        var ptr = offset;
        if ((ptr >= end)) return limit - block_offset;;
        while ((block_offset < limit)) {
            block[block_offset++] = containing_data.rules[ptr++];
            if ((ptr >= end)) return block64Consume(data, block, ptr + start, block_offset, limit);
        };
        return 0;
    }
    function get_next_command_block(fork) {
        var fork_ref = fork;
        var remainder = block64Consume(fork_ref.ptr, fork_ref.command_block, fork_ref.command_offset, 0, 64);
        fork_ref.command_offset += 64 - remainder;
        if ((remainder > 0)) fork_ref.command_block[64 - remainder] = 0;;
        return fork_ref.command_block;
    }
    function recognize(input_byte_length, production) {
        var data_ref = data_array[0];
        data_ref.input_len = input_byte_length;
        (data_ref.lexer).next(data_ref);
        dispatch(data_ref, production);
        root_data = data_ref;
        tip_data = data_ref;
        run();
        return out_array_len;
    };

    return {
        init_data,
        get_next_command_block,
        init_table,
        get_fork_pointers,
        recognize
    };
});

const reduce_functions = [(_, s) => s[s.length - 1], (env, sym, pos) => ((rules => (state) => rules.map(r => r(state)).join(""))(sym[0] || []))/*0*/
    , (env, sym, pos) => ([sym[0]])/*1*/
    , (env, sym, pos) => (sym[0].push(sym[1]), sym[0])/*2*/
    , (env, sym, pos) => ((({ emptyProp }, flag, rules, alt_rules, index, NOT) => (state) => (!emptyProp(state, flag, index)) ^ NOT ? rules.map(r => r(state)).join("") : alt_rules.map(r => r(state)).join(""))(env, sym[2], sym[5], sym[7] || [], sym[3], !!sym[1]))/*3*/
    , (env, sym, pos) => ((({ emptyProp }, flag, rules, alt_rules, index, NOT) => (state) => (!emptyProp(state, flag, index)) ^ NOT ? rules.map(r => r(state)).join("") : alt_rules.map(r => r(state)).join(""))(env, sym[2], sym[4], sym[6] || [], !!sym[1]))/*4*/
    , (env, sym, pos) => ((({ emptyProp }, flag, rules, alt_rules, index, NOT) => (state) => (!emptyProp(state, flag, index)) ^ NOT ? rules.map(r => r(state)).join("") : alt_rules.map(r => r(state)).join(""))(env, sym[2], sym[5], null || [], sym[3], !!sym[1]))/*5*/
    , (env, sym, pos) => ((({ emptyProp }, flag, rules, alt_rules, index, NOT) => (state) => (!emptyProp(state, flag, index)) ^ NOT ? rules.map(r => r(state)).join("") : alt_rules.map(r => r(state)).join(""))(env, sym[2], sym[4], null || [], !!sym[1]))/*6*/
    , (env, sym, pos) => ((({ emptyProp }, flag, rules, alt_rules, index, NOT) => (state) => (!emptyProp(state, flag, index)) ^ NOT ? rules.map(r => r(state)).join("") : alt_rules.map(r => r(state)).join(""))(env, sym[1], sym[4], sym[6] || [], sym[2], !!null))/*7*/
    , (env, sym, pos) => ((({ emptyProp }, flag, rules, alt_rules, index, NOT) => (state) => (!emptyProp(state, flag, index)) ^ NOT ? rules.map(r => r(state)).join("") : alt_rules.map(r => r(state)).join(""))(env, sym[1], sym[3], sym[5] || [], !!null))/*8*/
    , (env, sym, pos) => ((({ emptyProp }, flag, rules, alt_rules, index, NOT) => (state) => (!emptyProp(state, flag, index)) ^ NOT ? rules.map(r => r(state)).join("") : alt_rules.map(r => r(state)).join(""))(env, sym[1], sym[4], null || [], sym[2], !!null))/*9*/
    , (env, sym, pos) => ((({ emptyProp }, flag, rules, alt_rules, index, NOT) => (state) => (!emptyProp(state, flag, index)) ^ NOT ? rules.map(r => r(state)).join("") : alt_rules.map(r => r(state)).join(""))(env, sym[1], sym[3], null || [], !!null))/*10*/
    , (env, sym, pos) => ((({ propertyToString }, prop, index, optional) => (state) => propertyToString(state, prop, index, optional))(env, sym[1], parseInt(sym[2] || "0"), !!sym[3]))/*11*/
    , (env, sym, pos) => ((({ propertyToString }, prop, index, optional) => (state) => propertyToString(state, prop, index, optional))(env, sym[1], parseInt(null || "0"), !!sym[2]))/*12*/
    , (env, sym, pos) => ((({ propertyToString }, prop, index, optional) => (state) => propertyToString(state, prop, index, optional))(env, sym[1], parseInt(sym[2] || "0"), !!null))/*13*/
    , (env, sym, pos) => ((({ propertyToString }, prop, index, optional) => (state) => propertyToString(state, prop, index, optional))(env, sym[1], parseInt(null || "0"), !!null))/*14*/
    , (env, sym, pos) => ((({ propertyToString }, prop, index, delimiter) => (state) => propertyToString(state, prop, index, true, delimiter))(env, sym[1], -sym[3][0] || Infinity, sym[3][1] || undefined))/*15*/
    , (env, sym, pos) => ((({ propertyToString }, prop, index, delimiter) => (state) => propertyToString(state, prop, index, true, delimiter))(env, sym[1], Infinity, undefined))/*16*/
    , (env, sym, pos) => ((({ addLiteral }, _) => (state) => addLiteral(state, _))(env, sym[0]))/*17*/
    , (env, sym, pos) => ((({ addLiteral }, _) => (state) => addLiteral(state, _))(env, sym[1]))/*18*/
    , (env, sym, pos) => ((({ addSpace }) => (state) => addSpace(state, false))(env))/*19*/
    , (env, sym, pos) => ((({ addSpace }) => (state) => addSpace(state, true))(env))/*20*/
    , (env, sym, pos) => ((({ addNewLine }) => (state) => addNewLine(state, true))(env))/*21*/
    , (env, sym, pos) => ((({ addNewLine }) => (state) => addNewLine(state, true))(env))/*22*/
    , (env, sym, pos) => ((({ increaseIndent }) => (state) => increaseIndent(state, true))(env))/*23*/
    , (env, sym, pos) => ((({ decreaseIndent }) => (state) => decreaseIndent(state, true))(env))/*24*/
    , (env, sym, pos) => (sym[1])/*25*/
    , (env, sym, pos) => ([sym[1], sym[2]])/*26*/
    , (env, sym, pos) => ([null, sym[1]])/*27*/
    , (env, sym, pos) => (sym[1] + "")/*28*/
    , (env, sym, pos) => (sym[0] + sym[2])/*29*/
    , (env, sym, pos) => (sym[0] + "")/*30*/
    , (env, sym, pos) => (sym[0] + sym[1])/*31*/
    , (env, sym, pos) => (sym[0])/*32*/];

export default ParserFactory(reduce_functions, undefined, recognizer_initializer);
