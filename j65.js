/*
	03-05-2020: Started

	TODO 12-05-2020: Split up into files
*/

const fs = require('fs');
const StreamBuffer = require('streambuf');

const C6502_Program = require('./j6502');
const C6502_Meta = require('./j6502-meta');
const C6502_NES = require('./j6502-nes');

// NES constants
// TODO: move
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

// Program entry
main(process.argv);

function main(args) {
	let mode = args[2];
	
	switch(mode) {
		default:
			testAssemble();
	}
}

function testAssemble() {
	const SIZE_HEADER = 0x10;
	const SIZE_PRG = 0x8000;
	const SIZE_CHR = 0x2000;
	let fileSize = SIZE_HEADER + SIZE_PRG + SIZE_CHR;	

	function create_NES_Bluescreen() {
		// Create PRG ROM and write some program!
		let prg = new C6502_Program(0x8000);
		let meta = new C6502_Meta(prg);
		let nes = new C6502_NES(prg);
		prg.setOrigin(0x8000);

		// Import subroutines
		nes.importUtilities();		

		// Reset
		prg.setLabel('RESET');
		nes.reset();
		
		prg.add('LDA_IMM', 0b10000000); // intensify blues
		prg.add('STA_ABS', PPU_MASK);

		// NMI
		prg.setLabel('NMI');
		prg.add('RTI');

		// IRQ/BRK?
		prg.setLabel('BRK');
		prg.add('RTI');

		// Set Vectors
		prg.moveTo(0xbffa);
		prg.put16(prg.getLabel('NMI'));		// NMI Interrupt Vector
		prg.put16(prg.getLabel('RESET')); 	// Reset Vector
		prg.put16(prg.getLabel('BRK')); 	// IRQ/BRK Vector (not used)

		return prg;
	}

	function create_NES_Sprites() {
		// Create PRG ROM and write some program!
		let prg = new C6502_Program(0x8000);
		let meta = new C6502_Meta(prg);
		let nes = new C6502_NES(prg);
		prg.setOrigin(0x8000);

		const BUTTONS_1		= 0xfe;
		const BUTTONS_2		= 0xff;

		const palette = [
			0x22, 0x29, 0x1A, 0x0F,   0x22, 0x36, 0x17, 0x0F,   0x22, 0x30, 0x21, 0x0F,   0x22, 0x27, 0x17, 0x0F, // background palette
			//0x0F, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x0F, // background palette
			0x22, 0x16, 0x28, 0x02,   0x22, 0x02, 0x38, 0x3C,   0x22, 0x1C, 0x15, 0x14,   0x22, 0x02, 0x38, 0x3C // sprite palette
			//0x0F, 0x1C, 0x15, 0x14, 0x31, 0x02, 0x38, 0x3C, 0x0F, 0x1C, 0x15, 0x14, 0x31, 0x02, 0x38, 0x3C  // sprite palette
		];

		const sprites = [
			// Y, tile, attrs, X
			0x80, 0x32, 0x00, 0x80, // sprite 0
			0x80, 0x33, 0x00, 0x88, // sprite 1
			0x88, 0x34, 0x00, 0x80, // sprite 2
			0x88, 0x35, 0x00, 0x88, // sprite 3

			0x08, 0x00, 0x00, 0x00, // 4
			0x08, 0x01, 0x00, 0x08, // 5
			0x08, 0x02, 0x00, 0x10, // 6
			// counter
			0x08, 0x00, 0x00, 0x20, // 7
			0x08, 0x00, 0x00, 0x28, // 8
			0x08, 0x00, 0x00, 0x30, // 9
		];

		const background = [
			0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24,  // row 1
			0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24,  // all sky
		  
		 	0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24,  // row 2
		 	0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24,  // all sky
			
		 	0x24, 0x24, 0x24, 0x24, 0x45, 0x45, 0x24, 0x24, 0x45, 0x45, 0x45, 0x45, 0x45, 0x45, 0x24, 0x24,  // row 3
		 	0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x53, 0x54, 0x24, 0x24,  // some brick tops
			
		 	0x24, 0x24, 0x24, 0x24, 0x47, 0x47, 0x24, 0x24, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x24, 0x24,  // row 4
		 	0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x55, 0x56, 0x24, 0x24,  // brick bottoms
		 	0x24, 0x24, 0x24, 0x24, 0x45, 0x45, 0x24, 0x24, 0x45, 0x45, 0x45, 0x45, 0x45, 0x45, 0x24, 0x24,  // row 3
		 	0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x53, 0x54, 0x24, 0x24,  // some brick tops
			
		 	0x24, 0x24, 0x24, 0x24, 0x47, 0x47, 0x24, 0x24, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x24, 0x24,  // row 4
		 	0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x55, 0x56, 0x24, 0x24,  // brick bottoms
			
		 	0x24, 0x24, 0x24, 0x24, 0x45, 0x45, 0x24, 0x24, 0x45, 0x45, 0x45, 0x45, 0x45, 0x45, 0x24, 0x24,  // row 3
		 	0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x53, 0x54, 0x24, 0x24,  // some brick tops
		  
			0x11, 0x18, 0x12, 0x24, 0x0E, 0x16, 0x16, 0x0A, 0x2B, 0x47, 0x47, 0x47, 0x47, 0x47, 0x24, 0x24,  // row 4
			0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x55, 0x56, 0x24, 0x24   // brick bottoms
		];
		const attributes = [
			0b00000000,  0b00110000,  0b10010000,  0b00000000,  0b00000000,  0b00000000,  0b00000000,  0b00110000
		];

		// Set palette data
		prg.setLabel("PaletteData");
		prg.putBytes(palette);

		// Set sprite data
		prg.setLabel("SpriteData");
		prg.putBytes(sprites);

		// Set background data
		prg.setLabel("BackgroundData");
		prg.putBytes(background);
		prg.setLabel("AttributeData");
		prg.putBytes(attributes);

		// Import subroutines
		nes.importUtilities();
		
		prg.setLabel('ResetAndCleanupPPU');
			meta.setImm(PPU_CTRL, 0b10010000); // enable NMI, sprites from Pattern Table 0 (bit 3), bg (bit 4) generate NMI at start of vblank (bit 7)
			meta.setImm(PPU_MASK, 0b00011110); // no intensify (black background), enable sprites, enable bgs
			meta.setImm(PPU_SCROLL, 0);
			meta.setImm(PPU_SCROLL); // tell the ppu there is no background scrolling twice (btw no value = write whatever is in A)
			prg.add('RTS');

		// Reset
		prg.setLabel('RESET');
		nes.reset();

		// Load palette		
		nes.setPPUAddress(0x3f00); // The palettes start at PPU address $3F00 and $3F10.
		nes.uploadPPU(prg.getLabel('PaletteData'), palette.length);

		// Load sprites to RAM
		meta.copy(SPR_START, prg.getLabel('SpriteData'), sprites.length);

		// Setup backgrounds
		nes.setPPUAddress(0x2000); 
		nes.uploadPPU(prg.getLabel('BackgroundData'), background.length);

		// Setup bg attributes
		nes.setPPUAddress(0x23c0); 
		nes.uploadPPU(prg.getLabel('AttributeData'), attributes.length);

		// Cleanup
		meta.jsr('ResetAndCleanupPPU');
		
		// NMI
		prg.setLabel('NMI');
		prg.add('LDX_ABS', 0x0000);
		prg.add('INX');
		prg.add('STX_ABS', 0x0000);
		prg.add('STX_ABS', nes.utils.getSpriteTile(6));

		// Controller
		nes.readControllers(BUTTONS_1, BUTTONS_2);

		meta.setAbs(nes.utils.getSpriteY(4), BUTTONS_1);
		meta.setAbs(nes.utils.getSpriteTile(4), BUTTONS_1);
		meta.setAbs(nes.utils.getSpriteTile(5), BUTTONS_1);
	
		// Display 123!
		meta.setImm(0x01, 10); // store 10 at 0x01
		//meta.setImm(0x02, 123);
		prg.add('STX_ABS', 0x02);
		meta.div(0x02, 0x01); // divide 123 by 10
		prg.add('STA_ABS', nes.utils.getSpriteTile(9)); // store remainder (3)
		meta.div(0x02, 0x01); // divide 12 by 10
		prg.add('STA_ABS', nes.utils.getSpriteTile(8)); // store remainder (2)
		meta.div(0x02, 0x01); // divide 1 by 10
		prg.add('STA_ABS', nes.utils.getSpriteTile(7)); // store remainder (1)

		// Move mario sprites
		prg.add('LDA_ABS', BUTTONS_1);
		prg.add('AND_IMM', BTN_RIGHT);
		prg.add('BEQ', prg.getLabelRel('NotR'));
		prg.add('INC_ABS', nes.utils.getSpriteX(0));
		prg.add('INC_ABS', nes.utils.getSpriteX(1));
		prg.add('INC_ABS', nes.utils.getSpriteX(2));
		prg.add('INC_ABS', nes.utils.getSpriteX(3));
		prg.setLabel('NotR')

		prg.add('LDA_ABS', BUTTONS_1);
		prg.add('AND_IMM', BTN_LEFT);
		prg.add('BEQ', prg.getLabelRel('NotL'));
		prg.add('DEC_ABS', nes.utils.getSpriteX(0));
		prg.add('DEC_ABS', nes.utils.getSpriteX(1));
		prg.add('DEC_ABS', nes.utils.getSpriteX(2));
		prg.add('DEC_ABS', nes.utils.getSpriteX(3));
		prg.setLabel('NotL')

		prg.add('LDA_ABS', BUTTONS_1);
		prg.add('AND_IMM', BTN_UP);
		prg.add('BEQ', prg.getLabelRel('NotU'));
		prg.add('DEC_ABS', nes.utils.getSpriteY(0));
		prg.add('DEC_ABS', nes.utils.getSpriteY(1));
		prg.add('DEC_ABS', nes.utils.getSpriteY(2));
		prg.add('DEC_ABS', nes.utils.getSpriteY(3));
		prg.setLabel('NotU')

		prg.add('LDA_ABS', BUTTONS_1);
		prg.add('AND_IMM', BTN_DOWN);
		prg.add('BEQ', prg.getLabelRel('NotD'));
		prg.add('INC_ABS', nes.utils.getSpriteY(0));
		prg.add('INC_ABS', nes.utils.getSpriteY(1));
		prg.add('INC_ABS', nes.utils.getSpriteY(2));
		prg.add('INC_ABS', nes.utils.getSpriteY(3));
		prg.setLabel('NotD')


		//nes.setPPUAddress(0x2100); 
		//nes.uploadPPU(nes.utils.getSpriteTile(8), 1);

		// Transfer sprite data at the end of NMI
		meta.setImm(SPR_ADDR, 0x00);
		meta.setImm(SPR_DMA, 0x02);
		// Once the second write is done the DMA transfer will start automatically. All data for the 64 sprites will be copied. 
		// Like all graphics updates, this needs to be done at the beginning of the VBlank period, so it will go in the NMI section of your code.			
		
		prg.add('RTI');

		// IRQ/BRK?
		prg.setLabel('BRK');
		prg.add('RTI');

		// Set Vectors
		prg.moveTo(0xbffa);
		prg.put16(prg.getLabel('NMI'));		// NMI Interrupt Vector
		prg.put16(prg.getLabel('RESET')); 	// Reset Vector
		prg.put16(prg.getLabel('BRK')); 	// IRQ/BRK Vector (not used)
		//prg.put16(0);

		// Include CHR
		prg.moveTo(0xc000);
		prg.include('mario.chr');

		return prg;
	}

	function create_NES_HelloWorld() {
		// Create PRG ROM and write some program!
		let prg = new C6502_Program(0x8000);
		let meta = new C6502_Meta(prg);
		let nes = new C6502_NES(prg);
		prg.setOrigin(0x8000);

		const BUTTONS_1		= 0xfe;
		const BUTTONS_2		= 0xff;

		const palette = [
			0x22, 0x29, 0x1A, 0x0F,   0x22, 0x36, 0x17, 0x0F,   0x22, 0x30, 0x21, 0x0F,   0x22, 0x27, 0x17, 0x0F, // background palette
			0x22, 0x16, 0x28, 0x02,   0x22, 0x02, 0x38, 0x3C,   0x22, 0x1C, 0x15, 0x14,   0x22, 0x02, 0x38, 0x3C // sprite palette
		];

		const sprites = [
			// Y, tile, attrs, X
			0x80, 0x32, 0x00, 0x80, // sprite 0
			0x80, 0x33, 0x00, 0x88, // sprite 1
			0x88, 0x34, 0x00, 0x80, // sprite 2
			0x88, 0x35, 0x00, 0x88, // sprite 3
			0, 0, 0, 0, // sprite 4
			0, 0, 0, 0, // sprite 4
			0x88, 0x35, 0x00, 0x88, // sprite 4
			0, 0, 0, 0, // sprite 4
		];

		const SP = 0x24;
		const asciiOffset = 0x20;
		const asciiMap = [
			SP, SP, SP, SP, 		SP, SP, SP, SP,			SP, SP, SP, SP,			SP, SP, SP, SP,
			0, 1, 2, 3,  			4, 5, 6, 7,   			8, 9, SP, SP,  			SP, SP, SP, SP,
			SP, 0xa, 0xb, 0xc,		0xd, 0xe, 0xf, 0x10, 	0x11, 0x12, 0x13, 0x14,	0x15, 0x16, 0x17, 0x18,
			0x19, 0x1a, 0x1b, 0x1c,	0x1d, 0x1e, 0x1f, 0x20,	0x21, 0x22, 0x23	
		];

		const PARAM_A = prg.setVar('paramA');

		// Set palette data
		prg.setLabel("PaletteData");
			prg.putBytes(palette);

		// Set sprite data
		prg.setLabel("SpriteData");
			prg.putBytes(sprites);

		// Set text data
		prg.setLabel("AsciiData");
			prg.putBytes(asciiMap);

		// Set the text
		let str = "HELLO WORLD";
		prg.setLabel("MyString");
			prg.put(str.length);
			prg.putBytes(str);

		// Write text as sprites
		prg.setLabel('WriteText');
			prg.add('LDA_ABS', prg.getLabel('MyString'));
			//prg.add('TAY') // Transfer length of string from A into Y
			prg.add('LDX_IMM', 0);
			prg.add('LDY_IMM', 1);
			meta.pushAbs(PARAM_A);
			meta.setImm(PARAM_A, 0x48); // paramA is used for text X, start at 48
			prg.setLabel('WriteText_Loop');
				prg.add('INX');
				prg.add('TXA');
				meta.push(); // save X
				prg.add('TYA');
				meta.push(); // save Y				
				prg.add('LDA_ABS_X', prg.getLabel('MyString')); // get actual char value
				prg.add('ADC_IMM', -asciiOffset);				// transform it
				prg.add('TAY');									// store A in Y
				prg.add('LDA_ABS_Y', prg.getLabel("AsciiData")) // use Y as offset to lookup in AsciiData table
				prg.add('TAX'); // store A in X temporarily so we can pop
				meta.pop(); // pop old Y into A
				prg.add('TAY'); // store old Y into Y again
				prg.add('TXA'); 
				prg.add('STA_ABS_Y', SPR_START); // set tile
				prg.add('DEY');	// go back one byte
				prg.add('LDA_ABS', PARAM_A); // also use paramA for Y, because of the 8 sprites per scanline limit
				prg.add('STA_ABS_Y', SPR_START); // set Y pos
				prg.add('INY'); // tile
				prg.add('INY'); // attr
				prg.add('LDA_IMM', 0);
				prg.add('STA_ABS_Y', SPR_START); // set attr
				prg.add('INY');
				prg.add('LDA_ABS', PARAM_A);
				prg.add('STA_ABS_Y', SPR_START); // set X pos
				prg.add('ADC_IMM', 8);
				prg.add('STA_ABS', PARAM_A);
				prg.add('INY');
				prg.add('INY');
				meta.pop(); // pop X
				prg.add('TAX');
				prg.add('CPX_ABS', prg.getLabel('MyString'));
				prg.add('BNE', prg.getLabelRel('WriteText_Loop'));
			meta.popAbs(PARAM_A);
			prg.add('RTS');

		// Import subroutines
		nes.importUtilities();		
		
		prg.setLabel('ResetAndCleanupPPU');
			meta.setImm(PPU_CTRL, 0b10010000); // enable NMI, sprites from Pattern Table 0 (bit 3), bg (bit 4) generate NMI at start of vblank (bit 7)
			meta.setImm(PPU_MASK, 0b00010110); // no intensify (black background), enable sprites, enable bgs
			meta.setImm(PPU_SCROLL, 0);
			meta.setImm(PPU_SCROLL); // tell the ppu there is no background scrolling twice (btw no value = write whatever is in A)
			prg.add('RTS');

		// Reset
		prg.setLabel('RESET');
		meta.jsr('WriteText');
		nes.reset();

		// Load palette
		nes.setPPUAddress(0x3f00); // The palettes start at PPU address $3F00 and $3F10.
		nes.uploadPPU(prg.getLabel('PaletteData'), palette.length);

		// Load sprites to RAM
		meta.copy(SPR_START, prg.getLabel('SpriteData'), sprites.length);

		// Cleanup
		meta.jsr('ResetAndCleanupPPU');
		
		// NMI
		prg.setLabel('NMI');		

		// Controller
		nes.readControllers(BUTTONS_1, BUTTONS_2);

		meta.jsr('WriteText');

		// Transfer sprite data at the end of NMI
		meta.setImm(SPR_ADDR, 0x00);
		meta.setImm(SPR_DMA, 0x02);
		// Once the second write is done the DMA transfer will start automatically. All data for the 64 sprites will be copied. 
		// Like all graphics updates, this needs to be done at the beginning of the VBlank period, so it will go in the NMI section of your code.			
		
		prg.add('RTI');

		// IRQ/BRK?
		prg.setLabel('BRK');
		prg.add('RTI');

		// Set Vectors
		prg.moveTo(0xbffa);
		prg.put16(prg.getLabel('NMI'));		// NMI Interrupt Vector
		prg.put16(prg.getLabel('RESET')); 	// Reset Vector
		prg.put16(prg.getLabel('BRK')); 	// IRQ/BRK Vector (not used)
		//prg.put16(0);

		// Include CHR
		prg.moveTo(0xc000);
		prg.include('mario.chr');

		return prg;
	}

	let prg = create_NES_HelloWorld();

	// Create the ROM file
	let rom = Buffer.alloc(fileSize);
	rom.fill(0xff);
	let sb = StreamBuffer(rom);

	// Header (16 bytes) https://wiki.nesdev.com/w/index.php/INES
	sb.writeString("NES");
	sb.writeByte(0x1a); // MS-DOS EOF
	sb.writeByte(0x01); // Size of PRG ROM in 16KB units
	sb.writeByte(0x01); // Size of CHR ROM in 8KB units (Value 0 means the board uses CHR RAM)
	sb.writeByte(0x00); // Flags 6 - Mapper, mirroring, battery, trainer

	// Write the actual program right after the ROM header
	let prgBuf = prg.build();
	prgBuf.copy(rom, 0x10);

	fs.writeFileSync("rom-helloworld.nes", rom);
}
