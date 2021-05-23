/*
    6502 js emulator
    
    14-02-2021: Started
    
    $00-ff = zero page
    $100-1ff = stack
    $FFFA-FFFB - NMI vector
    $FFFC-FFFD - RESET vector
    $FFFE-FFFF - IRQ/BRK vector
*/

const StreamBuffer = require('streambuf');
const J6502_Program = require('./j6502');
const J6502_Instructions = require('./j6502-instr');

function J6502_Emulator() {
    let prg = null;

    // Pins
    let halted = true;

    // Registers
    let A = 0x00;
    let X = 0x00;
    let Y = 0x00;

    // Hidden register
    let L = 0x00; // Last op result

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
    const memBus = new J6502_MemoryBus();

    this.reset = function() {
        A = X = Y = SP = PC = 0;
        S.N = S.V = S.B = S.D = S.I = S.Z = S.C = 0;
    };

    this.getStatus = function() {
        return { A, X, Y, SP, PC, S: {...S} };
    };

    this.load = function(buf) {
        prg = buf;

        // Read reset vector ($FFFC/FFFD)
        PC = (memBus.read(0xfffd) << 8) + memBus.read(0xfffc);
    };

    this.run = function() {
        //printState();
        let instr;
        halted = false;
        while(halted === false) {
            instr = getNextInstr();
            if(instr) {
                handleInstr(instr);
            } else {
                break;
            }
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

    this.disassemble = function(start=0) {
        const program = new J6502_Program();
        const sb = new StreamBuffer(prg);
        sb.seek(start);
        while(!sb.isEOF()) {
            let op = sb.readByte();
            let instr = J6502_Instructions.InstructionsByOp[op];
            let data = null;
            if(instr) {
                if(instr.size === 2) {
                    data = sb.readByte();
                } else if(instr.size === 3) {
                    data = sb.readUInt16LE();
                }
                program.add(instr.name, data);
            }
        }
        return program.getAssembly();
    };


    function handleInstr(instr) {
        let n = instr.name;

        switch(n) {
            case 'BRK':
                halted = true;
                break;
            case 'LDA_IMM':
                L = A = getNextByte();                
                break;
            case 'LDA_ABS':
                L = A = memBus.read(getNextAddress());
                break;
            case 'STA_ABS':
                memBus.write(getNextAddress(), A);
                break;
            default:
                console.log(" Unhandled:", n);
        }

        updateLFlags();

        //printState();
    }

    function updateLFlags() {
        S.N = L >= 0x80 ? 1 : 0;
        S.Z = L === 0 ? 1 : 0;
    }

    function getNextInstr() {
        let c = prg.readUInt8(PC);

        // For dev purposes
        if(c === 0xff) {
            // Treat as halt/kill
            //console.log("Emulation halted:", c.toString(16));
            return null;
        }

        let instr = J6502_Instructions.InstructionsByOp[c];

        if(!instr)
            throw new Error(`Unknown op code: ${c} (0x${c.toString(16)})`);

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
    J6502_Emulator,
    J6502_MemoryBus,
    J6502_GenericStorage
}