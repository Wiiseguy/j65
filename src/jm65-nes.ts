/*
    6502 js NES emulator
    
    23-05-2021: Started
    
    $00-ff = zero page
    $100-1ff = stack
    $FFFA-FFFB - NMI vector
    $FFFC-FFFD - RESET vector
    $FFFE-FFFF - IRQ/BRK vector
*/
import { readFileSync } from 'fs';
import StreamBuffer from 'streambuf';
import { inspect } from 'util';
import { J6502_Emulator, J6502_GenericROM, J6502_GenericStorage } from './jm65';

const JM = J6502_Emulator;

function J6502_NES_Emulator() {

    this.load = function (buf) {
        let sb = new StreamBuffer(buf);

        const mirrorMemory = false;

        // https://wiki.nesdev.com/w/index.php/INES
        let header = sb.read(16);
        let headerNes = header.readString(3);
        let headerNesEof = header.readByte(); // 0x1a
        let prgSize = header.readByte();
        let chrSize = header.readByte();
        let flags6 = header.readByte();
        let flags6bits = {
            Mirroring: flags6 & 0b00000001,
            HasPrgRam: flags6 & 0b00000010,
            HasTrainer: flags6 & 0b00000100,
            IgnoreMirroring: flags6 & 0b00001000,
            MapperNumberLo: flags6 >> 4
        };
        let flags7 = header.readByte();
        let flags7bits = {
            VSUnisystem: flags7 & 0b00000001,
            Playchoice10: flags7 & 0b00000010,
            NES2_0: (flags7 & 0b00001100) >> 2 === 2, // Flags 8-16 are in NES 2.0 format
            IgnoreMirroring: flags7 & 0b00001000,
            MapperNumberHi: flags7 >> 4
        };
        let flags8 = header.readByte();
        let flags9 = header.readByte();
        let flags9bits = {
            TVSystem: flags9 & 0b00000001,
            TVSystemName: (flags9 & 0b00000001) === 0 ? 'ntsc' : 'pal'
        };
        let flags10 = header.readByte();
        /* console.log({
            headerNes,
            headerNesEof,
            prgSize,
            chrSize,
            flags6bits,
            flags7bits,
            flags8,
            flags9bits,
            flags10
        }); */

        // Read PRG
        let rom = sb.read(0x4000 * prgSize) // 16384 * x
        let chr = sb.read(0x2000 * chrSize); // 8192 * x

        // 6502 Machine        
        let jm = new JM({ verbose: true, count: true });
        let bus = jm.getMemoryBus();

        // RAM Memory mapping
        let zeroPage = new J6502_GenericStorage(0x100);
        //zeroPage.on('read', addr => console.log("Read from Zero Page!", addr.toString(16)))
        //zeroPage.on('write', (addr, val) => console.log("Write to Zero Page!", addr.toString(16), val.toString(16)))
        zeroPage.connect(bus, 0x0000);
        if (mirrorMemory) {
            zeroPage.connect(bus, 0x0800); // Mirroring
            zeroPage.connect(bus, 0x1000);
            zeroPage.connect(bus, 0x1800);
        }

        let stack = new J6502_GenericStorage(0x100);
        //stack.on('read', addr => console.log("Read from stack!", addr.toString(16)))
        //stack.on('write', (addr, val) => console.log("Write to stack!", addr.toString(16), val.toString(16)))
        stack.connect(bus, 0x0100);
        if (mirrorMemory) {
            stack.connect(bus, 0x0100 + 0x0800);
            stack.connect(bus, 0x0100 + 0x1000);
            stack.connect(bus, 0x0100 + 0x1800);
        }

        let ram = new J6502_GenericStorage(0x600);
        //ram.on('read', addr => console.log("Read from RAM!", addr.toString(16)))
        //ram.on('write', (addr, val) => console.log("Write to RAM!", addr.toString(16), val.toString(16)))
        ram.connect(bus, 0x0200);
        if (mirrorMemory) {
            ram.connect(bus, 0x0200 + 0x0800)
            ram.connect(bus, 0x0200 + 0x1000)
            ram.connect(bus, 0x0200 + 0x1800)
        }

        let PPU = new J6502_GenericStorage(0x8);
        PPU.connect(bus, 0x2000);
        //PPU.on('read', addr => console.log(" -PPU read:", addr.toString(16)))
        //PPU.on('write', (addr, val) => console.log(" -PPU write:", addr.toString(16), val.toString(16)))

        // TODO: Mirror $2008-$3FFF with mirrors of $2000-2007 (repeats every 8 bytes) (1023 times...)

        let APU = new J6502_GenericStorage(0x18);
        APU.connect(bus, 0x4000);

        let APU_IO = new J6502_GenericStorage(0x8);// APU and I/O functionality that is normally disabled
        APU_IO.connect(bus, 0x4018);

        // ROM Memory mapping
        let prgBank = new J6502_GenericROM(rom.buffer);
        prgBank.connect(bus, 0x8000);
        if (prgSize === 1) { // Mirror memory
            prgBank.connect(bus, 0xc000);
        }


        let startMs = +new Date;

        for (let i = 0; i < 1; i++) {
            jm.reset();
            // VBlank
            PPU.write(2, 0x80);

            //console.log("State", i)
            //jm.printState();
            jm.run();
            jm.nmi();

            console.log('Heat:', inspect(jm.getHeatMap(), { maxArrayLength: null }));
        }
        let durationMs = +new Date - startMs;

        jm.printState();
        //console.log('stack:', stack.getBuffer().slice(250))
        console.log("Cycles ran:", jm.getCycles(), 'in', durationMs + 'ms');
    };

    this.loadFile = function (fileName) {
        let buf = readFileSync(fileName);
        this.load(buf);
    };

    this.run = function () {

    };

    this.step = function () {

    };

}

export {
    J6502_NES_Emulator
}