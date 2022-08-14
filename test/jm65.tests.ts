import test = require('aqa')
import { J6502_Program } from '../src/j6502';
import { J6502_Meta } from '../src/j6502-meta';
import { J6502_Emulator, J6502_GenericStorage } from '../src/jm65';

const JM = J6502_Emulator;

test('LDA flags', t => {
    // Create rom
    let prg = new J6502_Program(0x10);
    prg.add('LDA_IMM', 0x00);
    prg.add('LDA_IMM', 0x79);
    prg.add('LDA_IMM', 0x80);
    prg.add('LDA_IMM', 0xff);
    let rom = prg.build();

    // Run rom
    let sut = new JM();
    sut.load(rom);    

    // Assert
    let s;
    sut.step();
    s = sut.getStatus();
    t.is(s.A, 0x00);
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x01);

    sut.step();
    s = sut.getStatus();
    t.is(s.A, 0x79);
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x00);

    sut.step();
    s = sut.getStatus();
    t.is(s.A, 0x80);
    t.is(s.S.N, 0x01);
    t.is(s.S.Z, 0x00);

    sut.step();
    s = sut.getStatus();
    t.is(s.A, 0xff);
    t.is(s.S.N, 0x01);
    t.is(s.S.Z, 0x00);
})

test('CPY flags', t => {
    // Create rom
    let prg = new J6502_Program(0x10);
    //let meta = new J6502_Meta(prg);
    prg.add('LDY_IMM', 0x00);
    prg.add('CPY_IMM', 0x00);
    prg.add('CPY_IMM', 0x79);
    prg.add('CPY_IMM', 0x80);
    prg.add('CPY_IMM', 0xff);
    let rom = prg.build();

    // Run rom
    let sut = new JM();
    sut.load(rom);    

    // Assert
    let s;
    sut.step(); // LDY 0
    s = sut.getStatus();
    t.is(s.S.C, 0x00);
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x01);

    sut.step(); // CPY 0
    s = sut.getStatus();
    t.is(s.S.C, 0x01); // because equal
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x01);

    sut.step(); // CPY 0x79
    s = sut.getStatus();
    t.is(s.S.C, 0x00); // because greater
    t.is(s.S.N, 0x01);
    t.is(s.S.Z, 0x00);

    sut.step(); // 0x80
    s = sut.getStatus();
    t.is(s.S.C, 0x00);
    t.is(s.S.N, 0x01);
    t.is(s.S.Z, 0x00);

    sut.step(); // 0xff
    s = sut.getStatus();
    t.is(s.S.C, 0x00);
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x00);
})

test('CPY flags 2', t => {
    // Create rom
    let prg = new J6502_Program(0x10);
    //let meta = new J6502_Meta(prg);
    prg.add('LDY_IMM', 0x10);
    prg.add('CPY_IMM', 0x00);
    prg.add('CPY_IMM', 0x10);
    prg.add('CPY_IMM', 0x80);
    prg.add('CPY_IMM', 0xff);
    let rom = prg.build();

    // Run rom
    let sut = new JM();
    sut.load(rom);    

    // Assert
    let s;
    sut.step(); // LDY 0
    s = sut.getStatus();
    t.is(s.S.C, 0x00);
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x00);

    sut.step(); // CPY 0
    s = sut.getStatus();
    t.is(s.S.C, 0x01); // because Y is greater
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x00);

    sut.step(); // CPY 0x10
    s = sut.getStatus();
    t.is(s.S.C, 0x01); // because equal
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x01);

    sut.step(); // 0x80
    s = sut.getStatus(); 
    t.is(s.S.C, 0x00); // because Y is less
    t.is(s.S.N, 0x01);
    t.is(s.S.Z, 0x00);

    sut.step(); // 0xff
    s = sut.getStatus();
    t.is(s.S.C, 0x00); // because Y is less
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x00);
})

test('CPY flags 3', t => {
    // Create roms
    let prg = new J6502_Program(0x10);
    //let meta = new J6502_Meta(prg);
    prg.add('LDY_IMM', 0x0);
    prg.add('INY');
    prg.add('CPY_IMM', 0x2);
    prg.add('INY');
    prg.add('CPY_IMM', 0x2);
    let rom = prg.build();

    // Run rom
    let sut = new JM();
    sut.load(rom);    

    // Assert
    let s;
    sut.step(); // LDY 0
    s = sut.getStatus();
    t.is(s.Y, 0x00);

    sut.step(); // INY
    s = sut.getStatus();
    t.is(s.Y, 0x01);

    sut.step(); // CPY 2
    s = sut.getStatus();
    t.is(s.SIR, -1); 
    t.is(s.S.C, 0x00); // because less
    t.is(s.S.N, 0x01);
    t.is(s.S.Z, 0x00);

    sut.step(); // INY
    s = sut.getStatus(); // because greater
    t.is(s.Y, 0x02);

    sut.step(); // CPY 2
    s = sut.getStatus();
    t.is(s.S.C, 0x01); // because equal
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x01);
})


