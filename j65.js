const fs = require('fs');
const StreamBuffer = require('streambuf');


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
	let rom = Buffer.alloc(fileSize);
	rom.fill(0xff);
	let buf = StreamBuffer(rom);

	// CPU memory map
	const ADDR_PRG = 0x8000;
	
	// Header (16 bytes) https://wiki.nesdev.com/w/index.php/INES
	buf.writeString("NES");
	buf.writeByte(0x1a); // MS-DOS EOF
	buf.writeByte(0x01); // Size of PRG ROM in 16KB units
	buf.writeByte(0x01); // Size of CHR ROM in 8KB units (Value 0 means the board uses CHR RAM)
	buf.writeByte(0x00); // Flags 6 - Mapper, mirroring, battery, trainer

	function subroutine_WaitForVblank(prg) {
		prg.setLabel('wait_for_vblank');
			prg.add('LDA_ABS', PPU_STATUS);
			prg.add('BPL', prg.getLabelRel('wait_for_vblank'));
			prg.add('RTS');
	}

	function macro_ClearRam(prg) {
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
			prg.add('BNE', prg.getLabelRel('clear_ram_loop'));
	}

	function macro_Reset(prg) {		
		prg.add('SEI'); // disable IRQs
		prg.add('CLD'); // disable decimal mode
		prg.add('LDA_IMM', 0);
		prg.add('STA_ABS', PPU_CTRL);
		prg.add('STA_ABS', PPU_MASK);
		prg.add('STA_ABS', PPU_SCROLL);
		prg.add('STA_ABS', PPU_SCROLL);
		prg.add('LDX_IMM', 0xff);
		prg.add('TXS'); // initialize stack
		prg.add('JSR', prg.getLabel('wait_for_vblank'));
		prg.import(macro_ClearRam);
		prg.add('JSR', prg.getLabel('wait_for_vblank'));
	}

	function create_NES_Bluescreen() {
		// Create PRG ROM and write some program!
		let prg = new C6502_Program(0x8000);
		prg.setOrigin(0x8000);

		// Import subroutines
		prg.import(subroutine_WaitForVblank);		

		// Reset
		prg.setLabel('RESET');
		prg.import(macro_Reset);
		
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
		let meta = new C6502_NES(prg);
		prg.setOrigin(0x8000);

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

			0x08, 0x00, 0x00, 0x00, // 0
			0x08, 0x01, 0x00, 0x08, // 0
			0x08, 0x02, 0x00, 0x10, // 0
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
		prg.import(subroutine_WaitForVblank);

		// Reset
		prg.setLabel('RESET');
			// Test relative labels to the future (works)
			//prg.add('BNE', prg.getLabelRel('POEP'));
			//prg.add('INX');
			//prg.setLabel('POEP');
		prg.import(macro_Reset);

		// Load palette		
		meta.setPPUAddress(0x3f00); // The palettes start at PPU address $3F00 and $3F10.
		meta.uploadPPU('PaletteData', palette.length);

		// Load sprites to RAM
		meta.uploadRAM(SPR_START, 'SpriteData', sprites.length);

		// Setup backgrounds
		meta.setPPUAddress(0x2000); 
		meta.uploadPPU('BackgroundData', background.length);

		// Setup bg attributes
		meta.setPPUAddress(0x23c0); 
		meta.uploadPPU('AttributeData', attributes.length);

		meta.setImm(PPU_CTRL, 0b10010000); // enable NMI, sprites from Pattern Table 0 (bit 3), bg (bit 4) generate NMI at start of vblank (bit 7)
		meta.setImm(PPU_MASK, 0b00011110); // no intensify (black background), enable sprites, enable bgs
		meta.setImm(PPU_SCROLL, 0);
		meta.setImm(PPU_SCROLL); // tell the ppu there is no background scrolling twice (btw no value = write whatever is in A)

		
		// NMI
		prg.setLabel('NMI');
		prg.add('LDX_ABS', 0x0000);
		prg.add('INX');
		prg.add('STX_ABS_X', 0x0000);
		prg.add('STX_ABS_X', meta.utils.getSpriteAddr(6)+1);

		// Transfer sprite data
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

	let prg = create_NES_Sprites();

	// Write the PRG right after header
	buf.seek(0x0010); 
	writeBytes(buf, prg.build());

	fs.writeFileSync("rom-sprites-test.nes", rom);
}

