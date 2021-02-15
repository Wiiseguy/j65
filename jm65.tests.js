const test = require('./awa')

const C6502_Program = require('./j6502');
const C6502_Meta = require('./j6502-meta');
const JM65 = require('./jm65');

const JM = JM65.C6502_Emulator;

test('Simple LDA', t => {
    // Create rom
    let prg = new C6502_Program(0x10);
    //let meta = new C6502_Meta(prg);
    prg.add('LDA_IMM', 0x99);
    //meta.setImm(0x4000, 0x99);
    let rom = prg.build();

    // Run rom
    let sut = new JM();
    sut.load(rom);
    sut.run();

    // Assert
    let s = sut.getStatus();
    t.is(s.A, 0x99);
})

test('Simple write to custom memory', t => {
    // Create rom
    let prg = new C6502_Program(0x10);
    let meta = new C6502_Meta(prg);
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
    mb.connect(ram, 0, 0x8000)
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
    let prg = new C6502_Program(0x10);
    let meta = new C6502_Meta(prg);
    meta.setImm(0x0001, 0x10);
    let rom = prg.build();

    // Create emulator and run
    let sut = new JM();
    let gs = new JM65.C6502_GenericStorage();
    gs.connect(sut.getMemoryBus());
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
    let prg = new C6502_Program(0x20);
    let meta = new C6502_Meta(prg);
    meta.setImm(0x0, 1);
    meta.setImm(0x1, 2);
    meta.setImm(0x2, 3);
    meta.setImm(0x3, 4);
    let rom = prg.build();

    // Create emulator and run
    let sut = new JM();
    let gs1 = new JM65.C6502_GenericStorage(2); // 2 byte storage!
    let gs2 = new JM65.C6502_GenericStorage(2);
    gs1.connect(sut.getMemoryBus());
    gs2.connect(sut.getMemoryBus(), 2, 4); // map to 2, 3 on mem bus
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
    let prg = new C6502_Program(0x10);
    let meta = new C6502_Meta(prg);
    prg.add('LDA_ABS', 0)
    prg.add('LDA_ABS', 1);
    let rom = prg.build();

    // Create emulator and run
    let sut = new JM();
    let gs1 = new JM65.C6502_GenericStorage(1); // 1 byte storage!
    let gs2 = new JM65.C6502_GenericStorage(1);
    let buf1 = gs1.getBuffer();
    let buf2 = gs2.getBuffer();
    buf1.writeUInt8(6, 0)
    buf2.writeUInt8(7, 0)
    gs1.connect(sut.getMemoryBus());
    gs2.connect(sut.getMemoryBus(), 1, 2); // map to 1, 2 on mem bus
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