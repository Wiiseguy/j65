"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
    6502 js assembler

    03-05-2020: Started
*/
const fs_1 = require("fs");
const jm65_1 = require("./jm65");
const jm65_nes_1 = require("./jm65-nes");
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
    let fileBuffer = (0, fs_1.readFileSync)(fileName);
    let emu = new jm65_1.J6502_Emulator();
    emu.load(fileBuffer);
    emu.run();
}
function testJmNes(args) {
    let fileName = args[3];
    let emu = new jm65_nes_1.J6502_NES_Emulator();
    emu.loadFile(fileName);
    emu.run();
}
function disassemble(args) {
    let fileName = args[3];
    let offset = Number(args[4] || 0);
    let fileBuffer = (0, fs_1.readFileSync)(fileName);
    let prg = jm65_1.J6502_Emulator.disassemble(fileBuffer, offset);
    console.log(prg);
}
