/*
	6502 js assembler

	03-05-2020: Started
*/
import { readFileSync } from 'fs';
import { J6502_Emulator } from './jm65';
import { J6502_NES_Emulator } from './jm65-nes';

// Program entry and
main(process.argv);

function main(args) {
	let mode = args[2];

	switch (mode) {
		case 'jm':
			testJm(args);
			break;
		case 'nes':
			testJmNes(args);
			break;
		case 'dis':
			disassemble(args);
			break;
	}
}

function testJm(args) {
	let fileName = args[3];

	let fileBuffer = readFileSync(fileName);

	let emu = new J6502_Emulator();

	emu.load(fileBuffer);

	emu.run();
}

function testJmNes(args) {
	let fileName = args[3];
	let emu = new J6502_NES_Emulator();

	emu.loadFile(fileName);
	emu.run();
}

function disassemble(args) {
	let fileName = args[3];
	let offset = Number(args[4] || 0);

	let fileBuffer = readFileSync(fileName);

	let prg = J6502_Emulator.disassemble(fileBuffer, offset);

	console.log(prg);
}
