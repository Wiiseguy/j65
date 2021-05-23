/*
	6502 js assembler

	03-05-2020: Started
*/

const fs = require('fs');
const StreamBuffer = require('streambuf');
const { J6502_Emulator } = require('./jm65');
const J6502_Program = require('./j6502');

// Program entry
main(process.argv);

function main(args) {
	let mode = args[2];
	
	switch(mode) {
		case 'jm':
			testJm(args);
			break;
		case 'dis':
			disassemble(args);
			break;
	}
}

function testJm(args) {
	let fileName = args[3];

	let fileBuffer = fs.readFileSync(fileName);
    
    let emu = new J6502_Emulator();
    
    emu.load(fileBuffer);

    emu.run();
}

function disassemble(args) {
	let fileName = args[3];
	let offset = Number(args[4] || 0);

	let fileBuffer = fs.readFileSync(fileName);
    
    let prg = J6502_Program.disassemble(fileBuffer, offset);
    
    console.log(prg);
}
