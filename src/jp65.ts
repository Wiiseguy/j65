/*
    6502 js parser
    
    17-02-2021: Started
    
*/

import { J6502_Program } from "./j6502";
import { InstructionsArray } from "./j6502-instr";

function matchAsm(asm, param) {
    let matched;
    asm = asm.toLowerCase();

    if (param) {
        param = param.toLowerCase();
        matched = InstructionsArray.find(i => i.asm === asm && param.match(i.match));
    } else {
        matched = InstructionsArray.find(i => i.asm === asm && i.match == null);
    }
    return matched;
}

function unpackNumber(str, size) {
    let num;
    if (str[0] === '(') str = str.substr(1);
    if (str[0] === '#') str = str.substr(1);
    if (str[0] === '$') {
        str = str.substr(1);
        num = parseInt(str, 16);
    }
    else if (str[0] === '%') { // TODO: add test case to Syntax flavors
        str = str.substr(1);
        num = parseInt(str, 2);
    }
    else if (str[0].match(/\D/)) { // \D = non-numeric
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

class J6502_Parser {
    parse(lines) {
        const prg = new J6502_Program(); // TODO: determine size?

        const handleDirective = tokens => {
            let directive = tokens[0].slice(1);
            switch (directive) {
                case 'org':
                    prg.setLabelOrigin(unpackNumber(tokens[1], 2))
                    break;
            }
        };

        // Pre-handle lines
        if (typeof lines === 'string') {
            lines = lines.split('\n');
        }
        lines = lines
            .map(l => l.trim()) // Trim lines
            .filter(l => l !== ''); // Remove empty lines

        lines.forEach((l, li) => {
            // Cut off comment
            let commentIdx = l.indexOf(';');
            if (commentIdx >= 0) l = l.substr(0, commentIdx);
            l = l.trimEnd();

            let tokens = l.split(/\s+/); // Split on whitespaces

            let isDirective = tokens[0].startsWith('.');
            if (isDirective) {
                handleDirective(tokens);
            } else {
                let isLabel = tokens[0].endsWith(':');
                if (isLabel) {
                    // TODO: allow label and instr on one line (LABEL_A: ror)
                    let label = tokens[0].substr(0, tokens[0].length - 1);
                    prg.setLabel(label);
                } else {
                    let param = tokens.slice(1).join(''); // ["lda", "$aa02,", "x"] -> "$aa02,x"
                    let matched = matchAsm(tokens[0], param);

                    if (matched) {
                        let data;
                        if (param) {
                            data = unpackNumber(param, matched.size - 1);
                        }
                        //console.log("matched:", l, param, matched, 'unpacked:', data, typeof data);
                        if (typeof data === 'string') {
                            // Label
                            let len = matched.size - 1;
                            if (len === 1) {
                                data = prg.getLabelRel(data);
                            } else {
                                data = prg.getLabel(data);
                            }
                        }
                        prg.add(matched.name, data);
                    } else {
                        throw new Error(`No instruction could be matched with: "${l}" (line ${li})`)
                    }
                }
            }
        });

        return prg;
    };
}

export {
    J6502_Parser
}