const test = require('aqa')

const C6502_Instructions = require('./j6502-instr').Instructions;
const C6502_Program = require('./j6502');

test('Basic disassembly', t => {
    let prg = new C6502_Program(0x10);
    //let meta = new C6502_Meta(prg);
    prg.add('LDA_IMM', 0x00);
    prg.add('LDA_IMM', 0x79);
    prg.add('LDA_IMM', 0x80);
    prg.add('LDA_IMM', 0xff);

    let assembly = prg.getAssembly();
    let rom = prg.build(true);

    let expectedRom = [
        C6502_Instructions.LDA_IMM.op, 0,
        C6502_Instructions.LDA_IMM.op, 121,
        C6502_Instructions.LDA_IMM.op, 128,
        C6502_Instructions.LDA_IMM.op, 255
    ];

    t.deepEqual(rom, Buffer.from(expectedRom));

    let disassembly = C6502_Program.disassemble(rom);
    t.deepEqual(disassembly, assembly);
    
})
