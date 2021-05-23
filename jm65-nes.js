/*
    6502 js NES emulator
    
    23-05-2021: Started
    
    $00-ff = zero page
    $100-1ff = stack
    $FFFA-FFFB - NMI vector
    $FFFC-FFFD - RESET vector
    $FFFE-FFFF - IRQ/BRK vector
*/
const fs = require('fs');
const StreamBuffer = require('streambuf');
const J6502_Program = require('./j6502');
const J6502_Instructions = require('./j6502-instr');
const JM65 = require('./jm65');

const JM = JM65.J6502_Emulator;

function J6502_NES_Emulator() {    

    this.load = function(buf) {
        let sb = new StreamBuffer(buf);

        // https://wiki.nesdev.com/w/index.php/INES
        let header = sb.read(16);
        let headerNes = header.readString(3);
        let headerNesEof = header.readByte(); // 0x1a
        let prgSize = header.readByte();
        let chrSize = header.readByte();
        let flags6 = header.readByte();
        let flags6bits = {
            Mirroring:       flags6 & 0b00000001,
            HasPrgRam:       flags6 & 0b00000010,
            HasTrainer:      flags6 & 0b00000100,
            IgnoreMirroring: flags6 & 0b00001000,
            MapperNumberLo:  flags6 >> 4
        };
        let flags7 = header.readByte();
        let flags7bits = {
            VSUnisystem:     flags7 & 0b00000001,
            Playchoice10:    flags7 & 0b00000010,
            NES2_0:         (flags7 & 0b00001100) >> 2 === 2, // Flags 8-16 are in NES 2.0 format
            IgnoreMirroring: flags7 & 0b00001000,
            MapperNumberHi:  flags7 >> 4
        };
        let flags8 = header.readByte();
        let flags9 = header.readByte();
        let flags9bits = {
            TVSystem:     flags9 & 0b00000001,
            TVSystemName: (flags9 & 0b00000001) === 0 ? 'ntsc' : 'pal'
        };
        let flags10 = header.readByte();
        console.log({
            headerNes,
            headerNesEof,
            prgSize,
            chrSize,
            flags6bits,
            flags7bits,
            flags8,
            flags9bits,
            flags10
        });

        // Read PRG
        let rom = sb.read(0x4000 * prgSize) // 16384 * x
        let chr = sb.read(0x2000 * chrSize); // 8192 * x

        // 6502 Machine        
        let jm = new JM({verbose: true});

        // Memory mapping
        let prgBank = new JM65.J6502_GenericROM(rom.buffer);
        prgBank.connect(jm.getMemoryBus(), 0x8000);
        if(prgSize === 1) { // Mirror memory
            prgBank.connect(jm.getMemoryBus(), 0xc000);
        }
        
        jm.reset();

        console.log("Initial state:")
        jm.printState();

        jm.run();

        console.log("Final state:")
        jm.printState();
    };

    this.loadFile = function(fileName) {
        let buf = fs.readFileSync(fileName);
        this.load(buf);
    };

    this.run = function() {

    };

    this.step = function() {

    };

}

function J6502_MemoryBus() {
    const handlers = [];

    this.connect = function(handler, start, end, offset=0) {
        handlers.push([handler, start, end, offset])
    };

    this.write = function(addr, val) {
        for(let h of handlers) {
            const [handler, start, end, offset] = h;
            if(addr >= start && addr < end) {
                //console.log("Target", start, end, offset)
                handler.write(addr - offset, val)
            }
        }
    };

    this.read = function(addr) {
        for(let h of handlers) {
            const [handler, start, end, offset] = h;
            if(addr >= start && addr < end) {
                return handler.read(addr - offset)
            }
        }
        return 0;
    };
}

function J6502_GenericStorage(size = 0x2000) { // default is 0x2000 = 8192 (8K)
    const ram = Buffer.alloc(size);
    
    this.connect = function(memBus, start=0) {
        memBus.connect(this, start, ram.length + start, start);
    };

    this.write = function(addr, val) {
        ram.writeUInt8(val, addr);
    };

    this.read = function(addr) {
        return ram.readUInt8(addr);
    };

    this.getBuffer = function() {
        return ram;
    };
}

module.exports = {
    J6502_NES_Emulator
}