function C6502_NES(prg) {
	if(!(prg instanceof C6502_Program))
		throw new Error(`'prg' should be an instance of C6502_Program`);

	// Helper
	this.utils = {
		getSpriteAddr(spriteNum) {
			return SPR_START + spriteNum * 4;
		}
	};

	// Low-level 
	this.setImm = function(addr, value) {
		if(value !== undefined) {
			prg.add('LDA_IMM', value); 
		}
		prg.add('STA_ABS', addr);
	};

	this.setAbs = function(addr, otherAddr) {
		if(otherAddr !== undefined) {
			prg.add('LDA_ABS', otherAddr);  
		}		
		prg.add('STA_ABS', addr);
	};
	
	// Mid-level
	this.setPPUAddress = function(addr) {
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

	this.uploadPPU = function(dataLabel, dataLength) {
		// TODO: push/pop X?
		prg.add('LDX_IMM', 0); 			// initialize X with 0
		prg.setLabel(`Load_${dataLabel}_Loop`);
			prg.add('LDA_ABS_X', prg.getLabel(dataLabel));	// load palette byte
			prg.add('STA_ABS', PPU_DATA);						// write to PPU
			prg.add('INX');										// set index to next byte
			prg.add('CPX_IMM', dataLength);					// if X = 32, all is copied
			prg.add('BNE', prg.getLabelRel(`Load_${dataLabel}_Loop`));		
	};

	this.uploadRAM = function(startAddr, dataLabel, dataLength) {
		// TODO: push/pop X?
		prg.add('LDX_IMM', 0); // start at 0
		prg.setLabel(`Load_${dataLabel}_Loop`);
			prg.add('LDA_ABS_X', prg.getLabel(dataLabel)); // load data from address SpriteData + x
			prg.add('STA_ABS_X', startAddr); // store into RAM (0200 + x)
			prg.add('INX');
			prg.add('CPX_IMM', dataLength);
			prg.add('BNE', prg.getLabelRel(`Load_${dataLabel}_Loop`));	
	};

	this.div = function(numerator, denominator) {
		let L1 = prg.createUniqueLabelName('DIV');
		let L2 = prg.createUniqueLabelName('DIV');
		prg.add('LDA_IMM', 0);
		prg.add('LDX_IMM', 8);
		prg.add('ASL', numerator);
		prg.setLabel(L1);
		prg.add('ROL');
		prg.add('CMP', denominator);
		prg.add('BCC', prg.getLabelRel('L2'));
		prg.add('SBC', denominator);
		prg.setLabel(L2);
		prg.add('ROL', numerator);
		prg.add('DEX');
		prg.add('BNE', prg.getLabelRel('L1'))
	};

}


function C6502_Program(size) {
	if(!size) size = 0x4000; // 16K default
	let prg = Buffer.alloc(size);
	prg.fill(0xff);
	let buf = StreamBuffer(prg);

	// TODO: move outside func
	let instructions = {
		'BPL': 			{ op: 0x10, size: 2, desc: 'Branch on Result Plus (N == 0)' },
		'JSR': 			{ op: 0x20, size: 3, desc: 'Jump to New Location Saving Return Address' },
		'RTI': 			{ op: 0x40, size: 1, desc: 'Return from Interrupt' },	
		'JMP_ABS': 		{ op: 0x4c, size: 3 },
		'RTS': 			{ op: 0x60, size: 1, desc: 'Return from Subroutine' },
		'ADC_IMM': 		{ op: 0x69, size: 2 },
		'SEI': 			{ op: 0x78, size: 1, desc: 'Set Interrupt Disable Status' },
		'STA_ABS': 		{ op: 0x8d, size: 3 },
		'STX_ABS_X':	{ op: 0x8e, size: 3 },
		'TXS': 			{ op: 0x9a, size: 1, desc: 'Transfer Index X to Stack Register (X -> SP)' },
		'STA_ABS_X':	{ op: 0x9d, size: 3 },
		'LDX_IMM': 		{ op: 0xa2, size: 2 },
		'LDA_IMM': 		{ op: 0xa9, size: 2 },
		'LDA_ABS': 		{ op: 0xad, size: 3 },
		'LDX_ABS': 		{ op: 0xae, size: 3 },
		'LDA_ABS_X': 	{ op: 0xbd, size: 3 },
		'BNE': 			{ op: 0xd0, size: 2, desc: 'Branch on Result not Zero' },
		'CLD': 			{ op: 0xd8, size: 1, desc: 'Clear Decimal Mode' },
		'CPX_IMM': 		{ op: 0xe0, size: 2, desc: 'Compare value and Index X' },
		'INX': 			{ op: 0xe8, size: 1 },
	};

	// Vars
	let labels = {};
	let labelCounter = 0;	
	let origin = 0; // used for labels
	let assembly = [];

	function Instruction(name, data) {
		// TODO: Keep buf as internal cursor to resolve labels 
		this.name = name;
		this.data = data;
	}

	function DataInsertion(bytes) {
		this.data = bytes;
	}

	function Label(name) {
		this.name = name;
	}

	function RelativeLabel(name) {
		this.name = name;
	}

	function CursorMover(addr) {
		this.address = addr;
	}

	function getLabelAddress(name) {
		let label = labels[name];
		if(label === undefined) throw new RangeError(`Unknown label: ${name}`);
		console.log("Fetched label:", name, '=', label.toString(16));
		return label;
	}

	function getRelativeLabelAddress(name) {
		let addr = getLabelAddress(name);
		let relative = addr - origin - buf.getPos() - 2; // offset -2 to take own instruction + this relative addr into account
		console.log("Fetched relative label:", name, '=', relative.toString(16));
		return relative & 0xff;
	}

	this.build = function() {
		buf.setPos(0);
		prg.fill(0xff); // reset buffer

		for(let a of assembly) {
			if(a instanceof Instruction) {
				let instr = instructions[a.name];
				let data = a.data;				
				if(data instanceof Label) {
					data = getLabelAddress(data.name);
				} else if(data instanceof RelativeLabel) {
					data = getRelativeLabelAddress(data.name);
				}

				let expectedNumBytes = instr.size;
				let bytesToWrite = new Uint8Array(expectedNumBytes);
				bytesToWrite[0] = instr.op; // first byte is the op code
				for(let i = 0; i < expectedNumBytes-1; i++) {
					bytesToWrite[i+1] = data >> (8*i) & 0xff; // shift data to lower endian format
				}
				console.log("  ", a.name, data || '', "->", /*bytesToWrite,*/ bytesToWrite[0].toString(16), uintLeArrToString(bytesToWrite.slice(1)), instr.desc ? `(${instr.desc})` : '');
				writeBytes(buf, bytesToWrite);
			} else if(a instanceof DataInsertion) {
				let data = a.data;
				if(data instanceof Label) {
					let b16 = getLabelAddress(data.name);
					let tb = Buffer.alloc(2);
					tb.writeUInt16LE(b16);
					data = tb;
				} else if(data instanceof RelativeLabel) {
					data = getRelativeLabelAddress(data.name);
				}
				console.log(`- putting ${data.length} bytes`, data, 'at', buf.getPos().toString(16));
				let u8a = new Uint8Array(data);
				writeBytes(buf, u8a);
			} else if(a instanceof CursorMover) {
				let addr = a.address;
				console.log("- moved to", addr.toString(16));
				buf.setPos(addr);
			}
		}

		return buf.buffer;
	};

	this.add = function(name, data) {
		let instr = instructions[name];
		if(!instr) throw RangeError(`Unknown instruction: ${name}`);
		buf.skip(instr.size);
		assembly.push(new Instruction(name, data));
	};

	this.put = function(data) {
		if(data >= 0 && data <= 0xff) {
			buf.skip(1);
			assembly.push(new DataInsertion(data));
		} else {
			throw new RangeError(`put: ${data} is not between 0 and ${0xff}`);
		}
	};

	this.put16 = function(data) {
		buf.skip(2);
		assembly.push(new DataInsertion(data));
	};

	this.putBytes = function(arr) {
		buf.skip(arr.length);
		assembly.push(new DataInsertion(arr));
	};

	this.include = function(filePath) {
		let fileBuffer = fs.readFileSync(filePath);
		buf.skip(fileBuffer.length);
		assembly.push(new DataInsertion(fileBuffer));
	};

	this.import = function(importFn) {
		console.log("IMPORT:", importFn.name);
		importFn(this);
		console.log("END IMPORT:", importFn.name);
	};

	this.createUniqueLabelName = function(name) {
		let lbl = `${name}_${labelCounter}`;
		labelCounter = labelCounter + 1;
		return lbl;
	};

	this.setLabel = function(name) {
		if(labels[name] !== undefined) throw new RangeError(`Label redefinition: ${name}`);
		labels[name] = buf.getPos() + origin;
		console.log("Added label:", name, 'at', labels[name].toString(16));
	};

	this.getLabel = function(name) {
		return new Label(name);
	};

	this.getLabelRel = function(name) {
		return new RelativeLabel(name);		
	};

	this.setOrigin = function(addr) {
		origin = addr;
	};

	// Moves relative to origin
	this.moveTo = function(addr) {		
		buf.setPos(addr - origin);
		assembly.push(new CursorMover(buf.getPos()));		
	};

	this.getBuffer = function() {
		return buf.buffer;
	};
}

function uintLeArrToString(uarr) {
	return [...uarr].reverse().map(a => a.toString(16).padStart(2, '0')).join('');
}

function writeBytes(sb, arr) {
	//console.log("- writing", arr.length, 'bytes');
	for(let i=0; i < arr.length; i++) {
		sb.writeByte(arr[i]);
	}
}

