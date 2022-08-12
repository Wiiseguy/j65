const test = require('aqa')

const J6502_Instructions = require('../dist/j6502-instr').Instructions;
const { J6502_Program } = require('../dist/j6502');
const JM65 = require('../dist/jm65');

const JM = JM65.J6502_Emulator;

test('Basic disassembly', t => {
    let prg = new J6502_Program(0x10);
    //let meta = new J6502_Meta(prg);
    prg.add('LDA_IMM', 0x00);
    prg.add('LDA_IMM', 0x79);
    prg.add('LDA_IMM', 0x80);
    prg.add('LDA_IMM', 0xff);

    let assembly = prg.getAssembly();
    let rom = prg.build(true);

    let expectedRom = [
        J6502_Instructions.LDA_IMM.op, 0,
        J6502_Instructions.LDA_IMM.op, 121,
        J6502_Instructions.LDA_IMM.op, 128,
        J6502_Instructions.LDA_IMM.op, 255
    ];

    t.deepEqual(rom, Buffer.from(expectedRom));

    let disassembly = JM.disassemble(rom);
    t.deepEqual(disassembly, assembly);
    
})
