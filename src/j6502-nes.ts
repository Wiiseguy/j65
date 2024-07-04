import * as fs from 'fs';
import { StreamBuffer } from 'streambuf';
import { J6502_Program } from './j6502';
import { J6502_Meta } from './j6502-meta';

// NES constants
const SPR_START		= 0x0200;
const PPU_CTRL		= 0x2000;
const PPU_MASK		= 0x2001;
const PPU_STATUS	= 0x2002;
const SPR_ADDR		= 0x2003;
const SPR_DATA		= 0x2004;
const PPU_SCROLL	= 0x2005;
const PPU_ADDR		= 0x2006;
const PPU_DATA		= 0x2007;

const SPR_DMA		= 0x4014;
const JOYPAD		= 0x4016;
const JOYPAD_1		= 0x4016;
const JOYPAD_2		= 0x4017;

const BTN_A			= 0b10000000;
const BTN_B			= 0b01000000;
const BTN_SELECT  	= 0b00100000;
const BTN_START		= 0b00010000;
const BTN_UP		= 0b00001000;
const BTN_DOWN		= 0b00000100;
const BTN_LEFT		= 0b00000010;
const BTN_RIGHT   	= 0b00000001;
const BTN_AB		= 0b11000000;
const BTN_UPLEFT  	= 0b00001010;
const BTN_UPRIGHT 	= 0b00001001;
const BTN_DOWNLEFT	= 0b00000110;
const BTN_DOWNRIGHT	= 0b00000101;

function J6502_NES(prg) {
	if (!(prg instanceof J6502_Program))
		throw new Error(`'prg' should be an instance of J6502_Program`);

	let meta = new J6502_Meta(prg);

	// Helper
	this.utils = {
		getSpriteAddr(spriteNum) {
			return SPR_START + spriteNum * 4;
		},
		getSpriteY(spriteNum) {
			return this.getSpriteAddr(spriteNum);
		},
		getSpriteTile(spriteNum) {
			return this.getSpriteAddr(spriteNum) + 1;
		},
		getSpriteAttrs(spriteNum) {
			return this.getSpriteAddr(spriteNum) + 2;
		},
		getSpriteX(spriteNum) {
			return this.getSpriteAddr(spriteNum) + 3;
		}
	};

	// Low-level 	

	// Mid-level
	this.setPPUAddress = function (addr) {
		prg.add('LDA_ABS', PPU_STATUS); 	// read PPU status to reset the high/low latch
		// The palettes start at PPU address $3F00 and $3F10. To set this address, PPU address port $2006 is used.
		// This port must be written twice, once for the high byte then for the low byte:
		prg.add('LDA_IMM', addr >> 8);
		prg.add('STA_ABS', PPU_ADDR);		// write the high byte of {addr} address
		prg.add('LDA_IMM', addr & 0xff);
		prg.add('STA_ABS', PPU_ADDR);		// write the low byte of {addr}  address
		// The above code tells the PPU to set its address to {addr}. Now the PPU data port at $2007 is ready to accept data. 
		// The first write will go to the address you set (i.e. $3F00), then the PPU will automatically increment the address ($3F01, $3F02, $3F03) after each read or write. 
		// You can keep writing data and it will keep incrementing.
	};

	this.uploadPPU = function (dataAddr, dataLength) {
		let newLabel = prg.createUniqueLabelName(`uploadPPU_Loop`);
		// TODO: push/pop X?
		prg.add('LDX_IMM', 0); 			// initialize X with 0
		prg.setLabel(newLabel);
		prg.add('LDA_ABS_X', dataAddr);	// load palette byte
		prg.add('STA_ABS', PPU_DATA);						// write to PPU
		prg.add('INX');										// set index to next byte
		prg.add('CPX_IMM', dataLength);					// if X = 32, all is copied
		prg.add('BNE', prg.createLabelRel(newLabel));
	};

	this.clearRAM = function () {
		prg.add('LDX_IMM', 0);
		prg.setLabel('clear_ram_loop');
		prg.add('LDA_IMM', 0);
		prg.add('STA_ABS_X', 0x0000);
		prg.add('STA_ABS_X', 0x0100);
		//prg.add('STA_ABS_X', SPR_START);
		prg.add('STA_ABS_X', 0x0300);
		prg.add('STA_ABS_X', 0x0400);
		prg.add('STA_ABS_X', 0x0500);
		prg.add('STA_ABS_X', 0x0600);
		prg.add('STA_ABS_X', 0x0700);
		prg.add('LDA_IMM', 0xfe);
		prg.add('STA_ABS_X', SPR_START); // move sprites offscreen			
		prg.add('INX');
		prg.add('BNE', prg.createLabelRel('clear_ram_loop'));
	};

	this.importUtilities = function () {
		prg.setLabel('wait_for_vblank');
		prg.add('LDA_ABS', PPU_STATUS);
		prg.add('BPL', prg.createLabelRel('wait_for_vblank'));
		prg.add('RTS');
	};

	this.reset = function () {
		prg.add('SEI'); // disable IRQs
		prg.add('CLD'); // disable decimal mode
		prg.add('LDA_IMM', 0);
		prg.add('STA_ABS', PPU_CTRL);
		prg.add('STA_ABS', PPU_MASK);
		prg.add('STA_ABS', PPU_SCROLL);
		prg.add('STA_ABS', PPU_SCROLL);
		prg.add('LDX_IMM', 0xff);
		prg.add('TXS'); // initialize stack
		meta.jsr('wait_for_vblank');
		this.clearRAM();
		meta.jsr('wait_for_vblank');
	};

	// High level
	this.readControllers = function (player1, player2) {
		meta.setImm(JOYPAD, 0x01);
		meta.setImm(JOYPAD, 0x00); // tell both controller to latch buttons

		meta.setImm(player1, 0);
		meta.setImm(player2, 0);

		// Read all buttons for player 1
		for (let i = 0; i < 8; i++) {
			prg.add('LDA_ABS', JOYPAD_1);
			prg.add('LSR');
			prg.add('ROL_ABS', player1);
		}

		// Read all buttons for player 2
		for (let i = 0; i < 8; i++) {
			prg.add('LDA_ABS', JOYPAD_2);
			prg.add('LSR');
			prg.add('ROL_ABS', player2);
		}
	}

	this.writeFile = function (fileName) {
		let bin = prg.build();

		// Create the ROM file
		const SIZE_HEADER = 0x10;
		const SIZE_PRG = 0x8000;
		const SIZE_CHR = 0x2000;
		let fileSize = SIZE_HEADER + SIZE_PRG + SIZE_CHR;
		let rom = Buffer.alloc(fileSize);
		rom.fill(0xff);
		let sb = StreamBuffer.from(rom);

		// Header (16 bytes) https://wiki.nesdev.com/w/index.php/INES
		sb.writeString("NES");
		sb.writeByte(0x1a); // MS-DOS EOF
		sb.writeByte(0x01); // Size of PRG ROM in 16KB units
		sb.writeByte(0x01); // Size of CHR ROM in 8KB units (Value 0 means the board uses CHR RAM)
		sb.writeByte(0x00); // Flags 6 - Mapper, mirroring, battery, trainer

		// Write the actual program right after the ROM header
		bin.copy(rom, 0x10);

		fs.writeFileSync(fileName, rom);
	};

}

