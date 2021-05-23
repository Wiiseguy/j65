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

function J6502_Emulator(opts) {
    opts = {
        verbose: false,
        ...opts
    };

    // Pins
    let halted = true;

    // Registers
    let A = 0x00;
    let X = 0x00;
    let Y = 0x00;

    // Hidden register
    let L = null; // Last op result

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

    // Vectors
    let RES = 0;
    let NMI = 0;
    let IRQ = 0;

    // Memory bus
    const memBus = new J6502_MemoryBus();

    // Proxy
    const proxy = {
        get A() { return A; },
        set A(val) { A = val; },
        get X() { return X; },
        set X(val) { X = val; },
        get Y() { return Y; },
        set Y(val) { Y = val; },
        get N() { return S.N; },
        set N(val) { S.N = val >= 0x80 ? 1 : 0; },
        get Z() { return S.Z; },
        set Z(val) { S.Z = val === 0 ? 1 : 0; },
        read(addr) { return memBus.read(addr); },
        write(addr, val) { return memBus.write(addr, val); },
        fetch() {
            return getNextByte();
        },
        fetch16() {
            return getNextAddress();
        }
    };

    this.resetState = function() {
        A = X = Y = SP = PC = 0;
        S.N = S.V = S.B = S.D = S.I = S.Z = S.C = 0;
    };

    this.getStatus = function() {
        return { A, X, Y, SP, PC, S: {...S} };
    };

    this.load = function(buf, offset=0) {
        let rom = new J6502_GenericROM(buf);
        rom.connect(memBus, offset);

        this.reset();
    };

    this.reset = function() {
        this.resetState();

        // Read vectors
        NMI = (memBus.read(0xfffb) << 8) + memBus.read(0xfffa);
        RES = (memBus.read(0xfffd) << 8) + memBus.read(0xfffc);
        IRQ = (memBus.read(0xffff) << 8) + memBus.read(0xfffe);

        PC = RES;
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

    this.printState = printState;

    function handleInstr(instr) {
        let n = instr.name;

        if(opts.verbose) {
            console.log("Handling instruction:", n);
        }

        if(instr.micro) {
            instr.micro(proxy);
        } else {
            switch(n) {
                case 'BRK': halted = true; break; // $00
                case 'SEI': S.I = 1; break; // $78
                case 'STA_ABS': memBus.write(getNextAddress(), A); break; // $8D
                case 'LDX_IMM': L = X = getNextByte(); break; // $A2
                //case 'LDA_IMM': L = A = getNextByte(); break; // $A9
                //case 'LDA_ABS': L = A = memBus.read(getNextAddress()); break;  // $AD
                case 'CLD': S.D = 0; break; // $D8
                default:
                    halted = true;
                    console.log(" Unhandled:", n, instr.op.toString(16));
            }
        }

        updateLFlags();

        //printState();
    }

    function updateLFlags() {
        if(L === null) return;
        S.N = L >= 0x80 ? 1 : 0;
        S.Z = L === 0 ? 1 : 0;
        L = null;
    }

    function getNextInstr() {
        let c = memBus.read(PC);

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
        let b = memBus.read(PC);
        PC = PC + 1;
        return b;
    }

    function getNextAddress() {
        let addr = getNextByte() + (getNextByte() << 8);
        return addr;
    }

    function printState() {
        console.log(" CPU:", {A, X, Y, SP, PC: PC.toString(16)}, "Status:", S);
        console.log(" Vectors:", { NMI: NMI.toString(16), Reset: RES.toString(16), IRQ: IRQ.toString(16), });
    }
}

J6502_Emulator.disassemble = function(prg, start=0) {
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
                //console.log('handler read:', h, addr)
                return handler.read(addr - offset)
            }
        }
        return 0;
    };
}

function J6502_GenericROM(buf) {
    if(!(buf instanceof Buffer)) throw new Error("'buf' must be of type Buffer");
    let rom = buf;
    
    this.connect = function(memBus, start=0) {
        memBus.connect(this, start, rom.length + start, start);
    };

    this.write = function(addr, val) {
        throw new Error("Can not write to ROM");
    };

    this.read = function(addr) {
        return rom.readUInt8(addr);
    };

    this.getBuffer = function() {
        return rom;
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
    J6502_GenericROM,
    J6502_GenericStorage
}