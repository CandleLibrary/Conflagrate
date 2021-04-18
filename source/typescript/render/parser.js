import { ParserFactory } from "@candlefw/hydrocarbon/build/library/runtime.js";

const data = (() => {

    const lookup_table = new Uint8Array(382976);
    const sequence_lookup = [123, 58, 125, 91, 93, 63, 64, 46, 46, 46, 92, 109, 58, 115, 111, 58, 115, 105, 58, 115, 111, 58, 110, 105, 58, 101];
    const TokenSpace = 1;
    const TokenNewLine = 2;
    const TokenSymbol = 4;
    const TokenNumber = 8;
    const TokenIdentifier = 16;
    const TokenIdentifierUnicode = (1 << 8) | TokenIdentifier;
    const TokenFullNumber = (2 << 8) | TokenNumber;
    const UNICODE_ID_START = 16;
    const UNICODE_ID_CONTINUE = 32;
    //[javascript_only]
    function print(l, s) {
        console.log([...s.input.slice(l.byte_offset, l.byte_offset + 5)].map(i => String.fromCharCode(i)).join(""));
    }

    function compare(data, data_offset, sequence_offset, length) {
        let i = data_offset;
        let j = sequence_offset;
        let len = j + length;

        for (; j < len; i++, j++)
            if (data.input[i] != sequence_lookup[j]) return j - sequence_offset;

        return length;
    }

    function cmpr_set(l, data, sequence_offset, length, tk_len) {
        if (length == compare(data, l.byte_offset, sequence_offset, length)) {
            l.byte_length = length;
            l.token_length = tk_len;
            return true;
        }
        return false;
    }

    function getUTF8ByteLengthFromCodePoint(code_point) {

        if (code_point == 0) {
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

    function utf8ToCodePoint(offset, data) {

        let buffer = data.input;

        let index = offset;

        const a = buffer[index];

        let flag = 0xE;

        if (a & 0x80) {

            flag = a & 0xF0;

            const b = buffer[index + 1];

            if (flag & 0xE0) {

                flag = a & 0xF8;

                const c = buffer[index + 2];

                if (flag == 0xF0) {
                    return ((a & 0x7) << 18) | ((b & 0x3F) << 12) | ((c & 0x3F) << 6) | (buffer[index + 3] & 0x3F);
                }

                else if (flag == 0xE0) {
                    return ((a & 0xF) << 12) | ((b & 0x3F) << 6) | (c & 0x3F);
                }

            } else if (flag == 0xC) {
                return ((a & 0x1F) << 6) | b & 0x3F;
            }

        } else return a;

        return 0;
    }

    function getTypeAt(code_point) {
        switch (lookup_table[code_point] & 0xF) {
            case 0:
                return TokenSymbol;
            case 1:
                return TokenIdentifier;
            case 2:
                return TokenSpace;
            case 3:
            case 4:
                return TokenNewLine;
            case 5:
                return TokenNumber;
        }
        return TokenSymbol;
    }

    class Lexer {

        constructor() {
            this.byte_offset = 0;      //32
            this.byte_length = 0;      //16

            this.token_length = 0;      //16
            this.token_offset = 0;      //16
            this.prev_token_offset = 0; //32

            this.type = 0;             //16
            this.current_byte = 0;     //16
        }

        // Returns false if the symbol following
        // the byte length is of the passed in type
        isDiscrete(data, assert_class, USE_UNICODE) {

            let type = 0;

            let offset = this.byte_offset + this.byte_length;

            if (offset >= data.input_len) return true;

            let current_byte = data.input[offset];

            if (!USE_UNICODE || current_byte < 128) {
                type = getTypeAt(current_byte);
            } else {
                type = getTypeAt(utf8ToCodePoint(offset, data));
            }

            return (type & assert_class) == 0;
        }


        getType(USE_UNICODE, data) {

            if (this.END(data)) return 0;

            if (this.type == 0) {
                if (!USE_UNICODE || this.current_byte < 128) {
                    this.type = getTypeAt(this.current_byte);
                } else {
                    const code_point = utf8ToCodePoint(this.byte_offset, data);
                    this.byte_length += getUTF8ByteLengthFromCodePoint(code_point) - 1;
                    this.type = getTypeAt(code_point);
                }
            }
            return this.type;
        }


        isSym(USE_UNICODE, data) {
            return !this.END(data) && this.getType(USE_UNICODE, data) == TokenSymbol;
        }

        isNL() {
            return this.current_byte == 10 || this.current_byte == 13;
        }

        isSP(USE_UNICODE, data) {
            return this.current_byte == 32 || USE_UNICODE && TokenSpace == this.getType(USE_UNICODE, data);
        }

        isNum(data) {
            if (this.type == 0 || this.type == TokenNumber) {
                if (this.getType(false, data) == TokenNumber) {
                    const l = data.input_len;
                    let off = this.byte_offset;
                    while ((++off < l) && 47 < data.input[off] && data.input[off] < 58) {
                        this.byte_length++;
                        this.token_length++;
                    }
                    this.type = TokenFullNumber;
                    return true;
                }
                else
                    return false;
            }
            else
                return this.type == TokenFullNumber;
        }

        isUniID(data) {
            if (this.type == 0 || this.type == TokenIdentifier) {
                if (this.getType(true, data) == TokenIdentifier) {
                    const l = data.input_len;
                    let off = this.byte_offset + this.byte_length;
                    let code_point = utf8ToCodePoint(off, data);
                    while (
                        (off < l)
                        && ((UNICODE_ID_START | UNICODE_ID_CONTINUE) & lookup_table[code_point]) > 0
                    ) {
                        off += getUTF8ByteLengthFromCodePoint(code_point);
                        code_point = utf8ToCodePoint(off, data);
                        this.token_length++;
                    }
                    this.byte_length = off - this.byte_offset;
                    this.type = TokenIdentifierUnicode;
                    return true;
                } else
                    return false;
            } else return this.type == TokenIdentifierUnicode;
        }

        copy() {
            const destination = new Lexer();
            destination.byte_offset = this.byte_offset;
            destination.byte_length = this.byte_length;

            destination.token_length = this.token_length;
            destination.token_offset = this.token_offset;
            destination.prev_token_offset = this.prev_token_offset;

            destination.type = this.type;
            destination.current_byte = this.current_byte;
            return destination;
        }

        slice(source) {
            this.byte_length = this.byte_offset - source.byte_offset;
            this.token_length = this.token_offset - source.token_offset;
            this.byte_offset = source.byte_offset;
            this.token_offset = source.token_offset;
            return this;
        }

        sync(source) {
            this.byte_offset = source.byte_offset;
            this.byte_length = source.byte_length;

            this.token_length = source.token_length;
            this.token_offset = source.token_offset;
            this.prev_token_offset = source.prev_token_offset;

            this.type = source.type;
            this.current_byte = source.current_byte;
            return this;
        }

        next(data) {

            this.byte_offset += this.byte_length;
            this.token_offset += this.token_length;

            if (data.input_len < this.byte_offset) {
                this.type = 0;
                this.byte_length = 0;
                this.token_length = 0;
            } else {
                this.current_byte = data.input[this.byte_offset];
                this.type = 0;
                this.byte_length = 1;
                this.token_length = 1;
            }

            return this;
        }

        END(data) {
            return this.byte_offset >= data.input_len;
        }

    }

    function assert_ascii(l, a, b, c, d) {
        const ascii = l.current_byte;
        if (ascii < 32) {
            return (a & (1 << ascii)) != 0;
        } else if (ascii < 64) {
            return (b & (1 << (ascii - 32))) != 0;
        } else if (ascii < 96) {
            return (c & (1 << (ascii - 64))) != 0;
        } else if (ascii < 128) {
            return (d & (1 << (ascii - 96))) != 0;
        }
        return false;
    }



    function fork(data) {

        let
            rules = new Uint32Array(data.rules_len),
            error = new Uint8Array(data.error_len - data.error_ptr),
            debug = new Uint16Array(data.debug_len - data.debug_ptr);

        const fork = {
            lexer: data.lexer.copy(),
            state: data.state,
            prop: data.prop,
            stack_ptr: data.stack_ptr,
            input_ptr: data.input_ptr,
            rules_ptr: 0,
            error_ptr: 0,
            debug_ptr: 0,
            input_len: data.input_len,
            rules_len: data.rules_len,
            error_len: data.error_len,
            debug_len: data.debug_len,
            input: data.input,
            rules: rules,
            error: error,
            debug: debug,
            stack: data.stack.slice(),
            origin_fork: data.rules_ptr + data.origin_fork,
            origin: data,
            alternate: null
        };

        while (data.alternate) {
            data = data.alternate;
        }

        data.alternate = fork;

        return fork;
    }

    function init_data(input_len, rules_len, error_len, debug_len) {

        let
            input = new Uint8Array(input_len),
            rules = new Uint16Array(rules_len),
            error = new Uint8Array(error_len),
            debug = new Uint16Array(debug_len),
            stack = [];

        return {
            valid: false,
            lexer: new Lexer,
            state: createState(true),
            prop: 0,
            stack_ptr: -1,
            input_ptr: 0,
            rules_ptr: 0,
            error_ptr: 0,
            debug_ptr: 0,
            input_len: input_len,
            rules_len: rules_len,
            error_len: error_len,
            debug_len: debug_len,
            input: input,
            rules: rules,
            error: error,
            debug: debug,
            stack: stack,
            origin_fork: 0,
            origin: null,
            alternate: null
        };
    }


    function block64Consume(data, block, offset, block_offset, limit) {
        //Find offset block

        let containing_data = data,
            end = containing_data.origin_fork + data.rules_ptr;

        //Find closest root
        while (containing_data.origin_fork > offset) {
            end = containing_data.origin_fork;
            containing_data = containing_data.origin;
        }

        let start = containing_data.origin_fork;

        offset -= start;
        end -= start;

        //Fill block with new data
        let ptr = offset;

        if (ptr >= end) return limit - block_offset;

        while (block_offset < limit) {
            block[block_offset++] = containing_data.rules[ptr++];
            if (ptr >= end)
                return block64Consume(data, block, ptr + start, block_offset, limit);
        }
        return 0;
    }

    /**
     *  Rules payload
     * 
     *  Assuming Little Endian
     * 
     *  Reduce
     *  0 . . . | . . . 7 . . . | . . . 16
     *  ||__||_||________________________|   
     *   |    |____________       \___________________ 
     *   |                 \                         \
     *   Byte Identifier:   Overflow Bit:               Payload: 
     *   0 Reduce           If set then body id is set    No Overflow: 5 bits for reduce size and 8 bits for body index
     *                      on next 16 byte segment       Overflow: 13 bits for reduce size and next 16bits for body index
     * 
     *  Shift
     *  0 . . . | . . . 7 . . . | . . . 16
     *  ||__||_||________________________|   
     *   |    |____________       \___________________ 
     *   |                 \                         \
     *   Byte Identifier:   Overflow Bit:               Payload: 
     *   1 Shift            If set then add payload     No Overflow: shift length = 13 bits
     *                      to next 16 bits             Overflow: shift length = < 13bits> << 16 | <next 16 bits>
     * 
     * 
     *  Skip
     *  0 . . . | . . . 7 . . . | . . . 16
     *  ||__||_||________________________|   
     *   |    |____________       \___________________ 
     *   |                 \                         \
     *   Byte Identifier:   Overflow Bit:               Payload: 
     *   2 Skip             If set then add payload     No Overflow: skip length = 13 bits
     *                      to next 16 bits             Overflow: skip length = < 13bits> << 16 | <next 16 bits>
     * 
     */

    function add_reduce(state, data, sym_len, body, DNP = false) {
        if (isOutputEnabled(state)) {

            let total = body + sym_len;

            if (total == 0) return;

            if (body > 0xFF || sym_len > 0x1F) {
                const low = (1 << 2) | (body & 0xFFF8);
                const high = sym_len;
                set_action(low, data);
                set_action(high, data);
            } else {
                const low = ((sym_len & 0x1F) << 3) | ((body & 0xFF) << 8);
                set_action(low, data);
            }
        }
    }

    function add_shift(l, data, tok_len) {

        if (tok_len < 1) return;

        if (tok_len > 0x1FFF) {
            const low = 1 | (1 << 2) | ((tok_len >> 13) & 0xFFF8);
            const high = (tok_len & 0xFFFF);
            set_action(low, data);
            set_action(high, data);
        } else {
            const low = 1 | ((tok_len << 3) & 0xFFF8);
            set_action(low, data);
        }
    }

    function add_skip(l, data, skip_delta) {

        if (skip_delta < 1) return;

        if (skip_delta > 0x1FFF) {
            const low = 2 | (1 << 2) | ((skip_delta >> 13) & 0xFFF8);
            const high = (skip_delta & 0xFFFF);
            set_action(low, data);
            set_action(high, data);
        } else {
            const low = 2 | ((skip_delta << 3) & 0xFFF8);
            set_action(low, data);
        }
    }

    function set_error(val, data) {
        if (data.error_ptr > data.error_len) return;
        data.error[data.error_ptr++] = val;
    }

    function mark() {
        return action_ptr;
    }

    function set_action(val, data) {
        if (data.rules_ptr > data.rules_len) return;
        data.rules[data.rules_ptr++] = val;
    }

    function createState(ENABLE_STACK_OUTPUT) {
        const IS_STATE_VALID = 1;
        return IS_STATE_VALID | (ENABLE_STACK_OUTPUT << 1);
    }

    function hasStateFailed(state) {
        const IS_STATE_VALID = 1;
        return 0 == (state & IS_STATE_VALID);
    }

    function isOutputEnabled(state) {
        return 0 < (state & 0x2);
    }

    function reset(mark, origin, advanced, state) {
        action_ptr = mark;
        advanced.sync(origin);
        return state;
    }

    function consume(l, data, state) {
        if (isOutputEnabled(state))
            add_shift(l, data, l.token_length);
        l.next(data);
        return true;
    }

    function assertSuccess(l, state, condition) {
        if (!condition || hasStateFailed(state))
            return fail(l, state);
        return state;
    }

    function debug_add_header(data, number_of_items, delta_char_offset, peek_start, peek_end, fork_start, fork_end) {

        if (data.debug_ptr + 1 >= data.debug_len)
            return;

        const local_pointer = data.debug_ptr;

        if (delta_char_offset > 62) {

            data.debug[local_pointer + 1] = delta_char_offset;

            delta_char_offset = 63;

            data.debug_ptr++;
        }

        data.debug[local_pointer] = ((number_of_items && 0x3F)
            | (delta_char_offset << 6)
            | ((peek_start & 0x1) << 12)
            | ((peek_end & 0x1) << 13)
            | ((fork_start & 0x1) << 14)
            | ((fork_end & 0x1) << 15));

        data.debug_ptr++;
    }

    function debug_add_item(data, item_index) { data.debug[data.debug_ptr++] = item_index; }

    ;
    function branch_0a5051a0eac82dbd(l, data, state, prod) {
        add_reduce(state, data, 1, 3);
        pushFN(data, $rules_HC_listbody1_101_goto);
        return 2;
        /*0a5051a0eac82dbd627ddf33636cd2de*/
    }
    function branch_0fdc5c5b577f7e48(l, data, state, prod) {
        add_reduce(state, data, 1, 1);
        return 0;
        /*0fdc5c5b577f7e481c47b8e3e546f5f3*/
    }
    function branch_172994572371567c(l, data, state, prod) {
        add_reduce(state, data, 1, 3);
        pushFN(data, $rules_goto);
        return 3;
        /*172994572371567c5ee4087c0c3c17eb*/
    }
    function branch_1a752f8fffab167e(l, data, state, prod) {
        add_reduce(state, data, 2, 2);
        /*-------------INDIRECT-------------------*/
        pushFN(data, $literal_token_HC_listbody3_109_goto);
        return 18;
        /*1a752f8fffab167e49588acbd50e5e61*/
    }
    function branch_205be87bad0736f3(l, data, state, prod) {
        add_reduce(state, data, 2, 2);
        /*-------------INDIRECT-------------------*/
        pushFN(data, $rules_HC_listbody1_101_goto);
        return 2;
        /*205be87bad0736f3c0aa11d0c63bf5bd*/
    }
    function branch_258af5c7d7d6e092(l, data, state, prod) {
        add_reduce(state, data, 2, 2);
        /*-------------INDIRECT-------------------*/
        pushFN(data, $rules_goto);
        return 3;
        /*258af5c7d7d6e092d15c4e660e924ff8*/
    }
    function branch_39d633d5ace565f8(l, data, state, prod) {
        add_reduce(state, data, 2, 2);
        /*-------------INDIRECT-------------------*/
        pushFN(data, $delimiter_sequence_HC_listbody1_103_goto);
        return 6;
        /*39d633d5ace565f87c9de36466022e66*/
    }
    function branch_409d78a56c46912b(l, data, state, prod) {
        return 8;
        /*409d78a56c46912be16129b2d228408d*/
    }
    function branch_4492590a836a85d2(l, data, state, prod) {
        add_reduce(state, data, 4, 6);
        return 12;
        /*4492590a836a85d2e437fe63964f4c64*/
    }
    function branch_4cf9f330b549b1e1(l, data, state, prod) {
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
        /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
        if (l.current_byte == 63/*[?]*/) {
            /*
               12:30 member_select=>@ θid member_select_group_223_104 • member_select_group_024_105
            */
            /*--LEAF--*/
            /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
            pushFN(data, branch_7f79d8178cad45b5);
            pushFN(data, $member_select_group_024_105);
            return 0;
            /*⤋⤋⤋ assert-end ⤋⤋⤋*/
        } else {
            /*
               12:32 member_select=>@ θid member_select_group_223_104 •
            */
            /*--LEAF--*/
            /*⤋⤋⤋ assert-end ⤋⤋⤋*/
            add_reduce(state, data, 3, 8);
            return 4;
        }
        /*4cf9f330b549b1e14af55b34afbb660e*/
    }
    function branch_59d71b00d892df9f(l, data, state, prod) {
        add_reduce(state, data, 4, 10);
        return 14;
        /*59d71b00d892df9fddf7a76da9ce325d*/
    }
    function branch_5b254d121779069c(l, data, state, prod) {
        add_reduce(state, data, 1, 3);
        pushFN(data, $delimiter_sequence_HC_listbody1_103_goto);
        return 6;
        /*5b254d121779069cdd3bd762158fd38c*/
    }
    function branch_6a8e92431bd06da7(l, data, state, prod) {
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
        if ((l.current_byte == 125/*[}]*/) && consume(l, data, state)) {
            add_reduce(state, data, 5, 4);
            return 9;
        }
        /*6a8e92431bd06da7ec2f9d336f25ef5e*/
    }
    function branch_73450b1576323d5e(l, data, state, prod) {
        add_reduce(state, data, 4, 10);
        return 4;
        /*73450b1576323d5eea6ef7e45b5e088f*/
    }
    function branch_7f79d8178cad45b5(l, data, state, prod) {
        add_reduce(state, data, 4, 6);
        return 4;
        /*7f79d8178cad45b52a2455f7bc120c9f*/
    }
    function branch_84fe79fd0b072710(l, data, state, prod) {
        return 4;
        /*84fe79fd0b0727100ec1cbf2e9632328*/
    }
    function branch_942dff3e817decc8(l, data, state, prod) {
        return 5;
        /*942dff3e817decc84107f38c7309b791*/
    }
    function branch_96da2aad171d376f(l, data, state, prod) {
        add_reduce(state, data, 1, 12);
        return 16;
        /*96da2aad171d376f9d77f35805e6e3bf*/
    }
    function branch_a4fe1fa346f28556(l, data, state, prod) {
        add_reduce(state, data, 3, 7);
        return 12;
        /*a4fe1fa346f2855615e1d4250fff6def*/
    }
    function branch_bb3da79e2ee23957(l, data, state, prod) {
        /*⤋⤋⤋ assert-end ⤋⤋⤋*/
        {
            /*
               8:21 delimiter_items=>optional_space •
               8:22 delimiter_items=>optional_space •
            */
            /*--LEAF--*/
            /*⤋⤋⤋ assert-end ⤋⤋⤋*/
            return 8;
        }
        /*bb3da79e2ee23957879862518cc43390*/
    }
    function branch_be7179c22d6b7ada(l, data, state, prod) {
        add_reduce(state, data, 1, 3);
        pushFN(data, $literal_token_HC_listbody3_109_goto);
        return 18;
        /*be7179c22d6b7adab68c4ae0aa44cbc0*/
    }
    function branch_c1a8b7e421d06feb(l, data, state, prod) {
        add_reduce(state, data, 1, 3);
        pushFN(data, $literal_token_goto);
        return 19;
        /*c1a8b7e421d06feb5ed31c5dae87b0af*/
    }
    function branch_c8b1edd29c4e93e5(l, data, state, prod) {
        add_reduce(state, data, 3, 7);
        return 4;
        /*c8b1edd29c4e93e5173027987e02b91a*/
    }
    function branch_caa19ef7c88d63c6(l, data, state, prod) {
        add_reduce(state, data, 2, 13);
        return 16;
        /*caa19ef7c88d63c692499a0327afd451*/
    }
    function branch_d7f0b9bc9c5e1805(l, data, state, prod) {
        add_reduce(state, data, 2, 2);
        /*-------------INDIRECT-------------------*/
        pushFN(data, $delimiter_sequence_goto);
        return 7;
        /*d7f0b9bc9c5e180575b2ce9c765dc324*/
    }
    function branch_da4663752f29c5ce(l, data, state, prod) {
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
        if ((l.current_byte == 93/*[]]*/) && consume(l, data, state)) {
            add_reduce(state, data, 3, 5);
            return 13;
        }
        /*da4663752f29c5ced2a5de20207ac775*/
    }
    function branch_e6ca468c39009342(l, data, state, prod) {
        return 1;
        /*e6ca468c39009342aa556361b9a54b1c*/
    }
    function branch_e9418936f4020943(l, data, state, prod) {
        add_reduce(state, data, 1, 3);
        pushFN(data, $delimiter_sequence_goto);
        return 7;
        /*e9418936f402094332358a33372b1761*/
    }
    function branch_f6c32d9d65f706a3(l, data, state, prod) {
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
        /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
        if (l.current_byte == 63/*[?]*/) {
            /*
               12:30 member_select=>@ θid member_select_group_223_104 • member_select_group_024_105
            */
            /*--LEAF--*/
            /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
            pushFN(data, branch_4492590a836a85d2);
            pushFN(data, $member_select_group_024_105);
            return 0;
            /*⤋⤋⤋ assert-end ⤋⤋⤋*/
        } else {
            /*
               12:32 member_select=>@ θid member_select_group_223_104 •
            */
            /*--LEAF--*/
            /*⤋⤋⤋ assert-end ⤋⤋⤋*/
            add_reduce(state, data, 3, 8);
            return 12;
        }
        /*f6c32d9d65f706a323c582913f753aa9*/
    }
    function branch_f917b2c5d74b17b0(l, data, state, prod) {
        add_reduce(state, data, 2, 2);
        /*-------------INDIRECT-------------------*/
        pushFN(data, $literal_token_goto);
        return 19;
        /*f917b2c5d74b17b07fcde2a45ac2689c*/
    }
    function dt_64d6ef85c2406ef0(l, data) {
        if (3 == compare(data, l.byte_offset + 0, 14, 3)) {
            l.type = TokenSymbol;
            l.byte_length = 3;
            l.token_length = 3;
            return true;
        } else if (3 == compare(data, l.byte_offset + 0, 20, 3)) {
            l.type = TokenSymbol;
            l.byte_length = 3;
            l.token_length = 3;
            return true;
        }
        return false;
    }
    function dt_e0825731bf138308(l, data) {
        if (3 == compare(data, l.byte_offset + 0, 17, 3)) {
            l.type = TokenSymbol;
            l.byte_length = 3;
            l.token_length = 3;
            return true;
        } else if (3 == compare(data, l.byte_offset + 0, 23, 3)) {
            l.type = TokenSymbol;
            l.byte_length = 3;
            l.token_length = 3;
            return true;
        }
        return false;
    }
    function skip_27d8e42c3256622b(l, data, APPLY) {
        const off = l.token_offset;
        while (1) {
            if (!(l.isNL() || l.isSP(true, data))) {
                break;
            }
            l.next(data);
        }
        if (APPLY) {
            add_skip(l, data, l.token_offset - off);
        }
    }
    function sym_map_af1a5e61012e447b(l, data) {
        if (data.input[l.byte_offset + 0] == 64) {
            l.type = TokenSymbol;
            l.byte_length = 1;
            l.token_length = 1;
            return 0;
        } else if (data.input[l.byte_offset + 0] == 123) {
            l.type = TokenSymbol;
            l.byte_length = 1;
            l.token_length = 1;
            return 1;
        } else if (data.input[l.byte_offset + 0] == 109) {
            if (2 == compare(data, l.byte_offset + 1, 12, 2)) {
                l.type = TokenSymbol;
                l.byte_length = 3;
                l.token_length = 3;
                if (!l.isDiscrete(data, TokenIdentifier)) {
                    return 0xFFFFFF;
                }
                return 2;
            }
        } else if (data.input[l.byte_offset + 0] == 111) {
            if (data.input[l.byte_offset + 1] == 58) {
                if (data.input[l.byte_offset + 2] == 115) {
                    l.type = TokenSymbol;
                    l.byte_length = 3;
                    l.token_length = 3;
                    if (!l.isDiscrete(data, TokenIdentifier)) {
                        return 0xFFFFFF;
                    }
                    return 3;
                } else if (data.input[l.byte_offset + 2] == 110) {
                    l.type = TokenSymbol;
                    l.byte_length = 3;
                    l.token_length = 3;
                    if (!l.isDiscrete(data, TokenIdentifier)) {
                        return 0xFFFFFF;
                    }
                    return 4;
                }
            }
        } else if (data.input[l.byte_offset + 0] == 105) {
            if (data.input[l.byte_offset + 1] == 58) {
                if (data.input[l.byte_offset + 2] == 115) {
                    l.type = TokenSymbol;
                    l.byte_length = 3;
                    l.token_length = 3;
                    if (!l.isDiscrete(data, TokenIdentifier)) {
                        return 0xFFFFFF;
                    }
                    return 5;
                } else if (data.input[l.byte_offset + 2] == 101) {
                    l.type = TokenSymbol;
                    l.byte_length = 3;
                    l.token_length = 3;
                    if (!l.isDiscrete(data, TokenIdentifier)) {
                        return 0xFFFFFF;
                    }
                    return 6;
                }
            }
        } else if (data.input[l.byte_offset + 0] == 92) {
            l.type = TokenSymbol;
            l.byte_length = 1;
            l.token_length = 1;
            return 7;
        }
        if (l.isUniID(data)) {
            return 7;
        } else if (l.isNum(data)) {
            return 7;
        } else if (l.isSym(true, data)) {
            return 7;
        }
    }
/*production name: render
            grammar index: 0
            bodies:
	0:0 render=>• rules - 
            compile time: 8.839ms*/;
    function $render(l, data, state) {
        /*--LEAF--*/
        /*⤋⤋⤋ assert-production-symbols ⤋⤋⤋*/
        pushFN(data, branch_0fdc5c5b577f7e48);
        pushFN(data, $rules);
        return 0;
        return -1;
    }
/*production name: rules_group_02_100
            grammar index: 1
            bodies:
	1:1 rules_group_02_100=>• rule - 
            compile time: 10.523ms*/;
    function $rules_group_02_100(l, data, state) {
        /*--LEAF--*/
        /*⤋⤋⤋ assert-production-symbols ⤋⤋⤋*/
        pushFN(data, branch_e6ca468c39009342);
        pushFN(data, $rule);
        return 0;
        return -1;
    }
/*production name: rules
            grammar index: 3
            bodies:
	3:4 rules=>• rules rules_group_02_100 - 
		3:5 rules=>• rules_group_02_100 - 
            compile time: 20.939ms*/;
    function $rules(l, data, state) {
        /*--LEAF--*/
        /*⤋⤋⤋ assert-production-symbols ⤋⤋⤋*/
        pushFN(data, branch_172994572371567c);
        pushFN(data, $rule);
        return 0;
        return -1;
    }
    function $rules_goto(l, data, state, prod) {
        while (1) {
            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
            if (l.current_byte == 125/*[}]*/) {
                return 3;
            }
            /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
            if (((assert_ascii(l, 0x0, 0x0, 0x10000001, 0x8000000) || l.isUniID(data)) || l.isNum(data)) || l.isSym(true, data)) {
                /*
                   3:4 rules=>rules • rules_group_02_100
                */
                /*--LEAF--*/
                /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
                pushFN(data, branch_258af5c7d7d6e092);
                pushFN(data, $rule);
                return 0;
            }
            break;
        }
        return prod == 3 ? prod : -1;
    }
/*production name: rule
            grammar index: 4
            bodies:
	4:6 rule=>• member_select - 
		4:7 rule=>• member_spread - 
		4:8 rule=>• literal - 
		4:9 rule=>• mandatory_space - 
		4:10 rule=>• optional_space - 
		4:11 rule=>• optional_newline - 
		4:12 rule=>• mandatory_newline - 
		4:13 rule=>• optional_flagged - 
		4:14 rule=>• indent_start - 
		4:15 rule=>• indent_end - 
            compile time: 197.164ms*/;
    function $rule(l, data, state) {
        switch (sym_map_af1a5e61012e447b(l, data)) {
            case 0:
                let pk = l.copy();
                skip_27d8e42c3256622b(pk.next(data)/*[ ws ][ nl ]*/, data, false);
                /*⤋⤋⤋ assert-peek ⤋⤋⤋*/
                if (pk.isUniID(data)) {
                    /*
                       4:6 rule=>• member_select
                       4:7 rule=>• member_spread
                    */
                    /*⤋⤋⤋ post-peek-consume ⤋⤋⤋*/
                    consume(l, data, state);
                    skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
                    /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
                    if (l.isUniID(data)) {
                        /*
                           12:30 member_select=>@ θid • member_select_group_223_104 member_select_group_024_105
                           12:31 member_select=>@ θid • member_select_group_024_105
                           12:32 member_select=>@ θid • member_select_group_223_104
                           12:33 member_select=>@ θid •
                           14:35 member_spread=>@ θid • ... member_spread_group_226_106
                           14:36 member_spread=>@ θid • ...
                        */
                        consume(l, data, state);
                        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
                        /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
                        if (l.current_byte == 91/*[[]*/) {
                            /*
                               12:30 member_select=>@ θid • member_select_group_223_104 member_select_group_024_105
                               12:32 member_select=>@ θid • member_select_group_223_104
                            */
                            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
                            pushFN(data, branch_4cf9f330b549b1e1);
                            pushFN(data, $member_select_group_223_104);
                            return 0;
                            /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
                        } else if (l.current_byte == 63/*[?]*/) {
                            /*
                               12:31 member_select=>@ θid • member_select_group_024_105
                            */
                            /*--LEAF--*/
                            /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
                            pushFN(data, branch_c8b1edd29c4e93e5);
                            pushFN(data, $member_select_group_024_105);
                            return 0;
                            /*⤋⤋⤋ assert-peek ⤋⤋⤋*/
                        } else if (cmpr_set(l, data, 7, 3, 3)) {
                            /*
                               14:35 member_spread=>@ θid • ... member_spread_group_226_106
                               14:36 member_spread=>@ θid • ...
                            */
                            let pk = l.copy();
                            skip_27d8e42c3256622b(pk.next(data)/*[ ws ][ nl ]*/, data, false);
                            /*⤋⤋⤋ assert-peek ⤋⤋⤋*/
                            if (pk.current_byte == 91/*[[]*/) {
                                /*
                                   14:35 member_spread=>@ θid • ... member_spread_group_226_106
                                */
                                /*--LEAF--*/
                                /*⤋⤋⤋ assert-peek ⤋⤋⤋*/
                                consume(l, data, state);
                                skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
                                pushFN(data, branch_73450b1576323d5e);
                                pushFN(data, $member_spread_group_226_106);
                                return 0;
                                /*⤋⤋⤋ assert-peek ⤋⤋⤋*/
                            } else {
                                /*
                                   14:36 member_spread=>@ θid • ...
                                */
                                /*--LEAF--*/
                                /*⤋⤋⤋ assert-peek ⤋⤋⤋*/
                                consume(l, data, state);
                                add_reduce(state, data, 3, 11);
                                return 4;
                            }
                            /*⤋⤋⤋ assert-end ⤋⤋⤋*/
                        } else {
                            /*
                               12:33 member_select=>@ θid •
                            */
                            /*--LEAF--*/
                            /*⤋⤋⤋ assert-end ⤋⤋⤋*/
                            add_reduce(state, data, 2, 9);
                            return 4;
                        }
                    }
                }
            case 1:
                /*--LEAF--*/
                /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
                pushFN(data, branch_84fe79fd0b072710);
                pushFN(data, $optional_flagged);
                return 0;
            case 2:
                /*--LEAF--*/
                /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
                pushFN(data, branch_84fe79fd0b072710);
                pushFN(data, $mandatory_space);
                return 0;
            case 3:
                /*--LEAF--*/
                /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
                pushFN(data, branch_84fe79fd0b072710);
                pushFN(data, $optional_space);
                return 0;
            case 4:
                /*⤋⤋⤋ post-peek-consume ⤋⤋⤋*/
                consume(l, data, state);
                /*⤋⤋⤋ assert-end ⤋⤋⤋*/
                if (!((((assert_ascii(l, 0x0, 0x0, 0x30000001, 0x28000000) || l.END(data)) || l.isUniID(data)) || l.isNum(data)) || l.isSym(true, data)) || ((((dt_64d6ef85c2406ef0(l, data) || cmpr_set(l, data, 11, 3, 3)) || dt_e0825731bf138308(l, data)) || assert_ascii(l, 0x0, 0x0, 0x30000001, 0x28000000)) || l.END(data))) {
                    /*
                       22:51 mandatory_newline=>o:n •
                    */
                    /*--LEAF--*/
                    /*⤋⤋⤋ assert-end ⤋⤋⤋*/
                    add_reduce(state, data, 1, 16);
                    return 4;
                    /*⤋⤋⤋ assert-end ⤋⤋⤋*/
                } else {
                    /*
                       23:52 optional_newline=>o:n •
                    */
                    /*--LEAF--*/
                    /*⤋⤋⤋ assert-end ⤋⤋⤋*/
                    add_reduce(state, data, 1, 17);
                    return 4;
                }
            case 5:
                /*--LEAF--*/
                /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
                pushFN(data, branch_84fe79fd0b072710);
                pushFN(data, $indent_start);
                return 0;
            case 6:
                /*--LEAF--*/
                /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
                pushFN(data, branch_84fe79fd0b072710);
                pushFN(data, $indent_end);
                return 0;
            case 7:
                /*--LEAF--*/
                /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
                pushFN(data, branch_84fe79fd0b072710);
                pushFN(data, $literal);
                return 0;
            default:
                break;
        }
        return -1;
    }
/*production name: delimiter_sequence_group_014_102
            grammar index: 5
            bodies:
	5:16 delimiter_sequence_group_014_102=>• delimiter_items - 
            compile time: 10.247ms*/;
    function $delimiter_sequence_group_014_102(l, data, state) {
        /*--LEAF--*/
        /*⤋⤋⤋ assert-production-symbols ⤋⤋⤋*/
        pushFN(data, branch_942dff3e817decc8);
        pushFN(data, $delimiter_items);
        return 0;
        return -1;
    }
/*production name: delimiter_sequence
            grammar index: 7
            bodies:
	7:19 delimiter_sequence=>• delimiter_sequence delimiter_sequence_group_014_102 - 
		7:20 delimiter_sequence=>• delimiter_sequence_group_014_102 - 
            compile time: 21.154ms*/;
    function $delimiter_sequence(l, data, state) {
        /*--LEAF--*/
        /*⤋⤋⤋ assert-production-symbols ⤋⤋⤋*/
        pushFN(data, branch_e9418936f4020943);
        pushFN(data, $delimiter_items);
        return 0;
        return -1;
    }
    function $delimiter_sequence_goto(l, data, state, prod) {
        skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
        if (l.current_byte == 93/*[]]*/) {
            return 7;
        }
        /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
        if ((((l.current_byte == 92/*[\]*/) || l.isUniID(data)) || l.isNum(data)) || l.isSym(true, data)) {
            /*
               7:19 delimiter_sequence=>delimiter_sequence • delimiter_sequence_group_014_102
            */
            /*--LEAF--*/
            /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
            pushFN(data, branch_d7f0b9bc9c5e1805);
            pushFN(data, $delimiter_items);
            return 0;
        }
        return prod == 7 ? prod : -1;
    }
/*production name: delimiter_items
            grammar index: 8
            bodies:
	8:21 delimiter_items=>• optional_space - 
		8:22 delimiter_items=>• optional_space - 
		8:23 delimiter_items=>• mandatory_space - 
		8:24 delimiter_items=>• optional_newline - 
		8:25 delimiter_items=>• mandatory_newline - 
		8:26 delimiter_items=>• literal - 
            compile time: 217.065ms*/;
    function $delimiter_items(l, data, state) {
        /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
        if (cmpr_set(l, data, 14, 3, 3)) {
            /*
               8:21 delimiter_items=>• optional_space
               8:22 delimiter_items=>• optional_space
            */
            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
            pushFN(data, branch_bb3da79e2ee23957);
            pushFN(data, $optional_space);
            return 0;
            /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
        } else if (cmpr_set(l, data, 11, 3, 3)) {
            /*
               8:23 delimiter_items=>• mandatory_space
            */
            /*--LEAF--*/
            /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
            pushFN(data, branch_409d78a56c46912b);
            pushFN(data, $mandatory_space);
            return 0;
            /*⤋⤋⤋ assert-peek ⤋⤋⤋*/
        } else if (cmpr_set(l, data, 20, 3, 3)) {
            /*
               8:24 delimiter_items=>• optional_newline
               8:25 delimiter_items=>• mandatory_newline
            */
            /*⤋⤋⤋ post-peek-consume ⤋⤋⤋*/
            consume(l, data, state);
            /*⤋⤋⤋ assert-end ⤋⤋⤋*/
            if (!((((assert_ascii(l, 0x0, 0x0, 0x30000001, 0x28000000) || l.END(data)) || l.isUniID(data)) || l.isNum(data)) || l.isSym(true, data)) || ((((dt_64d6ef85c2406ef0(l, data) || cmpr_set(l, data, 11, 3, 3)) || dt_e0825731bf138308(l, data)) || assert_ascii(l, 0x0, 0x0, 0x30000001, 0x28000000)) || l.END(data))) {
                /*
                   22:51 mandatory_newline=>o:n •
                */
                /*--LEAF--*/
                /*⤋⤋⤋ assert-end ⤋⤋⤋*/
                add_reduce(state, data, 1, 16);
                return 8;
                /*⤋⤋⤋ assert-end ⤋⤋⤋*/
            } else {
                /*
                   23:52 optional_newline=>o:n •
                */
                /*--LEAF--*/
                /*⤋⤋⤋ assert-end ⤋⤋⤋*/
                add_reduce(state, data, 1, 17);
                return 8;
            }
            /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
        } else {
            /*
               8:26 delimiter_items=>• literal
            */
            /*--LEAF--*/
            /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
            pushFN(data, branch_409d78a56c46912b);
            pushFN(data, $literal);
            return 0;
        }
        return -1;
    }
/*production name: optional_flagged
            grammar index: 9
            bodies:
	9:27 optional_flagged=>• { θid : rules } - 
            compile time: 14.349ms*/;
    function $optional_flagged(l, data, state) {
        /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
        if (l.current_byte == 123/*[{]*/) {
            /*
               9:27 optional_flagged=>{ • θid : rules }
            */
            consume(l, data, state);
            /*--LEAF--*/
            /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
            if (l.isUniID(data) && consume(l, data, state)) {
                skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
                if ((l.current_byte == 58/*[:]*/) && consume(l, data, state)) {
                    skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
                    pushFN(data, branch_6a8e92431bd06da7);
                    pushFN(data, $rules);
                    return 0;
                }
            }
        }
        return -1;
    }
/*production name: member_select_group_223_104
            grammar index: 10
            bodies:
	10:28 member_select_group_223_104=>• [ θnum ] - 
            compile time: 1.393ms*/;
    function $member_select_group_223_104(l, data, state) {
        /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
        if (l.current_byte == 91/*[[]*/) {
            /*
               10:28 member_select_group_223_104=>[ • θnum ]
            */
            consume(l, data, state);
            /*--LEAF--*/
            /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
            if (l.isNum(data) && consume(l, data, state)) {
                skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
                if ((l.current_byte == 93/*[]]*/) && consume(l, data, state)) {
                    add_reduce(state, data, 3, 5);
                    return 10;
                }
            }
        }
        return -1;
    }
/*production name: member_select_group_024_105
            grammar index: 11
            bodies:
	11:29 member_select_group_024_105=>• ? - 
            compile time: 3.107ms*/;
    function $member_select_group_024_105(l, data, state) {
        /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
        if (l.current_byte == 63/*[?]*/) {
            /*
               11:29 member_select_group_024_105=>? •
            */
            consume(l, data, state);
            /*--LEAF--*/
            /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
            return 11;
        }
        return -1;
    }
/*production name: member_spread_group_226_106
            grammar index: 13
            bodies:
	13:34 member_spread_group_226_106=>• [ delimiter_sequence ] - 
            compile time: 3.111ms*/;
    function $member_spread_group_226_106(l, data, state) {
        /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
        if (l.current_byte == 91/*[[]*/) {
            /*
               13:34 member_spread_group_226_106=>[ • delimiter_sequence ]
            */
            consume(l, data, state);
            /*--LEAF--*/
            /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
            pushFN(data, branch_da4663752f29c5ce);
            pushFN(data, $delimiter_sequence);
            return 0;
        }
        return -1;
    }
/*production name: literal_group_031_107
            grammar index: 15
            bodies:
	15:37 literal_group_031_107=>• θid - 
		15:38 literal_group_031_107=>• θnum - 
		15:39 literal_group_031_107=>• θsym - 
            compile time: 1.127ms*/;
    function $literal_group_031_107(l, data, state) {
        /*⤋⤋⤋ assert ⤋⤋⤋*/
        if ((l.isUniID(data) || l.isNum(data)) || l.isSym(true, data)) {
            /*
               15:37 literal_group_031_107=>• θid
               15:38 literal_group_031_107=>• θnum
               15:39 literal_group_031_107=>• θsym
            */
            /*--LEAF--*/
            /*⤋⤋⤋ assert ⤋⤋⤋*/
            consume(l, data, state);
            return 15;
        }
        return -1;
    }
/*production name: literal
            grammar index: 16
            bodies:
	16:40 literal=>• literal_token - 
		16:41 literal=>• \ literal_group_031_107 - 
            compile time: 8.158ms*/;
    function $literal(l, data, state) {
        /*⤋⤋⤋ assert ⤋⤋⤋*/
        if (l.current_byte == 92/*[\]*/) {
            /*
               16:41 literal=>• \ literal_group_031_107
            */
            /*--LEAF--*/
            /*⤋⤋⤋ assert ⤋⤋⤋*/
            consume(l, data, state);
            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
            pushFN(data, branch_caa19ef7c88d63c6);
            pushFN(data, $literal_group_031_107);
            return 0;
            /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
        } else {
            /*
               16:40 literal=>• literal_token
            */
            /*--LEAF--*/
            /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
            pushFN(data, branch_96da2aad171d376f);
            pushFN(data, $literal_token);
            return 0;
        }
        return -1;
    }
/*production name: literal_token_group_235_108
            grammar index: 17
            bodies:
	17:42 literal_token_group_235_108=>• θid - [ws]generated
		17:43 literal_token_group_235_108=>• θnum - [ws]generated
		17:44 literal_token_group_235_108=>• θsym - [ws]generated
            compile time: 0.985ms*/;
    function $literal_token_group_235_108(l, data, state) {
        /*⤋⤋⤋ assert ⤋⤋⤋*/
        if ((l.isUniID(data) || l.isNum(data)) || l.isSym(true, data)) {
            /*
               17:42 literal_token_group_235_108=>• θid
               17:43 literal_token_group_235_108=>• θnum
               17:44 literal_token_group_235_108=>• θsym
            */
            /*--LEAF--*/
            /*⤋⤋⤋ assert ⤋⤋⤋*/
            consume(l, data, state);
            return 17;
        }
        return -1;
    }
/*production name: literal_token
            grammar index: 19
            bodies:
	19:47 literal_token=>• literal_token literal_token_group_235_108 - 
		19:48 literal_token=>• literal_token_group_235_108 - 
            compile time: 205.315ms*/;
    function $literal_token(l, data, state) {
        /*--LEAF--*/
        /*⤋⤋⤋ assert-production-symbols ⤋⤋⤋*/
        pushFN(data, branch_c1a8b7e421d06feb);
        pushFN(data, $literal_token_group_235_108);
        return 0;
        return -1;
    }
    function $literal_token_goto(l, data, state, prod) {
        while (1) {
            skip_27d8e42c3256622b(l/*[ ws ][ nl ]*/, data, true);
            if (((dt_64d6ef85c2406ef0(l, data) || cmpr_set(l, data, 11, 3, 3)) || dt_e0825731bf138308(l, data)) || assert_ascii(l, 0x0, 0x0, 0x30000001, 0x28000000)) {
                return 19;
            }
            /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
            if ((l.isUniID(data) || l.isNum(data)) || l.isSym(true, data)) {
                /*
                   19:47 literal_token=>literal_token • literal_token_group_235_108
                */
                /*--LEAF--*/
                /*⤋⤋⤋ peek-production-symbols ⤋⤋⤋*/
                pushFN(data, branch_f917b2c5d74b17b0);
                pushFN(data, $literal_token_group_235_108);
                return 0;
            }
            break;
        }
        return prod == 19 ? prod : -1;
    }
/*production name: mandatory_space
            grammar index: 20
            bodies:
	20:49 mandatory_space=>• m:s - 
            compile time: 1.476ms*/;
    function $mandatory_space(l, data, state) {
        /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
        if (cmpr_set(l, data, 11, 3, 3)) {
            /*
               20:49 mandatory_space=>m:s •
            */
            consume(l, data, state);
            /*--LEAF--*/
            /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
            add_reduce(state, data, 1, 14);
            return 20;
        }
        return -1;
    }
/*production name: optional_space
            grammar index: 21
            bodies:
	21:50 optional_space=>• o:s - 
            compile time: 1.55ms*/;
    function $optional_space(l, data, state) {
        /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
        if (cmpr_set(l, data, 14, 3, 3)) {
            /*
               21:50 optional_space=>o:s •
            */
            consume(l, data, state);
            /*--LEAF--*/
            /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
            add_reduce(state, data, 1, 15);
            return 21;
        }
        return -1;
    }
/*production name: indent_start
            grammar index: 24
            bodies:
	24:53 indent_start=>• i:s - 
            compile time: 1.066ms*/;
    function $indent_start(l, data, state) {
        /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
        if (cmpr_set(l, data, 17, 3, 3)) {
            /*
               24:53 indent_start=>i:s •
            */
            consume(l, data, state);
            /*--LEAF--*/
            /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
            add_reduce(state, data, 1, 18);
            return 24;
        }
        return -1;
    }
/*production name: indent_end
            grammar index: 25
            bodies:
	25:54 indent_end=>• i:e - 
            compile time: 1.438ms*/;
    function $indent_end(l, data, state) {
        /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
        if (cmpr_set(l, data, 23, 3, 3)) {
            /*
               25:54 indent_end=>i:e •
            */
            consume(l, data, state);
            /*--LEAF--*/
            /*⤋⤋⤋ assert-consume ⤋⤋⤋*/
            add_reduce(state, data, 1, 19);
            return 25;
        }
        return -1;
    }
    function recognizer(data, input_byte_length, production) {
        data.input_len = input_byte_length;
        data.lexer.next(data);
        // skip_6725b1140c2474a9(data.lexer/*[ nl ]*/,data,true);
        dispatch(data, 0);
        run(data);
    }

    const data_stack = [];
    function run(data) {
        data_stack.length = 0;
        data_stack.push(data);
        let ACTIVE = true;
        while (ACTIVE) {
            for (const data of data_stack)
                ACTIVE = stepKernel(data, 0);
        }
    }

    function stepKernel(data, stack_base) {

        let ptr = data.stack_ptr;

        const fn = data.stack[ptr];

        data.stack_ptr--;

        const result = fn(data.lexer, data, data.state, data.prod);

        data.prod = result;

        if (result < 0 || data.stack_ptr < stack_base)
            return false;

        return true;
    }

    function get_fork_information() {
        let i = 0;
        const fork_data = [];
        for (const fork of data_stack) {
            fork_data.push({
                ptr: i++,
                valid: fork.valid || true,
                depth: fork.origin_fork + fork.rules_ptr,
                command_offset: 0,
                command_block: new Uint16Array(64),
            });
        }
        return fork_data;
    }

    function get_next_command_block(fork) {

        const remainder = block64Consume(data_stack[fork.ptr], fork.command_block, fork.command_offset, 0, 64);

        fork.command_offset += 64 - remainder;

        if (remainder > 0)
            fork.command_block[64 - remainder] = 0;

        return fork.command_block;
    }

    function pushFN(data, fn_ref) { data.stack[++data.stack_ptr] = fn_ref; }

    function init_table() { return lookup_table; }


    function dispatch(data, production_index) {
        switch (production_index) {
            case 0: pushFN(data, $render); return;
            case 1: pushFN(data, $rules_group_02_100); return;
            case 2: pushFN(data, $rules); return;
            case 3: pushFN(data, $rule); return;
            case 4: pushFN(data, $delimiter_sequence_group_014_102); return;
            case 5: pushFN(data, $delimiter_sequence); return;
            case 6: pushFN(data, $delimiter_items); return;
            case 7: pushFN(data, $optional_flagged); return;
            case 8: pushFN(data, $member_select_group_223_104); return;
            case 9: pushFN(data, $member_select_group_024_105); return;
            case 10: pushFN(data, $member_spread_group_226_106); return;
            case 11: pushFN(data, $literal_group_031_107); return;
            case 12: pushFN(data, $literal); return;
            case 13: pushFN(data, $literal_token_group_235_108); return;
            case 14: pushFN(data, $literal_token); return;
            case 15: pushFN(data, $mandatory_space); return;
            case 16: pushFN(data, $optional_space); return;
            case 17: pushFN(data, $indent_start); return;
            case 18: pushFN(data, $indent_end); return;
        }
    }



    function delete_data() { };
    ;
    return {
        recognizer,
        init_data,
        init_table,
        delete_data,
        get_fork_information,
        get_next_command_block
    };
});

const fns = [(e, sym) => sym[sym.length - 1],
(env, sym, pos) => ((rules => (state) => rules.map(r => r(state)).join(""))(sym[0] || []))/*0*/
    , (env, sym, pos) => ((sym[0].push(sym[1]), sym[0]))/*1*/
    , (env, sym, pos) => ([sym[0]])/*2*/
    , (env, sym, pos) => ((({ emptyProp }, flag, rules) => (state) => !emptyProp(state, flag) ? rules.map(r => r(state)).join("") : "")(env, sym[1], sym[3]))/*3*/
    , (env, sym, pos) => (sym[1])/*4*/
    , (env, sym, pos) => ((({ propertyToString }, prop, index, optional) => (state) => propertyToString(state, prop, index, optional))(env, sym[1], parseInt(sym[2] || "0"), !!sym[3]))/*5*/
    , (env, sym, pos) => ((({ propertyToString }, prop, index, optional) => (state) => propertyToString(state, prop, index, optional))(env, sym[1], parseInt(null || "0"), !!sym[2]))/*6*/
    , (env, sym, pos) => ((({ propertyToString }, prop, index, optional) => (state) => propertyToString(state, prop, index, optional))(env, sym[1], parseInt(sym[2] || "0"), !!null))/*7*/
    , (env, sym, pos) => ((({ propertyToString }, prop, index, optional) => (state) => propertyToString(state, prop, index, optional))(env, sym[1], parseInt(null || "0"), !!null))/*8*/
    , (env, sym, pos) => ((({ propertyToString }, prop, index, delimiter) => (state) => propertyToString(state, prop, index, true, delimiter))(env, sym[1], Infinity, sym[3] || undefined))/*9*/
    , (env, sym, pos) => ((({ propertyToString }, prop, index, delimiter) => (state) => propertyToString(state, prop, index, true, delimiter))(env, sym[1], Infinity, null || undefined))/*10*/
    , (env, sym, pos) => ((({ addLiteral }, _) => (state) => addLiteral(state, _))(env, sym[0]))/*11*/
    , (env, sym, pos) => ((({ addLiteral }, _) => (state) => addLiteral(state, _))(env, sym[1]))/*12*/
    , (env, sym, pos) => ((({ addSpace }) => (state) => addSpace(state, false))(env))/*13*/
    , (env, sym, pos) => ((({ addSpace }) => (state) => addSpace(state, true))(env))/*14*/
    , (env, sym, pos) => ((({ addNewLine }) => (state) => addNewLine(state, false))(env))/*15*/
    , (env, sym, pos) => ((({ addNewLine }) => (state) => addNewLine(state, true))(env))/*16*/
    , (env, sym, pos) => ((({ increaseIndent }) => (state) => increaseIndent(state, true))(env))/*17*/
    , (env, sym, pos) => ((({ decreaseIndent }) => (state) => decreaseIndent(state, true))(env))/*18*/];

const parser_factory = ParserFactory(fns, undefined, data);

export { fns as parser_functions, data as parser_data, parser_factory };