J6502_NES.prototype.SPR_START = SPR_START;
J6502_NES.prototype.PPU_CTRL = PPU_CTRL;
J6502_NES.prototype.PPU_MASK = PPU_MASK;
J6502_NES.prototype.PPU_STATUS = PPU_STATUS;
J6502_NES.prototype.SPR_ADDR = SPR_ADDR;
J6502_NES.prototype.SPR_DATA = SPR_DATA;
J6502_NES.prototype.PPU_SCROLL = PPU_SCROLL;
J6502_NES.prototype.PPU_ADDR = PPU_ADDR;
J6502_NES.prototype.PPU_DATA = PPU_DATA;

J6502_NES.prototype.SPR_DMA = SPR_DMA;
J6502_NES.prototype.JOYPAD = JOYPAD;
J6502_NES.prototype.JOYPAD_1 = JOYPAD_1;
J6502_NES.prototype.JOYPAD_2 = JOYPAD_2;

J6502_NES.prototype.BTN_A = BTN_A;
J6502_NES.prototype.BTN_B = BTN_B;
J6502_NES.prototype.BTN_SELECT = BTN_SELECT;
J6502_NES.prototype.BTN_START = BTN_START;
J6502_NES.prototype.BTN_UP = BTN_UP;
J6502_NES.prototype.BTN_DOWN = BTN_DOWN;
J6502_NES.prototype.BTN_LEFT = BTN_LEFT;
J6502_NES.prototype.BTN_RIGHT = BTN_RIGHT;
J6502_NES.prototype.BTN_AB = BTN_AB;
J6502_NES.prototype.BTN_UPLEFT = BTN_UPLEFT;
J6502_NES.prototype.BTN_UPRIGHT = BTN_UPRIGHT;
J6502_NES.prototype.BTN_DOWNLEFT = BTN_DOWNLEFT;
J6502_NES.prototype.BTN_DOWNRIGHT = BTN_DOWNRIGHT;

module.exports = J6502_NES;