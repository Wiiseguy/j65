const test = require('aqa')

const J6502_Program = require('./j6502');
const J6502_Meta = require('./j6502-meta');
const JM65 = require('./jm65');

const JM = JM65.J6502_Emulator;

test('LDA flags', t => {
    // Create rom
    let prg = new J6502_Program(0x10);
    //let meta = new J6502_Meta(prg);
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

test('Reset vector', t => {
    // Create rom
    let prg = new J6502_Program(0x10);
    prg.add('LDA_IMM', 0x80);
    prg.add('LDA_IMM', 0x90);
    prg.add('LDA_IMM', 0xA0);
    let rom = prg.build();

    // Create emulator and run
    let sut = new JM();
    let gs = new JM65.J6502_GenericStorage(2); // Only needs 2 bytes to hold the reset vector
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

test('Simple write to GenericStorage', t => {
    // Create rom
    let prg = new J6502_Program(0x10);
    let meta = new J6502_Meta(prg);
    meta.setImm(0x1001, 0x10);
    let rom = prg.build();

    // Create emulator and run
    let sut = new JM();
    let gs = new JM65.J6502_GenericStorage(2); // 2 byte storage
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
    let gs1 = new JM65.J6502_GenericStorage(2); // 2 byte storage!
    let gs2 = new JM65.J6502_GenericStorage(2);
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
    let gs1 = new JM65.J6502_GenericStorage(1); // 1 byte storage!
    let gs2 = new JM65.J6502_GenericStorage(1);
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