test('ASL A flags', t => {
    // Create rom
    let prg = new J6502_Program(0x10);
    prg.add('LDA_IMM', 0x1);
    prg.add('ASL');
    prg.add('LDA_IMM', 0x7f);
    prg.add('ASL');
    prg.add('ASL');
    let rom = prg.build();

    // Run rom
    let sut = new JM();
    sut.load(rom);    

    // Assert
    let s;
    sut.step(); // LDA_IMM 0
    s = sut.getStatus();
    t.is(s.A, 0x01);

    sut.step(); // ASL
    s = sut.getStatus();
    t.is(s.A, 0x02);
    t.is(s.S.C, 0x00);
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x00);

    sut.step(); // LDA_IMM 7f
    s = sut.getStatus();
    t.is(s.A, 0x7f);

    sut.step(); // ASL
    s = sut.getStatus();
    t.is(s.A, 0xfe);
    t.is(s.S.C, 0x00);
    t.is(s.S.N, 0x01);
    t.is(s.S.Z, 0x00);

    sut.step(); // ASL
    s = sut.getStatus();
    t.is(s.A, 0xfc);
    t.is(s.S.C, 0x01);
    t.is(s.S.N, 0x01);
    t.is(s.S.Z, 0x00);
    
})

test('LSR A flags', t => {
    // Create rom
    let prg = new J6502_Program(0x10);
    prg.add('LDA_IMM', 0x1);
    prg.add('LSR');
    prg.add('LDA_IMM', 0xff);
    prg.add('LSR');
    let rom = prg.build();

    // Run rom
    let sut = new JM();
    sut.load(rom);    

    // Assert
    let s;
    sut.step(); // LDA_IMM 0
    s = sut.getStatus();
    t.is(s.A, 0x01);

    sut.step(); // LSR
    s = sut.getStatus();
    t.is(s.A, 0x00);
    t.is(s.S.C, 0x01);
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x01);

    sut.step(); // LDA_IMM ff
    s = sut.getStatus();
    t.is(s.A, 0xff);

    sut.step(); // LSR
    s = sut.getStatus();
    t.is(s.A, 0x7f);
    t.is(s.S.C, 0x01);
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x00);
})

test('ROL ABS flags', t => {
    // Create rom
    let prg = new J6502_Program(0x20);
    prg.add('LDA_IMM', 0x1);
    prg.add('STA_ABS', 0x1000);
    prg.add('ROL_ABS', 0x1000); // 1
    prg.add('ROL_ABS', 0x1000); // 2
    prg.add('ROL_ABS', 0x1000); // 3
    prg.add('ROL_ABS', 0x1000); // 4
    prg.add('ROL_ABS', 0x1000); // 5
    prg.add('ROL_ABS', 0x1000); // 6
    prg.add('ROL_ABS', 0x1000); // 7
    prg.add('ROL_ABS', 0x1000); // 8
    prg.add('ROL_ABS', 0x1000); // 9
    let rom = prg.build();

    // Run rom
    let sut = new JM();
    let gs = new J6502_GenericStorage(1); 
    gs.connect(sut.getMemoryBus(), 0x1000); 
    sut.load(rom);    

    // Assert
    let s;
    sut.step(); // LDA_IMM
    sut.step(); // STA_ABS 0x1000

    sut.step(); // ROL_ABS #1
    s = sut.getStatus();
    t.is(s.S.C, 0x00);
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x00);
    t.is(gs.read(0), 0x02);
    
    sut.step(); // ROL_ABS #2
    s = sut.getStatus();
    t.is(s.S.C, 0x00);
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x00);
    t.is(gs.read(0), 0x04);

    sut.step(); // ROL_ABS #3
    s = sut.getStatus();
    t.is(s.S.C, 0x00);
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x00);
    t.is(gs.read(0), 0x08);

    sut.step(); // ROL_ABS #4
    s = sut.getStatus();
    t.is(s.S.C, 0x00);
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x00);
    t.is(gs.read(0), 0x10);

    sut.step(); // ROL_ABS #5
    s = sut.getStatus();
    t.is(s.S.C, 0x00);
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x00);
    t.is(gs.read(0), 0x20);

    sut.step(); // ROL_ABS #6
    s = sut.getStatus();
    t.is(s.S.C, 0x00);
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x00);
    t.is(gs.read(0), 0x40);

    sut.step(); // ROL_ABS #7
    s = sut.getStatus();
    t.is(s.S.C, 0x00);
    t.is(s.S.N, 0x01);
    t.is(s.S.Z, 0x00);
    t.is(gs.read(0), 0x80);

    sut.step(); // ROL_ABS #8
    s = sut.getStatus();
    t.is(s.S.C, 0x01);
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x01);
    t.is(gs.read(0), 0x00);

    sut.step(); // ROL_ABS #9
    s = sut.getStatus();
    t.is(s.S.C, 0x00);
    t.is(s.S.N, 0x00);
    t.is(s.S.Z, 0x00);
    t.is(gs.read(0), 0x01); // C moved to first bit
})


