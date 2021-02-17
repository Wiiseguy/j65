const C6502_Program = require('../j6502');
const C6502_Meta = require('../j6502-meta');

// Program entry
main(process.argv);

function main(args) {
    let prg = new C6502_Program(0x8000);
    let meta = new C6502_Meta(prg);

    meta.setImm(0x4000, 0x99);

    prg.writeFile("test.65");
}