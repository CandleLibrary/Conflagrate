
import {
    ParserFramework,
    KernelParserCore,
    fillByteBufferWithUTF8FromString
} from "@candlelib/hydrocarbon";


const {
    token_production,
    init_table,
    KernelStateIterator,
    run,
    compare
} = KernelParserCore;

const token_sequence_lookup = new Uint8Array([
123,58,125,64,63,46,46,46,92,109,58,115,111,58,115,105,58,115,91,93,44,110,111,
116,109,58,110,111,58,110,105,58,101,111,114
])

const token_lookup = new Uint32Array([
16663468,384,386,16675758,16768,392,33538990,33473454,82304,16647084,37618094,
37618092,4063660,1416,16779648,2432,12672,8576,33485742,16708526,65920,33452974,
131500,131456,50230190,172,128,132,136,160,262528,524672,1048960,2097536,416,
33554816,104726956,67109280,428,8,32,4,50229806,67109248
]);

const states_buffer = new Uint32Array([
0,4026531840,2164260864,4026531841,2147483648,2147483649,603979787,603979818,
603979790,603979842,0,1073742088,805306368,0,1073742344,805306369,0,805306370,
0,2852126723,196609,196620,2147483665,2143289353,2172649474,2172649475,2147483668,
2168455173,2168455182,2147483671,2147483666,2147483667,2147483669,2147483670,
603979815,603979842,0,4026531840,0,1073742608,805306369,0,3087007804,2768240650,
0,65539,2147489794,2151692289,2147483653,805306370,3221225472,0,1073742344,805306369,
3221225472,0,603979818,603979795,0,4026531840,2499805185,0,65537,4026531840,
0,0,2852126726,1,196620,2147489809,2143295497,2172655618,2172655619,2147489812,
2168461317,2168455182,2147489815,2147489810,2147489811,2147489813,2147489814,
2147483650,603979864,0,2147483650,603979924,0,4026531840,2583756814,262145,65538,
4026531840,0,603979872,0,0,2516582403,327681,65538,4026531840,0,603979880,0,
0,2785017860,393217,262160,2147487760,2185232385,2185232386,2185232387,2147483668,
2181038085,2147483670,2147483671,2147483672,2147483657,2147483665,2147483666,
2147483667,2147483669,2147483662,2147483663,603979904,0,603979914,0,4026531840,
2852192261,458753,1,2147483662,2147483654,268435456,603979793,603980242,0,4026531840,
2852192261,524289,1,2147483662,2147483655,268435456,603979793,603980312,0,4026531840,
2852126758,589825,196619,2147483665,2143336457,2172649474,2172649475,2147520532,
2168455173,2147541014,2147551255,2147489810,2147500051,2147510293,603979793,
603980359,0,2147483658,268435456,1073747464,805306370,0,2147483659,268435456,
1073747720,805306370,0,2147483661,268435456,1073748232,805306370,0,2147483660,
268435456,1073747976,805306370,0,2147483653,268435456,603979793,603980050,0,
2147483662,268435456,1073748488,805306370,0,2147483663,268435456,1073748744,
805306370,0,4026531840,0,1073742344,805306371,0,2852126723,720897,196616,2147483666,
2147483665,2139095042,2160066563,2147483668,2155872261,2147483667,2147483669,
603979997,603980016,0,4026531840,0,1073742608,805306371,0,3087007978,2499805187,
0,65539,4026531840,0,0,603980000,603979981,0,2499805187,0,65537,4026531840,0,
0,2852126740,786433,196616,2147491858,2147516433,2139127810,2160099331,2147508244,
2155905029,2147483667,2147500053,2147483652,603980048,603980479,0,2147483652,
603980048,603980469,0,2147483652,603980048,603980499,0,2147483652,603980048,
603980489,0,2147483652,603980048,603980359,0,4026531840,805306372,0,2852126726,
851969,65538,2147483658,2147489795,268435456,603980062,0,268435456,603980156,
0,4026531840,2852192259,327681,1,2147483651,268435456,603980070,0,4026531840,
2852126732,917505,65538,2147483672,2147493899,2147483664,268435456,603980088,
603980509,0,268435456,2147483649,603980128,603979818,603979790,603979842,0,4026531840,
2852192263,983041,1,2147483659,268435456,2147483649,603980100,603979818,603979790,
603979842,0,4026531840,2852126731,1048577,65538,2147483660,2147497997,268435456,
2147483649,603980118,603979818,603979790,603979842,0,268435456,1073743416,805306373,
0,4026531840,0,2852192260,1114113,1,2147483661,268435456,1073742920,805306373,
0,4026531840,0,2852126731,1048577,65538,2147483660,2147497997,268435456,2147483649,
603980146,603979818,603979790,603979842,0,268435456,1073743664,805306373,0,4026531840,
0,2852192260,1114113,1,2147483661,268435456,1073743168,805306373,0,4026531840,
0,2852126732,917505,65538,2147483672,2147493899,2147483664,268435456,603980174,
603980509,0,268435456,2147483649,603980214,603979818,603979790,603979842,0,4026531840,
2852192263,983041,1,2147483659,268435456,2147483649,603980186,603979818,603979790,
603979842,0,4026531840,2852126731,1048577,65538,2147483660,2147497997,268435456,
2147483649,603980204,603979818,603979790,603979842,0,268435456,1073744432,805306373,
0,4026531840,0,2852192260,1114113,1,2147483661,268435456,1073743936,805306373,
0,4026531840,0,2852126731,1048577,65538,2147483660,2147497997,268435456,2147483649,
603980232,603979818,603979790,603979842,0,268435456,1073744680,805306373,0,4026531840,
0,2852192260,1114113,1,2147483661,268435456,1073744184,805306373,0,4026531840,
0,2852192259,327681,1,2147483651,268435456,603980250,0,4026531840,2852126732,
1179649,262161,2147502097,2143307777,2181056514,2181056515,2147502100,2193639429,
2147502102,2147502103,2147483672,2147502089,2147502098,2147502099,2147502092,
2147502093,2147502094,2147493903,2147502101,2147483665,268435456,603980284,603980527,
0,268435456,1073745176,805306374,0,1073745680,805306374,0,4026531840,0,2852126727,
1245185,262160,2147491857,2143297537,2172657666,2176851971,2147491860,2172657669,
2147491862,2147491863,2147491858,2147491849,2147491859,2147491861,2147491852,
2147491853,2147491854,2147483663,268435456,1073744928,805306374,0,1073745432,
805306374,0,4026531840,0,2852192259,327681,1,2147483651,268435456,603980320,
0,4026531840,2852192259,1310721,1,2147483664,268435456,603980328,0,4026531840,
2852126728,1376257,262160,2147493905,2143299585,2181048322,2181048323,2147493908,
2189436933,2147493910,2147493911,2147483672,2147493897,2147493906,2147493907,
2147493900,2147493901,2147493902,2147493909,2147483666,268435456,603980356,603980545,
0,1073746200,805306375,0,4026531840,1073745952,805306375,0,2852126727,1441793,
131076,2147483665,2143295493,2147489794,2147489795,2147483656,603980375,0,2147483656,
603980388,603980391,0,4026531840,0,2852192260,1507329,1,2147483665,268435456,
603980385,603980625,0,4026531840,0,1073746704,805306376,0,1073746440,805306376,
0,2852126732,1638426,65539,2147483650,2151686147,2147500037,2147483657,603980453,
603980411,0,2147483657,603980453,603980421,0,2147483657,603980453,603980431,
0,4026531840,0,2852192260,1769498,1,2147483650,268435456,1073746952,805306377,
0,4026531840,0,2852192260,1835034,1,2147483651,268435456,1073746952,805306377,
0,4026531840,0,2852192260,1900570,1,2147483653,268435456,1073746952,805306377,
0,4026531840,0,2852126724,1572865,65539,2147483650,2151677955,2147483653,268435456,
1073747216,805306377,0,4026531840,0,3087008431,2499805193,0,65539,4026531840,
0,0,603980453,603980441,0,2499805193,0,65537,4026531840,0,0,2852192261,1966081,
1,2147483666,2147483658,268435456,1073747464,805306378,0,4026531840,2852192261,
2031617,1,2147483667,2147483659,268435456,1073747720,805306379,0,4026531840,
2852192261,2097153,1,2147483668,2147483660,268435456,1073747976,805306380,0,
4026531840,2852192261,2162689,1,2147483669,2147483661,268435456,1073748232,805306381,
0,4026531840,2852192259,2228225,1,2147483653,268435456,603980517,0,4026531840,
2852192260,2293761,1,2147483673,268435456,1073749016,805306384,0,4026531840,
0,2852192259,2228225,1,2147483653,268435456,603980535,0,4026531840,2852192260,
2293761,1,2147483673,268435456,1073749016,805306385,0,4026531840,0,2852126728,
786433,196616,2147487762,2147487761,2139099138,2160070659,2147487764,2155872261,
2147487763,2147487765,603980565,0,2147483651,603980615,603980000,603979978,603980016,
0,4026531840,2785017860,2359297,196618,2185236498,2176847889,2139099138,2160070659,
2147487764,2155876357,2147487763,2147487765,2147487769,2147483674,603980583,
0,603980609,0,4026531840,2852192261,2424833,1,2147483653,2147483668,268435456,
603980593,603980887,0,4026531840,2147483651,603980599,603980000,603979978,603980016,
0,2852192260,2293761,1,2147483673,268435456,1073749280,805306386,0,4026531840,
0,2147483651,603980615,603980000,603979978,603980016,0,2852192260,2293761,1,
2147483673,268435456,1073749528,805306386,0,4026531840,0,2852126736,1441793,
131076,2147483665,2143305733,2147508226,2147491843,2147483667,603980871,603980649,
0,2147483667,603980871,603980669,0,2147483667,603980871,603980679,0,2147483667,
603980871,603980689,0,4026531840,2852192259,1507329,1,2147483665,268435456,603980657,
0,4026531840,2852126724,2490369,65539,2147483650,2151677955,2147483653,268435456,
1073746960,805306387,0,4026531840,0,2852192260,2555904,1,2147483651,268435456,
1073746952,805306387,0,4026531840,0,2852192260,2621440,1,2147483653,268435456,
1073746952,805306387,0,4026531840,0,2852192260,2686976,1,2147483650,268435456,
1073746952,805306387,0,4026531840,0,2852126728,1572865,131076,2147483665,2143297541,
2147495938,2147487747,603980715,0,603980775,0,603980807,0,603980839,0,4026531840,
2785017860,1441793,131076,2147487761,2143289349,2147483650,2147483651,603980727,
0,603980769,0,4026531840,2785017858,1572865,262160,2147483665,2143289345,2172649474,
2176843779,2147483668,2172649477,2147483670,2147483671,2147483666,2172649481,
2147483667,2147483669,2147483660,2147483661,2147483662,2147483673,603980749,
0,4026531840,2852192259,1572865,1,2147483665,268435456,603980757,0,4026531840,
2852126724,2490369,65539,2147483650,2151677955,2147483653,268435456,1073749784,
805306387,0,4026531840,0,2516582417,1441793,65537,4026531840,4026531840,0,2785017858,
1572865,262160,2147483665,2143289345,2172649474,2176843779,2147483668,2172649477,
2147483670,2147483671,2147483666,2172649481,2147483667,2147483669,2147483660,
2147483661,2147483662,2147483673,603980797,0,4026531840,2852192260,2752512,1,
2147483651,268435456,1073747216,805306387,0,4026531840,0,2785017858,1572865,
262160,2147483665,2143289345,2172649474,2176843779,2147483668,2172649477,2147483670,
2147483671,2147483666,2172649481,2147483667,2147483669,2147483660,2147483661,
2147483662,2147483673,603980829,0,4026531840,2852192260,2752512,1,2147483653,
268435456,1073747216,805306387,0,4026531840,0,2785017858,1572865,262160,2147483665,
2143289345,2172649474,2176843779,2147483668,2172649477,2147483670,2147483671,
2147483666,2172649481,2147483667,2147483669,2147483660,2147483661,2147483662,
2147483673,603980861,0,4026531840,2852192260,2752512,1,2147483650,268435456,
1073747216,805306387,0,4026531840,0,3087008849,2499805203,0,65539,4026531840,
0,0,603980871,603980699,0,2499805203,0,65537,4026531840,0,0,2852192260,2818049,
1,2147483674,268435456,1073750032,805306388,0,4026531840,0
]);