test('Reset vector', t => {
    // Create rom
    let prg = new J6502_Program(0x10);
    prg.add('LDA_IMM', 0x80);
    prg.add('LDA_IMM', 0x90);
    prg.add('LDA_IMM', 0xA0);
    let rom = prg.build();

    // Create emulator and run
    let sut = new JM();
    let gs = new J6502_GenericStorage(2); // Only needs 2 bytes to hold the reset vector
    gs.write(0, 4); // Write 4 to address 0, which will be mapped to fffc later
    gs.write(1, 0); // Write 0 to address 1, which will be mapped to fffd later, making the contents 0x04 0x00, which will be read as 0x0004 (the LDA_IM 0xA0 instruction)
    gs.connect(sut.getMemoryBus(), 0xfffc); // Connect the 2 byte memory to where the CPU will look for the reset vector (FFFC, FFFD)
    sut.load(rom);
    sut.step();

    // Assert
    let s = sut.getStatus();
    t.is(s.A, 0xA0);
})

test('Simple write to custom memory', t => {
    // Create rom
    let prg = new J6502_Program(0x10);
    let meta = new J6502_Meta(prg);
    meta.setImm(0x4000, 0x99);
    let rom = prg.build();

    // Create emulator and run
    let sut = new JM();
    let writtenVal, writtenAddr;
    let ram = {
        write(addr, val) {
            writtenAddr = addr;
            writtenVal = val;
        }
    }
    let mb = sut.getMemoryBus();
    mb.connect(ram, 0x4000, 0x8000)
    sut.load(rom);
    sut.run();

    // Assert
    let s = sut.getStatus();
    t.is(s.A, 0x99);
    t.is(writtenVal, 0x99);
    t.is(writtenAddr, 0x4000);
})

test('Simple read from custom memory - rogue value', t => {
    // Create rom
    let prg = new J6502_Program(0x10);
    prg.add('LDA_ABS', 0x4000)
    let rom = prg.build();

    // Create emulator and run
    let sut = new JM();
    let ram = {
        read(_addr) {
            return 257
        }
    }
    let mb = sut.getMemoryBus();
    mb.connect(ram, 0x4000, 0x8000)

    sut.load(rom);
    sut.run();

    // Assert
    let s = sut.getStatus();
    t.is(s.A, 0x01); // 257 should have overflown to 1
})

test('Simple write to GenericStorage', t => {
    // Create rom
    let prg = new J6502_Program(0x10);
    let meta = new J6502_Meta(prg);
    meta.setImm(0x1001, 0x10);
    let rom = prg.build();

    // Create emulator and run
    let sut = new JM();
    let gs = new J6502_GenericStorage(2); // 2 byte storage
    gs.connect(sut.getMemoryBus(), 0x1000);
    sut.load(rom);
    sut.run();

    // Assert
    let s = sut.getStatus();
    let buf = gs.getBuffer();
    t.is(s.A, 16);
    t.is(buf.readUInt8(0x0001), 16);
})

test('Simple write to two GenericStorages', t => {
    // Create rom
    let prg = new J6502_Program(0x20);
    let meta = new J6502_Meta(prg);
    meta.setImm(0x1000, 1);
    meta.setImm(0x1001, 2);
    meta.setImm(0x2000, 3);
    meta.setImm(0x2001, 4);
    let rom = prg.build();

    // Create emulator and run
    let sut = new JM();
    let gs1 = new J6502_GenericStorage(2); // 2 byte storage!
    let gs2 = new J6502_GenericStorage(2);
    gs1.connect(sut.getMemoryBus(), 0x1000); // map 2 byte storage to 0x1000 and 0x1001
    gs2.connect(sut.getMemoryBus(), 0x2000); // map 2 byte storage to 0x2000 and 0x2001
    sut.load(rom);
    sut.run();

    // Assert
    let s = sut.getStatus();
    let buf1 = gs1.getBuffer();
    let buf2 = gs2.getBuffer();
    
    t.is(buf1.readUInt8(0x0000), 1);
    t.is(buf1.readUInt8(0x0001), 2);
    t.is(buf2.readUInt8(0x0000), 3);
    t.is(buf2.readUInt8(0x0001), 4);
})

test('Simple load from two GenericStorages', t => {
    // Create rom
    let prg = new J6502_Program(0x10);
    prg.add('LDA_ABS', 0x1000)
    prg.add('LDA_ABS', 0x1001);
    let rom = prg.build();

    // Create emulator and run
    let sut = new JM();
    let gs1 = new J6502_GenericStorage(1); // 1 byte storage!
    let gs2 = new J6502_GenericStorage(1);
    let buf1 = gs1.getBuffer();
    let buf2 = gs2.getBuffer();
    buf1.writeUInt8(6, 0) // Preload 6 into storage 1
    buf2.writeUInt8(7, 0) // Preload 7 into storage 2
    gs1.connect(sut.getMemoryBus(), 0x1000); // map to 0x1000 on mem bus
    gs2.connect(sut.getMemoryBus(), 0x1001); // map to 0x1001 on mem bus
    sut.load(rom);    

    // Assert
    let s;
    sut.step(); // LOAD 0 into A (item 0 of storage 1 (6))
    s = sut.getStatus();
    t.is(s.A, 6);

    sut.step(); // LOAD 1 into A (item 0 of storage 2 (7))
    s = sut.getStatus();
    t.is(s.A, 7);
    
})