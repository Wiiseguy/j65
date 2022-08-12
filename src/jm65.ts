/*
    6502 js emulator
    
    14-02-2021: Started
    
    $00-ff = zero page
    $100-1ff = stack
    $FFFA-FFFB - NMI vector
    $FFFC-FFFD - RESET vector
    $FFFE-FFFF - IRQ/BRK vector
*/
import * as StreamBuffer from 'streambuf';
import { InstructionsByOp } from './j6502-instr'
import { J6502_Program } from './j6502';
import { EventEmitter } from 'stream';

// TODO: rewrite to class
function J6502_Emulator(opts = undefined) {
    opts = {
        verbose: false,
        count: false,
        ...opts
    };

    // Pins
    let halted = true;

    // Registers
    let CPU = {
        A: 0,
        X: 0,
        Y: 0,
        AD: 0,  // Internal 16-bit register
        ADR: 0, // Internal 16-bit register for keeping addresses
        SIR: 0,
        SP: 0,
        PC: 0,
        S: {
            N: 0,
            V: 0,
            B: 0,
            D: 0,
            I: 0,
            Z: 0,
            C: 0
        }
    };

    let CPU_Initial = JSON.parse(JSON.stringify(CPU));
    let CPU_Initial_S = JSON.parse(JSON.stringify(CPU.S));

    // 27-05-2021: Cycles ran: 97170000 in 8557ms (10,000 runs)


    // Hidden register
    //let AD = 0x00; // Internal address bus
    //let SIR = 0x00; // Fake signed register

    // Stack pointer
    //let SP = 0x00;

    // Program counter
    //let PC = 0x0000;

    // Status register
    /* let S = {
        N: 0,
        V: 0,
        B: 0,
        D: 0,
        I: 0,
        Z: 0,
        C: 0
    };
 */
    // Vectors
    let RES = 0;
    let NMI = 0;
    let IRQ = 0;

    // Memory bus
    const memBus = new J6502_MemoryBus();

    // Cycle counter
    let cycles = 0;

    // Program counter counter    
    let Counter: { [key: string]: CounterItem } = {};

    // Proxy
    class CPUProxy {
        CPU = CPU;
        S = CPU.S;
        get A() { throw new Error('dont use me'); };
        set A(val: number) { CPU.A = val & 0xff; };
        get X() { throw new Error('dont use me'); };
        set X(val: number) { CPU.X = val & 0xff; };
        _X(val) { CPU.X = val & 0xff; };
        get Y() { throw new Error('dont use me'); };
        set Y(val: number) { CPU.Y = val & 0xff; };
        get SP() { return CPU.SP; };
        set SP(val) { CPU.SP = val & 0xff; };
        get PC() { return CPU.PC; };
        set PC(val) { CPU.PC = val & 0xffff; };
        get PCL() { return CPU.PC & 0xff; };
        get PCH() { return CPU.PC >> 8; };
        get SIR() { return CPU.SIR; };
        //set SIR(val) { CPU.SIR = (val & 0xff) << 24 >> 24; },
        set SIR(val) { CPU.SIR = val >= 0x80 ? val - 256 : val; };
        get AD() { return CPU.AD; };
        set AD(val) { CPU.AD = val & 0xffff; };
        get ADL() { return CPU.AD & 0xff; };
        set ADL(val) { CPU.AD = (CPU.AD & 0xff00) + (val & 0xff); };
        get ADH() { return CPU.AD >> 8; };
        set ADH(val) { CPU.AD = (CPU.AD & 0x00ff) + (val << 8); };
        set ADR(val) { CPU.ADR = val; }
        get ADR() { return CPU.ADR; }
        get N() { return CPU.S.N; };
        set N(val) { CPU.S.N = (val & 0xff) >= 0x80 ? 1 : 0; };
        get Z() { return CPU.S.Z; };
        set Z(val) { CPU.S.Z = (val & 0xff) === 0 ? 1 : 0; };
        //set NZ(val) { CPU.S.N = (val & 0xff) >= 0x80 ? 1 : 0; CPU.S.Z = (val & 0xff) === 0 ? 1 : 0; };
        set NZ(val) { this.N = val; this.Z = val; };
        _NZ(val) { this.N = val; this.Z = val; };
        get I() { return CPU.S.I; };
        set I(val) { CPU.S.I = (val & 0x01); };
        get D() { return CPU.S.D; };
        set D(val) { CPU.S.D = (val & 0x01); };
        get C() { return CPU.S.C; };
        set C(val) { CPU.S.C = (val & 0x01); };
        halt() { halted = true; };
        push(val) { memBus.write(0x100 + CPU.SP, val & 0xff); CPU.SP = (CPU.SP - 1) & 0xff; };
        pull() { CPU.SP = (CPU.SP + 1) & 0xff; return memBus.read(0x100 + CPU.SP) };
        read(addr) { return memBus.read(addr); };
        write(addr, val) { memBus.write(addr, val & 0xff); };
        fetch() {
            return memBus.read(CPU.PC++);
        }
        fetch16() {
            let v1 = memBus.read(CPU.PC);  // TODO: why is CPU.PC++ in fetch() faster? PC=PC+1 is slower there!
            CPU.PC = CPU.PC + 1;
            let v2 = v1 + (memBus.read(CPU.PC) << 8);
            CPU.PC = CPU.PC + 1;
            return v2;
        }
    }

    const proxy = new CPUProxy(); // This is about 4x faster than making proxy an anonymous object!

    this.resetState = function () {
        Object.assign(CPU, { ...CPU_Initial });
        Object.assign(CPU.S, { ...CPU_Initial_S });
        //memBus.reset();
    };

    this.getStatus = function () {
        return { ...CPU };
    };

    this.load = function (buf, offset = 0) {
        let rom = new J6502_GenericROM(buf);
        rom.connect(memBus, offset);

        this.reset();
    };

    this.reset = function () {
        this.resetState();

        // Read vectors
        NMI = (memBus.read(0xfffb) << 8) + memBus.read(0xfffa);
        RES = (memBus.read(0xfffd) << 8) + memBus.read(0xfffc);
        IRQ = (memBus.read(0xffff) << 8) + memBus.read(0xfffe);

        CPU.PC = RES;
    };

    this.run = function () {
        let instr;
        halted = false;
        while (halted === false) {
            instr = getNextInstr();
            handleInstr(instr);
        }
    };

    this.nmi = function () {
        halted = false;
        CPU.PC = NMI;
        this.run();
    };

    this.step = function () {
        halted = false;
        let instr = getNextInstr();
        handleInstr(instr);
        if (halted) {
            console.log("Last step caused machine to halt.", instr, CPU);
        }
        return instr;
    };

    this.getMemoryBus = function () {
        return memBus;
    };

    this.getCycles = function () {
        return cycles;
    };

    this.getHeatMap = function () {
        let res = [];
        Object.entries(Counter).forEach(([line, val]) => {
            let o = { pc: '$' + Number(line).toString(16), ...val };
            res.push(o);
        });
        res.push({ pc: '$' + CPU.PC.toString(16), c: 1, i: '(HALTED)' });
        //res.sort((a,b) => a.pc - b.pc);
        return res;
    };

    this.printState = printState;

    function handleInstr(instr) {
        let n = instr.name;
        cycles++;

        if (cycles > 1e6) {
            halted = true;
        }

        if (opts.verbose) {
            console.log("Handling instruction:", n, instr.op.toString(16));
        }

        if (instr.micro) {
            instr.micro(proxy);
        } else {
            //switch(n) {
            //case 'BRK': halted = true; break; // $00

            //default:
            halted = true;
            console.log(" Unhandled:", n, instr.op.toString(16));
            //}
        }

        if (opts.verbose) {
            printCPUState();
        }
        //printState();
    }

    class CounterItem {
        c = 1;
        i = '';
        constructor(name) {
            this.i = name;
        }
    };

    function getNextInstr() {
        let c = memBus.read(CPU.PC);
        let instr = InstructionsByOp[c];

        if (typeof instr === 'undefined')
            throw new Error(`Unknown op code: ${c} (0x${c.toString(16)})`);

        if (opts.count) {
            let cc = Counter[CPU.PC];
            if (typeof cc === 'undefined') {
                Counter[CPU.PC] = new CounterItem(instr.name);
            } else {
                cc.c++;
            }
        }

        //console.log("Instr:", instr);

        // Increment PC
        CPU.PC = CPU.PC + 1;

        return instr;
    }

    function printCPUState() {
        console.log(" CPU:", { A: CPU.A, X: CPU.X, Y: CPU.Y, SP: CPU.SP, AD: CPU.AD.toString(16), PC: CPU.PC.toString(16) }, "Status:", CPU.S);
    }

    function printState() {
        printCPUState();
        console.log(" Vectors:", { NMI: NMI.toString(16), Reset: RES.toString(16), IRQ: IRQ.toString(16), });
    }
}

