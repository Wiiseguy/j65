const C6502_Program = require('./j6502');
const C6502_Meta = require('./j6502-meta');
const C6502_NES = require('./j6502-nes');

// Program entry
main(process.argv);

function main(args) {
    // Create PRG ROM and write some program!
    let prg = new C6502_Program(0x8000);
    let meta = new C6502_Meta(prg);
    let nes = new C6502_NES(prg);
    prg.setOrigin(0x8000);

    // Import subroutines
    nes.importUtilities();		

    // Reset
    prg.setLabel('RESET');
    nes.reset();
    
    prg.add('LDA_IMM', 0b10000000); // intensify blues
    prg.add('STA_ABS', nes.PPU_MASK);

    // NMI
    prg.setLabel('NMI');
    prg.add('RTI');

    // IRQ/BRK?
    prg.setLabel('BRK');
    prg.add('RTI');

    // Set Vectors
    prg.moveTo(0xbffa);
    prg.put16(prg.getLabel('NMI'));		// NMI Interrupt Vector
    prg.put16(prg.getLabel('RESET')); 	// Reset Vector
    prg.put16(prg.getLabel('BRK')); 	// IRQ/BRK Vector (not used)
    
    nes.writeFile("nes-bluescreen.nes");
}