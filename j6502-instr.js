const IMM_MATCH = /^#(\$[0-9a-f]{1,2}|%[0-1]{1,8}|[0-9]{1,3})$/;
const REL_MATCH = /^\S+$/;
const ZP_MATCH = /^\$[0-9a-f]{1,2}$/;
const ZP_X_MATCH = /^\$[0-9a-f]{1,2},x$/;
const ABS_MATCH = /^\$[0-9a-f]{3,4}$/;
const ABS_X_MATCH = /^\$[0-9a-f]{3,4},x$/;
const ABS_Y_MATCH = /^\$[0-9a-f]{3,4},y$/;
const IND_X_MATCH = /^\(\$[0-9a-f]{1,2},x\)$/;
const IND_Y_MATCH = /^\(\$[0-9a-f]{1,2}\),y$/;

const instructions = {
    // 00
    'BRK':          { op: 0x00, size: 1, asm: 'brk', match: null, desc: 'Break' },
    'ORA_IND_X':    { op: 0x01, size: 2, asm: 'ora', match: IND_X_MATCH, desc: 'OR Memory with Accumulator' },
    // Unused: 0x02 - 0x04
    'ORA_ZP':       { op: 0x05, size: 2, asm: 'ora', match: ZP_MATCH, desc: 'OR Memory with Accumulator' },
    'ASL_ZP': 		{ op: 0x06, size: 2, asm: 'asl', match: ZP_MATCH, desc: 'Shift Left One Bit (Memory)' },
    // Unused: 0x07
    'PHP':          { op: 0x08, size: 1, asm: 'php', match: null, desc: 'Push Processor Status on Stack' },
    'ORA_IMM':		{ op: 0x09, size: 2, asm: 'ora', match: IMM_MATCH, desc: 'OR Memory with Accumulator' },
    'ASL':   		{ op: 0x0a, size: 1, asm: 'asl', match: null, desc: 'Shift Left One Bit (Accumulator)' },
    // Unused: 0x0b - 0x0c
    'ORA_ABS':		{ op: 0x0d, size: 3, asm: 'ora', match: ABS_MATCH, desc: 'OR Memory with Accumulator' },
    'ASL_ABS': 		{ op: 0x0e, size: 3, asm: 'asl', match: null, desc: 'Shift Left One Bit (Memory)' },

    // 10
    'BPL': 			{ op: 0x10, size: 2, asm: 'bpl', match: ZP_MATCH, desc: 'Branch on Result Plus (N == 0)' },
    'JSR': 			{ op: 0x20, size: 3, desc: 'Jump to New Location Saving Return Address' }, // TODO FROM HERE 22-02-2021
    'AND_IMM':		{ op: 0x29, size: 2, desc: 'AND Memory with Accumulator' },
    'ROL': 			{ op: 0x2a, size: 1, desc: 'Rotate One Bit Left (Accumulator)' },
    'BIT_ABS':		{ op: 0x2c, size: 3, desc: 'Test Bits in Memory with Accumulator' },
    'ROL_ABS':		{ op: 0x2e, size: 3, desc: 'Rotate One Bit Left (Memory)' },
    'RTI': 			{ op: 0x40, size: 1, desc: 'Return from Interrupt' },
    'PHA': 			{ op: 0x48, size: 1, desc: 'Push Accumulator on Stack' },
    'LSR': 			{ op: 0x4a, size: 1, desc: 'Shift One Bit Right (Accumulator)' },	
    'JMP_ABS': 		{ op: 0x4c, size: 3 },
    'RTS': 			{ op: 0x60, size: 1, desc: 'Return from Subroutine' },
    'PLA': 			{ op: 0x68, size: 1, desc: 'Pull Accumulator from Stack' },
    'ADC_IMM': 		{ op: 0x69, size: 2 },
    'ROR': 			{ op: 0x6a, size: 1, desc: 'Rotate One Bit Right (Accumulator)' },
    'ROR_ABS':		{ op: 0x6e, size: 3, desc: 'Rotate One Bit Right (Memory)' },
    'SEI': 			{ op: 0x78, size: 1, desc: 'Set Interrupt Disable Status' },
    'STA_ZP': 		{ op: 0x85, size: 2 },
    'DEY': 			{ op: 0x88, size: 1, desc: 'Decrement Index Y by One' },
    'TXA': 			{ op: 0x8a, size: 1 },
    'STA_ABS': 		{ op: 0x8d, size: 3 },
    'STX_ABS':		{ op: 0x8e, size: 3 },
    'BCC': 			{ op: 0x90, size: 2, desc: 'Branch on Carry Clear' },
    'TYA': 			{ op: 0x98, size: 1 },
    'STA_ABS_Y':	{ op: 0x99, size: 3 },
    'TXS': 			{ op: 0x9a, size: 1, desc: 'Transfer Index X to Stack Register (X -> SP)' },
    'STA_ABS_X':	{ op: 0x9d, size: 3 },
    'LDY_IMM': 		{ op: 0xa0, size: 2 },
    'LDA_IND_X': 	{ op: 0xa1, size: 2, asm: 'lda', match: IND_X_MATCH },
    'LDX_IMM': 		{ op: 0xa2, size: 2 },
    'LDA_ZP': 		{ op: 0xa5, size: 2, asm: 'lda', match: ZP_MATCH }, 
    'TAY': 			{ op: 0xa8, size: 1 },
    'LDA_IMM': 		{ op: 0xa9, size: 2, asm: 'lda', match: IMM_MATCH },
    'TAX': 			{ op: 0xaa, size: 1 },
    'LDA_ABS': 		{ op: 0xad, size: 3, asm: 'lda', match: ABS_MATCH },
    'LDX_ABS': 		{ op: 0xae, size: 3 },
    'LDA_IND_Y': 	{ op: 0xb1, size: 2, asm: 'lda', match: IND_Y_MATCH },
    'LDA_ZP_X': 	{ op: 0xb5, size: 2, asm: 'lda', match: ZP_X_MATCH },
    'LDA_ABS_X': 	{ op: 0xbd, size: 3, asm: 'lda', match: ABS_X_MATCH},
    'LDA_ABS_Y': 	{ op: 0xb9, size: 3, asm: 'lda', match: ABS_Y_MATCH },
    'INY': 			{ op: 0xc8, size: 1 },
    'DEX': 			{ op: 0xca, size: 1, desc: 'Decrement Index X by One' },
    'CMP_ABS':		{ op: 0xcd, size: 3, desc: 'Compare Memory with Accumulator' },
    'BNE': 			{ op: 0xd0, size: 2, asm: 'bne', match: REL_MATCH, desc: 'Branch on Result not Zero' },
    'CLD': 			{ op: 0xd8, size: 1, desc: 'Clear Decimal Mode' },
    'DEC_ABS':		{ op: 0xce, size: 3, desc: 'Decrement Memory by One' },
    'CPX_IMM': 		{ op: 0xe0, size: 2, desc: 'Compare value and Index X' },
    'INX': 			{ op: 0xe8, size: 1 },
    'NOP': 			{ op: 0xea, size: 1, desc: 'No Operation' },
    'CPX_ABS': 		{ op: 0xec, size: 3, desc: 'Compare value at address and Index X' },
    'INC_ABS':		{ op: 0xee, size: 3, desc: 'Increment Memory by One' },
    'SBC_ABS':		{ op: 0xed, size: 3, desc: 'Subtract Memory from Accumulator with Borrow' },
    'BEQ': 			{ op: 0xf0, size: 2, desc: 'Branch on Result Zero' },
};

Object.freeze(instructions);

module.exports = instructions;