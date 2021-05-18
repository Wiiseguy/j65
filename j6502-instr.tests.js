const test = require('aqa')

const { Instructions,
    IMM_MATCH,
    REL_MATCH,
    ZP_MATCH,
    ZP_X_MATCH,
    ZP_Y_MATCH,
    ABS_MATCH,
    ABS_X_MATCH,
    ABS_Y_MATCH,
    IND_MATCH,
    IND_X_MATCH,
    IND_Y_MATCH } = require('./j6502-instr');

let instr_arr = [];
Object.entries(Instructions).forEach(([name, val]) => {
    let o = {name, ...val};
    instr_arr.push(o);    
});

const branchInstr = [
    'BPL',
    'BMI',
    'BVC',
    'BVS',
    'BCC',
    'BCS',
    'BNE',
    'BEQ'
];

test('Instructions integrity', t => {
    // Of the 256 possible opcodes available using an 8-bit pattern, the original 6502 uses 151 of them, https://en.wikipedia.org/wiki/MOS_Technology_6502#Instructions_and_opcodes
    t.is(instr_arr.length, 151);
    let opSet = new Set(instr_arr.map(i => i.op));
    t.is(opSet.size, 151)

    t.is(branchInstr.length, 8);    

    let last = null;
    instr_arr.forEach(i => {
        // Check if e.g. LDA_ABS starts with lda
        t.true(i.name.startsWith(i.asm.toUpperCase()), i.name);

        // Check order
        if(last != null) {
            t.true(last.op < i.op, i.name);
        }

        if(i.match == null) {
            t.is(i.size, 1, i.name);
            t.false(i.name.includes('_'), i.name);
        } else if(i.match === IMM_MATCH) {
            t.is(i.size, 2);
            t.true(i.name.endsWith('IMM'), i.name);
        } else if(i.match === ZP_MATCH) {
            t.is(i.size, 2);
            t.true(i.name.endsWith('ZP'), i.name);
        } else if(i.match === ZP_X_MATCH) {
            t.is(i.size, 2);
            t.true(i.name.endsWith('ZP_X'), i.name);
        } else if(i.match === ZP_Y_MATCH) {
            t.is(i.size, 2);
            t.true(i.name.endsWith('ZP_Y'), i.name);
        } else if(i.match === ABS_MATCH) {
            t.is(i.size, 3);
            t.true(i.name.endsWith('ABS'), i.name);
        } else if(i.match === ABS_X_MATCH) {
            t.is(i.size, 3);
            t.true(i.name.endsWith('ABS_X'), i.name);
        } else if(i.match === ABS_Y_MATCH) {
            t.is(i.size, 3);
            t.true(i.name.endsWith('ABS_Y'), i.name);
        } else if(i.match === IND_MATCH) {
            t.is(i.size, 3);
            t.true(i.name.endsWith('IND'), i.name);
        } else if(i.match === IND_X_MATCH) {
            t.is(i.size, 2);
            t.true(i.name.endsWith('IND_X'), i.name);
        } else if(i.match === IND_Y_MATCH) {
            t.is(i.size, 2);
            t.true(i.name.endsWith('IND_Y'), i.name);
        } else if(i.match === REL_MATCH) {
            t.is(i.size, 2);
            t.true(branchInstr.includes(i.name), i.name)
        }

        last = i;
    });
})
