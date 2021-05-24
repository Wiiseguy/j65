// Addressing mode matches
const IMM_MATCH = /^#(\$[0-9a-f]{1,2}|%[0-1]{1,8}|[0-9]{1,3})$/;
const REL_MATCH = /^([a-z_]+[a-z0-9_]*|\$[0-9a-f]{1,2})$/; // e.g. label_name or $F9
const ZP_MATCH = /^\$[0-9a-f]{1,2}$/;
const ZP_X_MATCH = /^\$[0-9a-f]{1,2},x$/;
const ZP_Y_MATCH = /^\$[0-9a-f]{1,2},y$/;
const ABS_MATCH = /^([a-z_]+[a-z0-9_]*|\$[0-9a-f]{3,4}$)/;
const ABS_X_MATCH = /^\$[0-9a-f]{3,4},x$/;
const ABS_Y_MATCH = /^\$[0-9a-f]{3,4},y$/;
const IND_MATCH = /^\(\$[0-9a-f]{1,4}\)$/;
const IND_X_MATCH = /^\(\$[0-9a-f]{1,2},x\)$/;
const IND_Y_MATCH = /^\(\$[0-9a-f]{1,2}\),y$/;

const instructions = {
    // 0
    'BRK':          { op: 0x00, size: 1, asm: 'brk', match: null, desc: 'Break' },
    'ORA_IND_X':    { op: 0x01, size: 2, asm: 'ora', match: IND_X_MATCH, desc: 'OR Memory with Accumulator (Indirect,X)' },
    // Unused: 0x02 - 0x04
    'ORA_ZP':       { op: 0x05, size: 2, asm: 'ora', match: ZP_MATCH, desc: 'OR Memory with Accumulator (ZP)' },
    'ASL_ZP': 		{ op: 0x06, size: 2, asm: 'asl', match: ZP_MATCH, desc: 'Shift Left One Bit (ZP)' },
    // Unused: 0x07
    'PHP':          { op: 0x08, size: 1, asm: 'php', match: null, desc: 'Push Processor Status on Stack' },
    'ORA_IMM':		{ op: 0x09, size: 2, asm: 'ora', match: IMM_MATCH, desc: 'OR Memory with Accumulator (Immediate)' },
    'ASL':   		{ op: 0x0a, size: 1, asm: 'asl', match: null, desc: 'Shift Left One Bit (Accumulator)' },
    // Unused: 0x0b - 0x0c
    'ORA_ABS':		{ op: 0x0d, size: 3, asm: 'ora', match: ABS_MATCH, desc: 'OR Memory with Accumulator (Absolute)' },
    'ASL_ABS': 		{ op: 0x0e, size: 3, asm: 'asl', match: ABS_MATCH, desc: 'Shift Left One Bit (Absolute)' },
    // Unused: 0x0f

    // 1
    'BPL': 			{ op: 0x10, size: 2, asm: 'bpl', match: REL_MATCH, micro(m) { m.SIR = m.fetch(); m.PC += m.N === 0 ? m.SIR : 0; }, desc: 'Branch on Result Plus (N == 0)' },
    'ORA_IND_Y': 	{ op: 0x11, size: 2, asm: 'ora', match: IND_Y_MATCH, desc: 'OR Memory with Accumulator (Indirect,Y)' },
    // Unused: 0x12 - 0x14
    'ORA_ZP_X': 	{ op: 0x15, size: 2, asm: 'ora', match: ZP_X_MATCH, desc: 'OR Memory with Accumulator (ZP,X)' },
    'ASL_ZP_X': 	{ op: 0x16, size: 2, asm: 'asl', match: ZP_X_MATCH, desc: 'Shift Left One Bit (ZP,X)' },
    // Unused: 0x17
    'CLC':          { op: 0x18, size: 1, asm: 'clc', match: null, desc: 'Clear Carry Flag (C = 0)' },
    'ORA_ABS_Y': 	{ op: 0x19, size: 3, asm: 'ora', match: ABS_Y_MATCH, desc: 'OR Memory with Accumulator (Absolute,Y)' },
    // Unused: 0x1a - 0x1c
    'ORA_ABS_X': 	{ op: 0x1d, size: 3, asm: 'ora', match: ABS_X_MATCH, desc: 'OR Memory with Accumulator (Absolute,X)' },
    'ASL_ABS_X': 	{ op: 0x1e, size: 3, asm: 'asl', match: ABS_X_MATCH, desc: 'Shift Left One Bit (Absolute,X)' },
    // Unused: 0x1f

    // 2
    'JSR_ABS': 		{ op: 0x20, size: 3, asm: 'jsr', match: ABS_MATCH, micro(m) { m.AD = m.fetch16(); m.PC = m.PC - 1; m.push(m.PCH); m.push(m.PCL); m.PC = m.AD; }, desc: 'Jump to New Location Saving Return Address' }, // The PC - 1 is for accuracy with the actual chip, RTS does a + 1 because of this.
    'AND_IND_X':    { op: 0x21, size: 2, asm: 'and', match: IND_X_MATCH, desc: 'AND Memory with Accumulator (Indirect,X)' },
    // Unused: 0x22 - 0x23
    'BIT_ZP':	    { op: 0x24, size: 2, asm: 'bit', match: ZP_MATCH, desc: 'Test Bits in Memory with Accumulator (ZP)' },
    'AND_ZP':		{ op: 0x25, size: 2, asm: 'and', match: ZP_MATCH, desc: 'AND Memory with Accumulator (ZP)' },
    'ROL_ZP': 		{ op: 0x26, size: 2, asm: 'rol', match: ZP_MATCH, desc: 'Rotate One Bit Left (ZP)' },
    // Unused: 0x27
    'PLP':          { op: 0x28, size: 1, asm: 'plp', match: null, desc: 'Pull Processor Status on Stack' },
    'AND_IMM':		{ op: 0x29, size: 2, asm: 'and', match: IMM_MATCH, desc: 'AND Memory with Accumulator (Immediate)' },
    'ROL': 			{ op: 0x2a, size: 1, asm: 'rol', match: null, desc: 'Rotate One Bit Left (Accumulator)' },
    // Unused: 0x2b
    'BIT_ABS':		{ op: 0x2c, size: 3, asm: 'bit', match: ABS_MATCH, desc: 'Test Bits in Memory with Accumulator' },
    'AND_ABS':		{ op: 0x2d, size: 3, asm: 'and', match: ABS_MATCH, desc: 'AND Memory with Accumulator (Absolute)' },
    'ROL_ABS':		{ op: 0x2e, size: 3, asm: 'rol', match: ABS_MATCH, desc: 'Rotate One Bit Left (Absolute)' },
    // Unused: 0x2f

    // 3
    'BMI': 			{ op: 0x30, size: 2, asm: 'bmi', match: REL_MATCH, desc: 'Branch on Result Minus (N == 1)' },
    'AND_IND_Y':    { op: 0x31, size: 2, asm: 'and', match: IND_Y_MATCH, desc: 'AND Memory with Accumulator (Indirect,Y)' },
    // Unused: 0x32 - 0x34
    'AND_ZP_X': 	{ op: 0x35, size: 2, asm: 'and', match: ZP_X_MATCH, desc: 'AND Memory with Accumulator (ZP,X)' },
    'ROL_ZP_X': 	{ op: 0x36, size: 2, asm: 'rol', match: ZP_X_MATCH, desc: 'Rotate One Bit Left (ZP,X)' },
    // Unused: 0x37
    'SEC':          { op: 0x38, size: 1, asm: 'sec', match: null, desc: 'Set Carry Flag' },
    'AND_ABS_Y': 	{ op: 0x39, size: 3, asm: 'and', match: ABS_Y_MATCH, desc: 'AND Memory with Accumulator (Absolute,Y)' },
    // Unused: 0x3a - 0x3c
    'AND_ABS_X': 	{ op: 0x3d, size: 3, asm: 'and', match: ABS_X_MATCH, desc: 'AND Memory with Accumulator (Absolute,X)' },
    'ROL_ABS_X':	{ op: 0x3e, size: 3, asm: 'rol', match: ABS_X_MATCH, desc: 'Rotate One Bit Left (Absolute,X)' },
    // Unused: 0x3f

    // 4
    'RTI': 			{ op: 0x40, size: 1, asm: 'rti', match: null, desc: 'Return from Interrupt' },
    'EOR_IND_X':    { op: 0x41, size: 2, asm: 'eor', match: IND_X_MATCH, desc: 'Exclusive-OR Memory with Accumulator (Indirect,X)' },
    // Unused: 0x42 - 0x44
    'EOR_ZP':       { op: 0x45, size: 2, asm: 'eor', match: ZP_MATCH, desc: 'Exclusive-OR Memory with Accumulator (ZP)' },
    'LSR_ZP': 		{ op: 0x46, size: 2, asm: 'lsr', match: ZP_MATCH, desc: 'Shift Right One Bit (ZP)' },
    // Unused: 0x47
    'PHA': 			{ op: 0x48, size: 1, asm: 'pha', match: null, desc: 'Push Accumulator on Stack' },
    'EOR_IMM':		{ op: 0x49, size: 2, asm: 'eor', match: IMM_MATCH, desc: 'Exclusive-OR Memory with Accumulator (Immediate)' },
    'LSR': 			{ op: 0x4a, size: 1, asm: 'lsr', match: null, desc: 'Shift One Bit Right (Accumulator)' },
    // Unused: 0x4b
    'JMP_ABS': 		{ op: 0x4c, size: 3, asm: 'jmp', match: ABS_MATCH, desc: 'Jump to New Location (Absolute)' },
    'EOR_ABS':		{ op: 0x4d, size: 3, asm: 'eor', match: ABS_MATCH, desc: 'Exclusive-OR Memory with Accumulator (Absolute)' },
    'LSR_ABS': 		{ op: 0x4e, size: 3, asm: 'lsr', match: ABS_MATCH, desc: 'Shift Left One Bit (Absolute)' },
    // Unused: 0x4f

    // 5
    'BVC': 			{ op: 0x50, size: 2, asm: 'bvc', match: REL_MATCH, desc: 'Branch on oVerflow Clear (V == 0)' },
    'EOR_IND_Y': 	{ op: 0x51, size: 2, asm: 'eor', match: IND_Y_MATCH, desc: 'Exclusive-OR Memory with Accumulator (Indirect,Y)' },
    // Unused: 0x52 - 0x54
    'EOR_ZP_X': 	{ op: 0x55, size: 2, asm: 'eor', match: ZP_X_MATCH, desc: 'Exclusive-OR Memory with Accumulator (ZP,X)' },
    'LSR_ZP_X': 	{ op: 0x56, size: 2, asm: 'lsr', match: ZP_X_MATCH, desc: 'Shift Right One Bit (ZP,X)' },
    // Unused: 0x57
    'CLI':          { op: 0x58, size: 1, asm: 'cli', match: null, desc: 'Clear Interrupt Disable Bit (I = 0)' },
    'EOR_ABS_Y': 	{ op: 0x59, size: 3, asm: 'eor', match: ABS_Y_MATCH, desc: 'Exclusive-OR Memory with Accumulator (Absolute,Y)' },
    // Unused: 0x5a - 0x5c
    'EOR_ABS_X': 	{ op: 0x5d, size: 3, asm: 'eor', match: ABS_X_MATCH, desc: 'Exclusive-OR Memory with Accumulator (Absolute,X)' },
    'LSR_ABS_X': 	{ op: 0x5e, size: 3, asm: 'lsr', match: ABS_X_MATCH, desc: 'Shift Right One Bit (Absolute,X)' },
    // Unused: 0x5f

    // 6
    'RTS': 			{ op: 0x60, size: 1, asm: 'rts', match: null, micro(m) { m.ADL = m.pull(); m.ADH = m.pull(); m.PC = m.AD + 1; }, desc: 'Return from Subroutine' },
    'ADC_IND_X':    { op: 0x61, size: 2, asm: 'adc', match: IND_X_MATCH, desc: 'Add Memory to Accumulator with Carry (Indirect,X)' },
    // Unused: 0x62 - 0x64
    'ADC_ZP':		{ op: 0x65, size: 2, asm: 'adc', match: ZP_MATCH, desc: 'Add Memory to Accumulator with Carry (ZP)' },
    'ROR_ZP': 		{ op: 0x66, size: 2, asm: 'ror', match: ZP_MATCH, desc: 'Rotate One Bit Right (ZP)' },
    // Unused: 0x67
    'PLA': 			{ op: 0x68, size: 1, asm: 'pla', match: null, desc: 'Pull Accumulator from Stack' },
    'ADC_IMM': 		{ op: 0x69, size: 2, asm: 'adc', match: IMM_MATCH, desc: 'Add Memory to Accumulator with Carry (Immediate)' },
    'ROR': 			{ op: 0x6a, size: 1, asm: 'ror', match: null, desc: 'Rotate One Bit Right (Accumulator)' },
    // Unused: 0x6b
    'JMP_IND': 		{ op: 0x6c, size: 3, asm: 'jmp', match: IND_MATCH, desc: 'Jump to New Location (Indirect)' },
    'ADC_ABS':		{ op: 0x6d, size: 3, asm: 'adc', match: ABS_MATCH, desc: 'Add Memory to Accumulator with Carry (Absolute)' },
    'ROR_ABS':		{ op: 0x6e, size: 3, asm: 'ror', match: ABS_MATCH, desc: 'Rotate One Bit Right (Absolute)' },
    // Unused: 0x6f

    // 7
    'BVS': 			{ op: 0x70, size: 2, asm: 'bvs', match: REL_MATCH, desc: 'Branch on Overflow Set (V == 1)' },
    'ADC_IND_Y':    { op: 0x71, size: 2, asm: 'adc', match: IND_Y_MATCH, desc: 'Add Memory to Accumulator with Carry (Indirect,Y)' },
    // Unused: 0x72 - 0x74
    'ADC_ZP_X': 	{ op: 0x75, size: 2, asm: 'adc', match: ZP_X_MATCH, desc: 'Add Memory to Accumulator with Carry (ZP,X)' },
    'ROR_ZP_X': 	{ op: 0x76, size: 2, asm: 'ror', match: ZP_X_MATCH, desc: 'Rotate One Bit Right (ZP,X)' },
    // Unused: 0x77
    'SEI': 			{ op: 0x78, size: 1, asm: 'sei', match: null, micro(m) { m.I = 1; }, desc: 'Set Interrupt Disable Status' },
    'ADC_ABS_Y': 	{ op: 0x79, size: 3, asm: 'adc', match: ABS_Y_MATCH, desc: 'Add Memory to Accumulator with Carry (Absolute,Y)' },
    // Unused: 0x7a - 0x7c
    'ADC_ABS_X': 	{ op: 0x7d, size: 3, asm: 'adc', match: ABS_X_MATCH, desc: 'Add Memory to Accumulator with Carry (Absolute,X)' },
    'ROR_ABS_X':	{ op: 0x7e, size: 3, asm: 'ror', match: ABS_X_MATCH, desc: 'Rotate One Bit Right (Absolute,X)' },
    // Unused: 0x7f    

    // 8
    // Unused: 0x80 
    'STA_IND_X':	{ op: 0x81, size: 2, asm: 'sta', match: IND_X_MATCH, desc: 'Store Accumulator in Memory (Indirect,X)' },
    // Unused: 0x82 - 0x83
    'STY_ZP': 		{ op: 0x84, size: 2, asm: 'sty', match: ZP_MATCH, desc: 'Store Index Y in Memory (ZP)' },
    'STA_ZP': 		{ op: 0x85, size: 2, asm: 'sta', match: ZP_MATCH, desc: 'Store Accumulator in Memory (ZP)' },
    'STX_ZP': 		{ op: 0x86, size: 2, asm: 'stx', match: ZP_MATCH, desc: 'Store Index X in Memory (ZP)' },
    // Unused: 0x87
    'DEY': 			{ op: 0x88, size: 1, asm: 'dey', match: null, desc: 'Decrement Index Y by One' },
    // Unused: 0x89
    'TXA': 			{ op: 0x8a, size: 1, asm: 'txa', match: null, desc: 'Transfer Index X to Accumulator' },
    // Unused: 0x8b
    'STY_ABS': 		{ op: 0x8c, size: 3, asm: 'sty', match: ABS_MATCH, micro(m) { m.write(m.fetch16(), m.Y) }, desc: 'Store Index Y in Memory (Absolute)' },
    'STA_ABS': 		{ op: 0x8d, size: 3, asm: 'sta', match: ABS_MATCH, micro(m) { m.write(m.fetch16(), m.A) }, desc: 'Store Accumulator in Memory (Absolute)' },
    'STX_ABS':		{ op: 0x8e, size: 3, asm: 'stx', match: ABS_MATCH, micro(m) { m.write(m.fetch16(), m.X) }, desc: 'Store Index X in Memory (Absolute)' },
    // Unused: 0x8f

    // 9
    'BCC': 			{ op: 0x90, size: 2, asm: 'bcc', match: REL_MATCH, desc: 'Branch on Carry Clear (C == 0)' },
    'STA_IND_Y':	{ op: 0x91, size: 2, asm: 'sta', match: IND_Y_MATCH, desc: 'Store Accumulator in Memory (Indirect,Y)' },
    // Unused: 0x92 - 0x93
    'STY_ZP_X':		{ op: 0x94, size: 2, asm: 'sty', match: ZP_X_MATCH, desc: 'Store Index Y in Memory (ZP,X)' },
    'STA_ZP_X':		{ op: 0x95, size: 2, asm: 'sta', match: ZP_X_MATCH, desc: 'Store Accumulator in Memory (ZP,X)' },
    'STX_ZP_Y':		{ op: 0x96, size: 2, asm: 'stx', match: ZP_Y_MATCH, desc: 'Store Index X in Memory (ZP,Y)' },
    // Unused: 0x97
    'TYA': 			{ op: 0x98, size: 1, asm: 'tya', match: null, desc: 'Transfer Index Y to Stack Register (SP = Y)' },
    'STA_ABS_Y':	{ op: 0x99, size: 3, asm: 'sta', match: ABS_Y_MATCH, desc: 'Store Accumulator in Memory (Absolute,Y)' },
    'TXS': 			{ op: 0x9a, size: 1, asm: 'txs', match: null, micro(m) { m.SP = m.X; }, desc: 'Transfer Index X to Stack Register (SP = X)' },
    // Unused: 0x9b - 0x9c
    'STA_ABS_X':	{ op: 0x9d, size: 3, asm: 'sta', match: ABS_X_MATCH, micro(m) { m.write(m.fetch16() + m.X, m.A); }, desc: 'Store Accumulator in Memory (Absolute,X)' },

    // A
    'LDY_IMM': 		{ op: 0xa0, size: 2, asm: 'ldy', match: IMM_MATCH, micro(m) { m.NZ = m.Y = m.fetch() }, desc: 'Load Index Y with Memory (Immediate)' },
    'LDA_IND_X': 	{ op: 0xa1, size: 2, asm: 'lda', match: IND_X_MATCH, desc: 'Load Accumulator with Memory (Indirect,X)' },
    'LDX_IMM': 		{ op: 0xa2, size: 2, asm: 'ldx', match: IMM_MATCH, micro(m) { m.NZ = m.X = m.fetch() }, desc: 'Load Index X with Memory (Immediate)' },
    // Unused: 0xa3
    'LDY_ZP': 		{ op: 0xa4, size: 2, asm: 'ldy', match: ZP_MATCH, desc: 'Load Index Y with Memory (ZP)' }, 
    'LDA_ZP': 		{ op: 0xa5, size: 2, asm: 'lda', match: ZP_MATCH, desc: 'Load Accumulator with Memory (ZP)' },
    'LDX_ZP': 		{ op: 0xa6, size: 2, asm: 'ldx', match: ZP_MATCH, desc: 'Load Index X with Memory (ZP)' },  
    // Unused: 0xa7
    'TAY': 			{ op: 0xa8, size: 1, asm: 'tay', match: null, desc: 'Transfer Accumulator to Index Y' },
    'LDA_IMM': 		{ op: 0xa9, size: 2, asm: 'lda', match: IMM_MATCH, micro(m) { m.NZ = m.A = m.fetch() }, desc: 'Load Accumulator with Immediate Value' },
    'TAX': 			{ op: 0xaa, size: 1, asm: 'tax', match: null, desc: 'Transfer Accumulator to Index X' },
    // Unused: 0xab
    'LDY_ABS': 		{ op: 0xac, size: 3, asm: 'ldy', match: ABS_MATCH, micro(m) { m.NZ = m.Y = m.read(m.fetch16()) }, desc: 'Load Index Y with Memory (Absolute)'},
    'LDA_ABS': 		{ op: 0xad, size: 3, asm: 'lda', match: ABS_MATCH, micro(m) { m.NZ = m.A = m.read(m.fetch16()) }, desc: 'Load Accumulator with Memory (Absolute)' },
    'LDX_ABS': 		{ op: 0xae, size: 3, asm: 'ldx', match: ABS_MATCH, micro(m) { m.NZ = m.X = m.read(m.fetch16()) }, desc: 'Load Index X with Memory (Absolute)'},
    // Unused: 0xaf

    // B
    'BCS': 			{ op: 0xb0, size: 2, asm: 'bcs', match: REL_MATCH, desc: 'Branch on Carry Set' },
    'LDA_IND_Y': 	{ op: 0xb1, size: 2, asm: 'lda', match: IND_Y_MATCH, desc: 'Load Accumulator with Memory (Indirect,Y)' },
    // Unused: 0xb2 - 0xb3
    'LDY_ZP_X': 	{ op: 0xb4, size: 2, asm: 'ldy', match: ZP_X_MATCH, desc: 'Load Index Y with Memory (ZP,X)' },
    'LDA_ZP_X': 	{ op: 0xb5, size: 2, asm: 'lda', match: ZP_X_MATCH, desc: 'Load Accumulator with Memory (ZP,X)' },
    'LDX_ZP_Y': 	{ op: 0xb6, size: 2, asm: 'ldx', match: ZP_Y_MATCH, desc: 'Load Index X with Memory (ZP,Y)' },
    // Unused: 0xb7
    'CLV': 			{ op: 0xb8, size: 1, asm: 'clv', match: null, desc: 'Clear Overflow Flag (V = 0)' },
    'LDA_ABS_Y': 	{ op: 0xb9, size: 3, asm: 'lda', match: ABS_Y_MATCH, micro(m) { m.NZ = m.A = m.read(m.fetch16() + m.Y); }, desc: 'Load Accumulator with Memory (Absolute,Y)' },
    'TSX': 			{ op: 0xba, size: 1, asm: 'tsx', match: null, desc: 'Transfer Stack Pointer to Index X' },
    // Unused: 0xbb
    'LDY_ABS_X': 	{ op: 0xbc, size: 3, asm: 'ldy', match: ABS_X_MATCH, desc: 'Load Index Y with Memory (Absolute,X)' },
    'LDA_ABS_X': 	{ op: 0xbd, size: 3, asm: 'lda', match: ABS_X_MATCH, micro(m) { m.NZ = m.A = m.read(m.fetch16() + m.X); }, desc: 'Load Accumulator with Memory (Absolute,X)' },
    'LDX_ABS_Y': 	{ op: 0xbe, size: 3, asm: 'ldx', match: ABS_Y_MATCH, desc: 'Load Index X with Memory (Absolute,Y)' },

    // C
    'CPY_IMM': 		{ op: 0xc0, size: 2, asm: 'cpy', match: IMM_MATCH, micro(m) { m.SIR = m.Y - m.fetch(); m.C = m.SIR <= 0; m.NZ = m.Y; }, desc: 'Compare Memory with Index Y (Immediate)' },
    'CMP_IND_X':    { op: 0xc1, size: 2, asm: 'cmp', match: IND_X_MATCH, desc: 'Compare Memory with Accumulator (Indirect,X)' },
    // Unused: 0xc2 - 0xc3
    'CPY_ZP': 		{ op: 0xc4, size: 2, asm: 'cpy', match: ZP_MATCH, desc: 'Compare Memory with Index Y (ZP)' }, 
    'CMP_ZP': 		{ op: 0xc5, size: 2, asm: 'cmp', match: ZP_MATCH, desc: 'Compare Memory with Accumulator (ZP)' }, 
    'DEC_ZP': 		{ op: 0xc6, size: 2, asm: 'dec', match: ZP_MATCH, desc: 'Decrement Memory by One (ZP)' },
    // Unused: 0xc7
    'INY': 			{ op: 0xc8, size: 1, asm: 'iny', match: null, micro(m) { m.NZ = m.Y = m.Y + 1; }, desc: 'Increment Index Y by One' },   
    'CMP_IMM':		{ op: 0xc9, size: 2, asm: 'cmp', match: IMM_MATCH, desc: 'Compare Memory with Accumulator (Immediate)' }, 
    'DEX': 			{ op: 0xca, size: 1, asm: 'dex', match: null, desc: 'Decrement Index X by One' },
    // Unused: 0xcb
    'CPY_ABS':		{ op: 0xcc, size: 3, asm: 'cpy', match: ABS_MATCH, desc: 'Compare Memory with Index Y (Absolute)' },
    'CMP_ABS':		{ op: 0xcd, size: 3, asm: 'cmp', match: ABS_MATCH, desc: 'Compare Memory with Accumulator (Absolute)' },
    'DEC_ABS':		{ op: 0xce, size: 3, asm: 'dec', match: ABS_MATCH, desc: 'Decrement Memory by One (Absolute)' },
    // Unused: 0xcf

    // D
    'BNE': 			{ op: 0xd0, size: 2, asm: 'bne', match: REL_MATCH, micro(m) { m.SIR = m.fetch(); m.PC += m.Z === 0 ? m.SIR : 0; }, desc: 'Branch on Result not Zero' },
    'CMP_IND_Y': 	{ op: 0xd1, size: 2, asm: 'cmp', match: IND_Y_MATCH, desc: 'Compare Memory with Accumulator (Indirect,Y)' },
    // Unused: 0xd2 - 0xd4
    'CMP_ZP_X': 	{ op: 0xd5, size: 2, asm: 'cmp', match: ZP_X_MATCH, desc: 'Compare Memory with Accumulator (ZP,X)' },
    'DEC_ZP_X': 	{ op: 0xd6, size: 2, asm: 'dec', match: ZP_X_MATCH, desc: 'Decrement Memory by One (ZP,X)' },
    // Unused: 0xd7
    'CLD': 			{ op: 0xd8, size: 1, asm: 'cld', match: null, micro(m) { m.D = 0; }, desc: 'Clear Decimal Mode (D = 0)' },
    'CMP_ABS_Y': 	{ op: 0xd9, size: 3, asm: 'cmp', match: ABS_Y_MATCH, desc: 'Compare Memory with Accumulator (Absolute,Y)' },
    // Unused: 0xda - 0xdc
    'CMP_ABS_X': 	{ op: 0xdd, size: 3, asm: 'cmp', match: ABS_X_MATCH, desc: 'Compare Memory with Accumulator (Absolute,X)' },
    'DEC_ABS_X':	{ op: 0xde, size: 3, asm: 'dec', match: ABS_X_MATCH, desc: 'Decrement Memory by One (Absolute,X)' },
    // Unused: 0xdf

    // E
    'CPX_IMM': 		{ op: 0xe0, size: 2, asm: 'cpx', match: IMM_MATCH, micro(m) { m.SIR = m.X - m.fetch(); m.C = m.SIR <= 0; m.NZ = m.X; }, desc: 'Compare value and Index X (Immediate)' },
    'SBC_IND_X': 	{ op: 0xe1, size: 2, asm: 'sbc', match: IND_X_MATCH, desc: 'Subtract Memory from Accumulator with Borrow (Indirect,X)' },
    // Unused: 0xe2 - 0xe3
    'CPX_ZP': 		{ op: 0xe4, size: 2, asm: 'cpx', match: ZP_MATCH, desc: 'Compare Memory with Index X (ZP)' }, 
    'SBC_ZP': 		{ op: 0xe5, size: 2, asm: 'sbc', match: ZP_MATCH, desc: 'Subtract Memory from Accumulator with Borrow (ZP)' }, 
    'INC_ZP': 		{ op: 0xe6, size: 2, asm: 'inc', match: ZP_MATCH, desc: 'Increment Memory by One (ZP)' },
    // Unused: 0xe7
    'INX': 			{ op: 0xe8, size: 1, asm: 'inx', match: null, micro(m) { m.NZ = m.X = m.X + 1; }, desc: 'Increment Index X by One' },
    'SBC_IMM':		{ op: 0xe9, size: 2, asm: 'sbc', match: IMM_MATCH, desc: 'Compare Memory with Accumulator (Immediate)' }, 
    'NOP': 			{ op: 0xea, size: 1, asm: 'nop', match: null, desc: 'No Operation' },
    // Unused: 0xeb
    'CPX_ABS': 		{ op: 0xec, size: 3, asm: 'cpx', match: ABS_MATCH, micro(m) { m.SIR = m.X - m.read(m.fetch16()); m.C = m.SIR <= 0; m.NZ = m.X; }, desc: 'Compare value at address and Index X (Absolute)' },
    'SBC_ABS':		{ op: 0xed, size: 3, asm: 'sbc', match: ABS_MATCH, desc: 'Subtract Memory from Accumulator with Borrow (Absolute)' },
    'INC_ABS':		{ op: 0xee, size: 3, asm: 'inc', match: ABS_MATCH, desc: 'Increment Memory by One (Absolute)' },    
    // Unused: 0xef

    // F
    'BEQ': 			{ op: 0xf0, size: 2, asm: 'beq', match: REL_MATCH, desc: 'Branch on Result Zero' },
    'SBC_IND_Y': 	{ op: 0xf1, size: 2, asm: 'sbc', match: IND_Y_MATCH, desc: 'Subtract Memory from Accumulator with Borrow (Indirect,Y)' },
    // Unused: 0xf2 - 0xf4
    'SBC_ZP_X': 	{ op: 0xf5, size: 2, asm: 'sbc', match: ZP_X_MATCH, desc: 'Subtract Memory from Accumulator with Borrow (ZP,X)' },
    'INC_ZP_X': 	{ op: 0xf6, size: 2, asm: 'inc', match: ZP_X_MATCH, desc: 'Increment Memory by One (ZP,X)' },
    // Unused: 0xf7
    'SED': 			{ op: 0xf8, size: 1, asm: 'sed', match: null, desc: 'Set Decimal Flag (D = 1)' },
    'SBC_ABS_Y': 	{ op: 0xf9, size: 3, asm: 'sbc', match: ABS_Y_MATCH, desc: 'Subtract Memory from Accumulator with Borrow (Absolute,Y)' },
    // Unused: 0xfa - 0xfc
    'SBC_ABS_X': 	{ op: 0xfd, size: 3, asm: 'sbc', match: ABS_X_MATCH, desc: 'Subtract Memory from Accumulator with Borrow (Absolute,X)' },
    'INC_ABS_X':	{ op: 0xfe, size: 3, asm: 'inc', match: ABS_X_MATCH, desc: 'Increment Memory by One (Absolute,X)' },
    // Unused: 0xff
};

Object.freeze(instructions);

let InstructionsByOp = {};
let InstructionsArray = [];
Object.entries(instructions).forEach(([name, val]) => {
    let o = { name, ...val };
	InstructionsByOp[val.op] = o;    
    InstructionsArray.push(o);
});

module.exports = {
    Instructions: instructions,
    InstructionsByOp,
    InstructionsArray,
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
    IND_Y_MATCH,
}