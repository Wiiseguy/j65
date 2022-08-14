import test = require('aqa')
import { J6502_Program } from '../src/j6502';
import { Instructions } from '../src/j6502-instr';
import { J6502_Disassembler } from '../src/jm65';

test('Basic disassembly', t => {
    let prg = new J6502_Program(0x10);
    prg.add('LDA_IMM', 0x00);
    prg.add('LDA_IMM', 0x79);
    prg.add('LDA_IMM', 0x80);
    prg.add('LDA_IMM', 0xff);

    let assembly = prg.getAssembly();
    let rom = prg.build(true);

    let expectedRom = [
        Instructions.LDA_IMM.op, 0,
        Instructions.LDA_IMM.op, 121,
        Instructions.LDA_IMM.op, 128,
        Instructions.LDA_IMM.op, 255
    ];

    t.deepEqual(rom, Buffer.from(expectedRom));

    let disassembly = new J6502_Disassembler().disassemble(rom);
    t.deepEqual(disassembly, assembly);
    
})