function isTokenActive(token_id, row){
    var index  = ( row  ) + ( token_id  >> 5 );;
    var shift  = 1 << ( 31 & ( token_id ) );;
    return ( token_lookup[index] & shift ) != 0
}

function scan_core(l, tk_row){
    switch(( l.get_byte_at( l.byte_offset ) & 127 )){
    case 44: 
    {
        if( l.get_byte_at( l.byte_offset  ) == 44 ){
            if( isTokenActive( 26, tk_row ) ){
                l.setToken( 26, 1, 1 );
                return
            }
        }
    }
    break;
    case 46: 
    {
        if( l.get_byte_at( l.byte_offset  ) == 46 ){
            if( isTokenActive( 16, tk_row ) && 2 == compare( l, l.byte_offset  + 1, 6, 2, token_sequence_lookup ) ){
                l.setToken( 16, 3, 3 );
                return
            }
        }
    }
    break;
    case 58: 
    {
        if( l.get_byte_at( l.byte_offset  ) == 58 ){
            if( isTokenActive( 11, tk_row ) ){
                l.setToken( 11, 1, 1 );
                return
            }
        }
    }
    break;
    case 63: 
    {
        if( l.get_byte_at( l.byte_offset  ) == 63 ){
            if( isTokenActive( 15, tk_row ) ){
                l.setToken( 15, 1, 1 );
                return
            }
        }
    }
    break;
    case 64: 
    {
        if( l.get_byte_at( l.byte_offset  ) == 64 ){
            if( isTokenActive( 14, tk_row ) ){
                l.setToken( 14, 1, 1 );
                return
            }
        }
    }
    break;
    case 91: 
    {
        if( l.get_byte_at( l.byte_offset  ) == 91 ){
            if( isTokenActive( 24, tk_row ) ){
                l.setToken( 24, 1, 1 );
                return
            }
        }
    }
    break;
    case 92: 
    {
        if( l.get_byte_at( l.byte_offset  ) == 92 ){
            if( isTokenActive( 17, tk_row ) ){
                l.setToken( 17, 1, 1 );
                return
            }
        }
    }
    break;
    case 93: 
    {
        if( l.get_byte_at( l.byte_offset  ) == 93 ){
            if( isTokenActive( 25, tk_row ) ){
                l.setToken( 25, 1, 1 );
                return
            }
        }
    }
    break;
    case 105: 
    {
        if( l.get_byte_at( l.byte_offset  ) == 105 ){
            if( l.get_byte_at( l.byte_offset  + 1 ) == 58 ){
                if( l.get_byte_at( l.byte_offset  + 2 ) == 115 ){
                    if( isTokenActive( 22, tk_row ) ){
                        l.setToken( 22, 3, 3 );
                        return
                    }
                } else if( l.get_byte_at( l.byte_offset  + 2 ) == 101 ){
                    if( isTokenActive( 23, tk_row ) ){
                        l.setToken( 23, 3, 3 );
                        return
                    }
                }
            }
        }
    }
    break;
    case 109: 
    {
        if( l.get_byte_at( l.byte_offset  ) == 109 ){
            if( l.get_byte_at( l.byte_offset  + 1 ) == 58 ){
                if( l.get_byte_at( l.byte_offset  + 2 ) == 115 ){
                    if( isTokenActive( 18, tk_row ) ){
                        l.setToken( 18, 3, 3 );
                        return
                    }
                } else if( l.get_byte_at( l.byte_offset  + 2 ) == 110 ){
                    if( isTokenActive( 20, tk_row ) ){
                        l.setToken( 20, 3, 3 );
                        return
                    }
                }
            }
        }
    }
    break;
    case 110: 
    {
        if( l.get_byte_at( l.byte_offset  ) == 110 ){
            if( 2 == compare( l, l.byte_offset  + 1, 22, 2, token_sequence_lookup ) ){
                if( isTokenActive( 3, tk_row ) && l.isUniID(  ) && l.byte_length  > 3 ){
                    l._type  = 3;
                    return
                } else if( isTokenActive( 10, tk_row ) ){
                    l.setToken( 10, 3, 3 );
                    return
                }
            }
        }
    }
    break;
    case 111: 
    {
        if( l.get_byte_at( l.byte_offset  ) == 111 ){
            if( l.get_byte_at( l.byte_offset  + 1 ) == 58 ){
                if( l.get_byte_at( l.byte_offset  + 2 ) == 115 ){
                    if( isTokenActive( 19, tk_row ) ){
                        l.setToken( 19, 3, 3 );
                        return
                    }
                } else if( l.get_byte_at( l.byte_offset  + 2 ) == 110 ){
                    if( isTokenActive( 21, tk_row ) ){
                        l.setToken( 21, 3, 3 );
                        return
                    }
                }
            } else if( l.get_byte_at( l.byte_offset  + 1 ) == 114 ){
                if( isTokenActive( 3, tk_row ) && l.isUniID(  ) && l.byte_length  > 2 ){
                    l._type  = 3;
                    return
                } else if( isTokenActive( 12, tk_row ) ){
                    l.setToken( 12, 2, 2 );
                    return
                }
            }
        }
    }
    break;
    case 123: 
    {
        if( l.get_byte_at( l.byte_offset  ) == 123 ){
            if( isTokenActive( 9, tk_row ) ){
                l.setToken( 9, 1, 1 );
                return
            }
        }
    }
    break;
    case 125: 
    {
        if( l.get_byte_at( l.byte_offset  ) == 125 ){
            if( isTokenActive( 13, tk_row ) ){
                l.setToken( 13, 1, 1 );
                return
            }
        }
    }
    break;
    default: 
    break
};
    if( isTokenActive( 0, tk_row ) && false ){
    l._type  = 0;
    return
} else if( isTokenActive( 8, tk_row ) && l.isSP( true ) ){
    l._type  = 8;
    return
} else if( isTokenActive( 3, tk_row ) && l.isUniID(  ) ){
    l._type  = 3;
    return
} else if( isTokenActive( 2, tk_row ) && l.isSym( true ) ){
    l._type  = 2;
    return
} else if( isTokenActive( 7, tk_row ) && l.isNL(  ) ){
    l._type  = 7;
    return
} else if( isTokenActive( 5, tk_row ) && l.isNum(  ) ){
    l._type  = 5;
    return
}
}