J6502_Emulator.disassemble = function (prg, start = 0) {
    const program = new J6502_Program();
    const sb = new StreamBuffer(prg);
    sb.seek(start);
    while (!sb.isEOF()) {
        let op = sb.readByte();
        let instr = InstructionsByOp[op];
        let data = null;
        if (instr) {
            if (instr.size === 2) {
                data = sb.readByte();
            } else if (instr.size === 3) {
                data = sb.readUInt16LE();
            }
            program.add(instr.name, data);
        }
    }
    return program.getAssembly();
}

interface MemoryBus {
    connect(handler: IODevice, start: number, end: number, offset: number): void;
    read(address: number): number;
    write(address: number, value: number): void;
}

interface IODevice {
    read(addr: number): number;
    write(addr: number, value: number): void;
    connect(bus: MemoryBus, start: number): void;
    reset(): void;
}

class J6502_MemoryBus implements MemoryBus {
    handlers: { handler: IODevice, start: number, end: number, offset: number }[] = [];

    connect(handler, start, end, offset = 0) {
        this.handlers.push({ handler, start, end, offset })
    }

    write(addr, val) {
        let written = false;
        for (const h of this.handlers) {
            let { handler, start, end, offset } = h;
            if (addr >= start && addr < end) {
                //console.log(" Write to:", addr.toString(16), val.toString(16));
                handler.write(addr - offset, val);
                written = true;
            }
        }
        if (!written) {
            throw new Error(`Could not write to address 0x${addr.toString(16)}`);
        }
    }

