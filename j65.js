/*
	6502 js assembler

	03-05-2020: Started
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
	}
}

function testJm(args) {
	let fileName = args[3];

	let fileBuffer = fs.readFileSync(fileName);
    
    let emu = new C6502_Emulator();
    
    emu.load(fileBuffer);

    emu.run();
}
