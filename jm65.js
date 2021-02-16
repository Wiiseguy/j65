/*
    6502 js emulator
    
    14-02-2021: Started
    
*/

const fs = require('fs');
const StreamBuffer = require('streambuf');
const C6502_Instructions = require('./j6502-instr');

let instr_lookup = {};
Object.entries(C6502_Instructions).forEach(([name, val]) => {
    instr_lookup[val.op] = {...val, name};
});


function C6502_Emulator() {
    let prg = null;

    // Registers
    let A = 0x00;
    let X = 0x00;
    let Y = 0x00;

    // Stack pointer
    let SP = 0x00;

    // Program counter
    let PC = 0x0000;

    // Status register
    let S = {
        N: 0,
        V: 0,
        B: 0,
        D: 0,
        I: 0,
        Z: 0,
        C: 0
    };

    // Memory bus
    const memBus = new C6502_MemoryBus();

    this.reset = function() {
        A = X = Y = SP = PC = 0;
        S.N = S.V = S.B = S.D = S.I = S.Z = S.C = 0;
    };

    this.getStatus = function() {
        return { A, X, Y, SP, PC, S: {...S} };
    };

    this.load = function(buf) {
        prg = buf;
        //console.log("Loaded:", prg.length);
    };

    this.run = function() {
        //printState();
        let instr;
        while(instr = getNextInstr()) {
            handleInstr(instr);
        }
    };

    this.step = function() {
        let instr = getNextInstr();
        if(instr) {
            handleInstr(instr);
        }
    };

    this.getMemoryBus = function() {
        return memBus;
    };

    function handleInstr(instr) {
        let n = instr.name;

        switch(n) {
            case 'LDA_IMM':
                A = getNextByte();
                break;
            case 'LDA_ABS':
                A = memBus.read(getNextAddress());
                break;
            case 'STA_ABS':
                memBus.write(getNextAddress(), A);
                break;
            default:
                console.log(" Unhandled:", n);
        }

        //printState();
    }

    function getNextInstr() {
        let c = prg.readUInt8(PC);

        // For dev purposes
        if(c === 0xff) {
            // Treat as halt/kill
            //console.log("Emulation halted:", c.toString(16));
            return null;
        }

        let instr = instr_lookup[c];

        if(!instr)
            throw new Error(`Unknown op code: ${c.toString(16)}`);

        //console.log("Instr:", instr);

        // Increment PC
        PC = PC + 1;

        return instr;
    }

    function getNextByte() {
        let b = prg.readUInt8(PC);
        PC = PC + 1;
        return b;
    }

    function getNextAddress() {
        let addr = getNextByte() + (getNextByte() << 8);
        return addr;
    }

    function printState() {
        console.log("  CPU:", {A, X, Y, SP, PC}, "Status:", S);
    }
}

function C6502_MemoryBus() {
    const handlers = [];

    this.connect = function(handler, start, end, offset=0) {
        handlers.push([handler, start, end, offset])
    };

    this.write = function(addr, val) {
        //console.log("OK??????????", addr, val, handlers)
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
    };
}

function C6502_GenericStorage(size = 0x2000) { // default is 0x2000 = 8192 (8K)
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
    C6502_Emulator,
    C6502_MemoryBus,
    C6502_GenericStorage
}