    read(addr) {
        let read;
        for (const h of this.handlers) {
            let { handler, start, end, offset } = h;
            if (addr >= start && addr < end) {
                read = handler.read(addr - offset);
                //console.log(' Read from:', addr.toString(16), '=', read.toString(16));
                return read;
            }
        }
        return 0;
    }

    reset() {
        for (const h of this.handlers) {
            h.handler.reset();
        }
    }
}

class J6502_GenericROM implements IODevice {
    #rom: Buffer;
    constructor(buf) {
        if (!(buf instanceof Buffer)) throw new Error("'buf' must be of type Buffer");
        this.#rom = buf;
    }

    connect(memBus, start = 0) {
        memBus.connect(this, start, this.#rom.length + start, start);
    }

    write (addr, val) {
        throw new Error(`Can not write to ROM. Attempted to write 0x${val.toString(16)} to address 0x${addr.toString(16)}`);
    }

    read(addr) {
        return this.#rom[addr];
    }

    getBuffer() {
        return this.#rom;
    }

    reset() {

    }
}

class J6502_GenericStorage implements IODevice {
    #ram: Buffer;
    eventEmitter = new EventEmitter();

    constructor(size = 0x2000) { // default is 0x2000 = 8192 (8K)
        this.#ram = Buffer.alloc(size);
        this.#ram.fill(0)
    }

    connect(memBus, start = 0) {
        memBus.connect(this, start, this.#ram.length + start, start);
    }

    write(addr, val) {
        //eventEmitter.emit('write', addr, val);
        this.#ram[addr] = val;
    };

    read(addr) {
        //eventEmitter.emit('read', addr);
        return this.#ram[addr];
    }

    reset() {
        this.#ram.fill(0);
    }

    getBuffer() {
        return this.#ram;
    }

    on(eventName: string, listener: (...args: any[]) => void) {
        this.eventEmitter.on(eventName, listener);
    }

    //eventEmitter.on('read', (...args) => console.log("read", args))
    //eventEmitter.on('write', (...args) => console.log("write", args))
}

export {
    IODevice,
    MemoryBus,
    
    J6502_Emulator,
    J6502_MemoryBus,
    J6502_GenericROM,
    J6502_GenericStorage
}