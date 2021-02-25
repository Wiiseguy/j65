/*
    6502 js parser
    
    17-02-2021: Started
    
*/

const fs = require('fs');
const StreamBuffer = require('streambuf');
const C6502_Instructions = require('./j6502-instr');
const C6502_Program = require('./j6502');

let instr_lookup = {};
let instr_arr = [];
Object.entries(C6502_Instructions).forEach(([name, val]) => {
    if(val.asm) {
        let o = {name, ...val};
        instr_arr.push(o);
        //instr_lookup[val.name] = o;
    }
});

//console.log(instr_lookup);
//console.log(instr_arr);

function matchAsm(asm, param) {
    let matched;
    asm = asm.toLowerCase();

    if(param) {
        param = param.toLowerCase();
        matched = instr_arr.find(i => i.asm === asm && param.match(i.match));
    } else {
        matched = instr_arr.find(i => i.asm === asm && i.match == null);
    }
    return matched;
}

function unpackNumber(str, size) {
    let num;
    if(str[0] === '(') str = str.substr(1);
    if(str[0] === '#') str = str.substr(1);
    if(str[0] === '$') {
        str = str.substr(1);
        num = parseInt(str, 16);
    } 
    else if(str[0] === '%') { // TODO: add test case to Syntax flavors
        str = str.substr(1);
        num = parseInt(str, 2);
    }
    else if(str[0].match(/\D/)) { // \D = non-numeric
        // Probably a label
        return str;
    }
    else {
        num = parseInt(str, 10);
    }

    // Cut off
    num = num & (Math.pow(2, 8 * size) - 1); // 0x

    return num;
}

function C6502_Parser() {
    this.parse = function(lines) {
        const prg = new C6502_Program(); // TODO: determine size?

        // Pre-handle lines
        if(typeof lines === 'string') {
            lines = lines.split('\n');
        }
        lines = lines
            .map(l => l.trim()) // Trim lines
            .filter(l => l !== ''); // Remove empty lines

        lines.forEach(l => {
            // Cut off comment
            let commentIdx = l.indexOf(';');
            if(commentIdx >= 0) l = l.substr(0, commentIdx);
            l = l.trimEnd();

            let tokens = l.split(/\s+/); // Split on whitespaces

            let isLabel = tokens[0].endsWith(':');
            if(isLabel) {
                // TODO: allow label and instr on one line (LABEL_A: ror)
                let label = tokens[0].substr(0, tokens[0].length-1);
                prg.setLabel(label);
            } else {
                let param = tokens.slice(1).join('');
                let matched = matchAsm(tokens[0], param);
                
                if(matched) {
                    let data;
                    if(param) {
                        data = unpackNumber(param, matched.size-1);
                    }
                    //console.log("matched:", l, param, matched, 'unpacked:', data, typeof data);
                    if(typeof data === 'string') {
                        // Label
                        let len = matched.size-1;
                        if(len === 1) {
                            data = prg.getLabelRel(data);
                        } else {
                            data = prg.getLabel(data);
                        }
                    }
                    prg.add(matched.name, data);
                }
            }
        });

        return prg;
    };
}

module.exports = {
    C6502_Parser
}