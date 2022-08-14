# j65
> A 6502 Assembler, Parser and Emulator written in JavaScript / TypeScript

## j6502.ts
Assembler. Contains an API for programmatically assembling a 6502 program.

### j6502-instr.ts
Instruction definitions. The heart of all the j65 libraries. Describes all the 6502 opcodes and contains micro-code instructions for them.

### j6502-meta.ts
Assembler utilities. Contains helper functions for programmatic assembling.

### j6502-nes.ts
NES Assembler utilities. Contains helper functions for easier NES assembly.

<br>

## jm65.ts
Simulator. Contains an API for running an assembled 6502 program from byte code.

**Note**: Not fully functional yet, as not all micro-codes for each opcode have been implemented. See `j6502-instr.js`.

```js
const J6502_Program = require('j6502');
const JM65 = require('jm65');

// Create rom
let prg = new J6502_Program(0x10);
prg.add('LDA_IMM', 0);
prg.add('LDA_IMM', 10);
prg.add('LDA_IMM', 60);
prg.add('LDA_IMM', 99);
let rom = prg.build();

// Create the emulator and load the rom
let emu = new JM65.J6502_Emulator();
emu.load(rom);    

// Step through the program
let s;
emu.step();
s = emu.getStatus();
console.log('A register:', s.A); // Will print 'A register: 0'

emu.step();
s = emu.getStatus();
console.log('A register:', s.A); // Will print 'A register: 10'

emu.step();
s = emu.getStatus();
console.log('A register:', s.A); // Will print 'A register: 60'

emu.step();
s = emu.getStatus();
console.log('A register:', s.A); // Will print 'A register: 99'
```

### jm65-nes.ts
NES Emulator. Uses jm65.js and emory mapping to emulate the NES.

<br>

## jp65.ts
Parser. Contains an API for parsing and assembling a 6502 program from source code.


```js
const JP65 = require('jp65');

// Parse
let p = new JP65.J6502_Parser();
let prg = p.parse([
    '; This is a comment'
    'lda #$01 ; Another comment',
    'test_label:',
    'lda #$02',
    'bne test_label',
    'bne $fb',
    'jmp test_label',
    'brk'
].join('\n'))

// Build the parsed program to byte-code
let b = prg.build();

// b will contain the following byte-code Buffer:
// [
//     0xa9, 0x01,         // lda_imm #$01
//     0xa9, 0x02,         // lda_imm #$02
//     0xd0, 0xfc,         // bne -3
//     0xd0, 0xfb,         // bne -4
//     0x4c, 0x02, 0x00,   // jmp
//     0x00                // brk
// ];
```