function scan(l, token, skip){
    if( ( ( l._type ) <= 0 ) )scan_core( l, token );;
    if( ( skip  > 0 && isTokenActive( l._type, skip ) ) ){
    while( ( isTokenActive( l._type, skip ) ) ) {
            l.next(  );
            scan_core( l, token )
        }
}
}

const js_parser_pack = {

    init_table: () => {
        const table = new Uint8Array(382976);
        init_table(table);
        return table;
    },

    create_iterator: (data) => {
        return new KernelStateIterator(data);
    },

    recognize: (string, entry_index) => {

        const temp_buffer = new Uint8Array(string.length * 4);

        const actual_length = fillByteBufferWithUTF8FromString(string, temp_buffer, temp_buffer.length);

        const input_buffer = new Uint8Array(temp_buffer.buffer, 0, actual_length);

        let entry_pointer = 0;

        switch(entry_index){

            case 0: default:  entry_pointer = 67108868; break;
        }
        
        return run(
            states_buffer,
            input_buffer,
            input_buffer.length,
            entry_pointer,
            scan,
            false
        );
    }
};

const reduce_functions = [(_,s)=>s[s.length-1], (env, sym, pos)=> ((rules=>(state)=>rules.map(r=>r(state)).join(""))(sym[0]||[])) /*0*/,
(env, sym, pos)=> ([sym[0]]) /*1*/,
(env, sym, pos)=> ((sym[0].push(sym[1]),sym[0])) /*2*/,
(env, sym, pos)=> ((({emptyProp},flag,rules,alt_rules,index,NOT)=>(state)=>(!emptyProp(state,flag,index))&&!NOT?rules.map(r=>r(state)).join(""):alt_rules.map(r=>r(state)).join(""))(env,sym[2],sym[5],sym[7]||[],sym[3],!!sym[1])) /*3*/,
(env, sym, pos)=> ((({emptyProp},flag,rules,alt_rules,index,NOT)=>(state)=>(!emptyProp(state,flag,index))&&!NOT?rules.map(r=>r(state)).join(""):alt_rules.map(r=>r(state)).join(""))(env,sym[2],sym[4],sym[6]||[],!!sym[1])) /*4*/,
(env, sym, pos)=> ((({emptyProp},flag,rules,alt_rules,index,NOT)=>(state)=>(!emptyProp(state,flag,index))&&!NOT?rules.map(r=>r(state)).join(""):alt_rules.map(r=>r(state)).join(""))(env,sym[2],sym[5],null||[],sym[3],!!sym[1])) /*5*/,
(env, sym, pos)=> ((({emptyProp},flag,rules,alt_rules,index,NOT)=>(state)=>(!emptyProp(state,flag,index))&&!NOT?rules.map(r=>r(state)).join(""):alt_rules.map(r=>r(state)).join(""))(env,sym[2],sym[4],null||[],!!sym[1])) /*6*/,
(env, sym, pos)=> ((({emptyProp},flag,rules,alt_rules,index,NOT)=>(state)=>(!emptyProp(state,flag,index))&&!NOT?rules.map(r=>r(state)).join(""):alt_rules.map(r=>r(state)).join(""))(env,sym[1],sym[4],sym[6]||[],sym[2],!!null)) /*7*/,
(env, sym, pos)=> ((({emptyProp},flag,rules,alt_rules,index,NOT)=>(state)=>(!emptyProp(state,flag,index))&&!NOT?rules.map(r=>r(state)).join(""):alt_rules.map(r=>r(state)).join(""))(env,sym[1],sym[3],sym[5]||[],!!null)) /*8*/,
(env, sym, pos)=> ((({emptyProp},flag,rules,alt_rules,index,NOT)=>(state)=>(!emptyProp(state,flag,index))&&!NOT?rules.map(r=>r(state)).join(""):alt_rules.map(r=>r(state)).join(""))(env,sym[1],sym[4],null||[],sym[2],!!null)) /*9*/,
(env, sym, pos)=> ((({emptyProp},flag,rules,alt_rules,index,NOT)=>(state)=>(!emptyProp(state,flag,index))&&!NOT?rules.map(r=>r(state)).join(""):alt_rules.map(r=>r(state)).join(""))(env,sym[1],sym[3],null||[],!!null)) /*10*/,
(env, sym, pos)=> ((({propertyToString},prop,index,optional)=>(state)=>propertyToString(state,prop,index,optional))(env,sym[1],parseInt(sym[2]||"0"),!!sym[3])) /*11*/,
(env, sym, pos)=> ((({propertyToString},prop,index,optional)=>(state)=>propertyToString(state,prop,index,optional))(env,sym[1],parseInt(null||"0"),!!sym[2])) /*12*/,
(env, sym, pos)=> ((({propertyToString},prop,index,optional)=>(state)=>propertyToString(state,prop,index,optional))(env,sym[1],parseInt(sym[2]||"0"),!!null)) /*13*/,
(env, sym, pos)=> ((({propertyToString},prop,index,optional)=>(state)=>propertyToString(state,prop,index,optional))(env,sym[1],parseInt(null||"0"),!!null)) /*14*/,
(env, sym, pos)=> ((({propertyToString},prop,index,delimiter)=>(state)=>propertyToString(state,prop,index,true,delimiter))(env,sym[1],-sym[3][0]||Infinity,sym[3][1]||undefined)) /*15*/,
(env, sym, pos)=> ((({propertyToString},prop,index,delimiter)=>(state)=>propertyToString(state,prop,index,true,delimiter))(env,sym[1],Infinity,undefined)) /*16*/,
(env, sym, pos)=> ((({addLiteral},_)=>(state)=>addLiteral(state,_))(env,sym[0])) /*17*/,
(env, sym, pos)=> ((({addLiteral},_)=>(state)=>addLiteral(state,_))(env,sym[1])) /*18*/,
(env, sym, pos)=> (sym[0]+"") /*19*/,
(env, sym, pos)=> (sym[0]+sym[1]) /*20*/,
(env, sym, pos)=> ((({addSpace})=>(state)=>addSpace(state,false))(env)) /*21*/,
(env, sym, pos)=> ((({addSpace})=>(state)=>addSpace(state,true))(env)) /*22*/,
(env, sym, pos)=> ((({addNewLine})=>(state)=>addNewLine(state,false))(env)) /*23*/,
(env, sym, pos)=> ((({addNewLine})=>(state)=>addNewLine(state,true))(env)) /*24*/,
(env, sym, pos)=> ((({increaseIndent})=>(state)=>increaseIndent(state,true))(env)) /*25*/,
(env, sym, pos)=> ((({decreaseIndent})=>(state)=>decreaseIndent(state,true))(env)) /*26*/,
(env, sym, pos)=> (sym[1]) /*27*/,
(env, sym, pos)=> ([sym[1],sym[2]]) /*28*/,
(env, sym, pos)=> ([null,sym[1]]) /*29*/,
(env, sym, pos)=> (sym[0]+sym[2]) /*30*/,
(env, sym, pos)=> (sym[0]) /*31*/];

export default ParserFramework(
    reduce_functions,
    {
        render:0,
    },
    js_parser_pack,

);