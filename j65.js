/*
	6502 js assembler

	03-05-2020: Started
	14-02-2021: Split test programs up into files

*/

const fs = require('fs');
const StreamBuffer = require('streambuf');
const { C6502_Emulator } = require('./jm65');

// Program entry
main(process.argv);

function main(args) {
	let mode = args[2];
	
	switch(mode) {
		case 'jm':
			testJm(args);
			break;
		default:
			testAssemble();
	}
}

function testJm(args) {
	let fileName = args[3];

	let fileBuffer = fs.readFileSync(fileName);
    
    let emu = new C6502_Emulator();
    
    emu.load(fileBuffer);

    emu.run();
}

function testAssemble() {
	const SIZE_HEADER = 0x10;
	const SIZE_PRG = 0x8000;
	const SIZE_CHR = 0x2000;
	let fileSize = SIZE_HEADER + SIZE_PRG + SIZE_CHR;	

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

	fs.writeFileSync("rom-test.nes", rom);
}
