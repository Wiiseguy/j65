const C6502_Program = require('../j6502');
const C6502_Meta = require('../j6502-meta');
const C6502_NES = require('../j6502-nes');

// Program entry
main(process.argv);

function main(args) {
    // Create PRG ROM and write some program!
    let prg = new C6502_Program(0x8000);
    let meta = new C6502_Meta(prg);
    let nes = new C6502_NES(prg);
    prg.setLabelOrigin(0x8000);

    const BUTTONS_1		= 0xfe;
    const BUTTONS_2		= 0xff;

    const palette = [
        0x22, 0x29, 0x1A, 0x0F,   0x22, 0x36, 0x17, 0x0F,   0x22, 0x30, 0x21, 0x0F,   0x22, 0x27, 0x17, 0x0F, // background palette
        0x22, 0x16, 0x28, 0x02,   0x22, 0x02, 0x38, 0x3C,   0x22, 0x1C, 0x15, 0x14,   0x22, 0x02, 0x38, 0x3C // sprite palette
    ];

    const sprites = [
        // Y, tile, attrs, X
        0x80, 0x32, 0x00, 0x80, // sprite 0
        0x80, 0x33, 0x00, 0x88, // sprite 1
        0x88, 0x34, 0x00, 0x80, // sprite 2
        0x88, 0x35, 0x00, 0x88, // sprite 3
        0, 0, 0, 0, // sprite 4
        0, 0, 0, 0, // sprite 4
        0x88, 0x35, 0x00, 0x88, // sprite 4
        0, 0, 0, 0, // sprite 4
    ];

    const SP = 0x24;
    const asciiOffset = 0x20;
    const asciiMap = [
        SP, SP, SP, SP, 		SP, SP, SP, SP,			SP, SP, SP, SP,			SP, SP, SP, SP,
        0, 1, 2, 3,  			4, 5, 6, 7,   			8, 9, SP, SP,  			SP, SP, SP, SP,
        SP, 0xa, 0xb, 0xc,		0xd, 0xe, 0xf, 0x10, 	0x11, 0x12, 0x13, 0x14,	0x15, 0x16, 0x17, 0x18,
        0x19, 0x1a, 0x1b, 0x1c,	0x1d, 0x1e, 0x1f, 0x20,	0x21, 0x22, 0x23	
    ];

    const PARAM_A = prg.setVar('paramA');

    // Set palette data
    prg.setLabel("PaletteData");
        prg.putBytes(palette);

    // Set sprite data
    prg.setLabel("SpriteData");
        prg.putBytes(sprites);

    // Set text data
    prg.setLabel("AsciiData");
        prg.putBytes(asciiMap);

    // Set the text
    let str = "HELLO WORLD";
    prg.setLabel("MyString");
        prg.put(str.length);
        prg.putBytes(str);

    // Write text as sprites
    prg.setLabel('WriteText');
        prg.add('LDA_ABS', prg.getLabel('MyString'));
        //prg.add('TAY') // Transfer length of string from A into Y
        prg.add('LDX_IMM', 0);
        prg.add('LDY_IMM', 1);
        meta.pushAbs(PARAM_A);
        meta.setImm(PARAM_A, 0x48); // paramA is used for text X, start at 48
        prg.setLabel('WriteText_Loop');
            prg.add('INX');
            prg.add('TXA');
            meta.push(); // save X
            prg.add('TYA');
            meta.push(); // save Y				
            prg.add('LDA_ABS_X', prg.getLabel('MyString')); // get actual char value
            prg.add('ADC_IMM', -asciiOffset);				// transform it
            prg.add('TAY');									// store A in Y
            prg.add('LDA_ABS_Y', prg.getLabel("AsciiData")) // use Y as offset to lookup in AsciiData table
            prg.add('TAX'); // store A in X temporarily so we can pop
            meta.pop(); // pop old Y into A
            prg.add('TAY'); // store old Y into Y again
            prg.add('TXA'); 
            prg.add('STA_ABS_Y', nes.SPR_START); // set tile
            prg.add('DEY');	// go back one byte
            prg.add('LDA_ABS', PARAM_A); // also use paramA for Y, because of the 8 sprites per scanline limit
            prg.add('STA_ABS_Y', nes.SPR_START); // set Y pos
            prg.add('INY'); // tile
            prg.add('INY'); // attr
            prg.add('LDA_IMM', 0);
            prg.add('STA_ABS_Y', nes.SPR_START); // set attr
            prg.add('INY');
            prg.add('LDA_ABS', PARAM_A);
            prg.add('STA_ABS_Y', nes.SPR_START); // set X pos
            prg.add('ADC_IMM', 8);
            prg.add('STA_ABS', PARAM_A);
            prg.add('INY');
            prg.add('INY');
            meta.pop(); // pop X
            prg.add('TAX');
            prg.add('CPX_ABS', prg.getLabel('MyString'));
            prg.add('BNE', prg.getLabelRel('WriteText_Loop'));
        meta.popAbs(PARAM_A);
        prg.add('RTS');

    // Import subroutines
    nes.importUtilities();		
    
    prg.setLabel('ResetAndCleanupPPU');
        meta.setImm(nes.PPU_CTRL, 0b10010000); // enable NMI, sprites from Pattern Table 0 (bit 3), bg (bit 4) generate NMI at start of vblank (bit 7)
        meta.setImm(nes.PPU_MASK, 0b00010110); // no intensify (black background), enable sprites, enable bgs
        meta.setImm(nes.PPU_SCROLL, 0);
        meta.setImm(nes.PPU_SCROLL); // tell the ppu there is no background scrolling twice (btw no value = write whatever is in A)
        prg.add('RTS');

    // Reset
    prg.setLabel('RESET');
    meta.jsr('WriteText');
    nes.reset();

    // Load palette
    nes.setPPUAddress(0x3f00); // The palettes start at PPU address $3F00 and $3F10.
    nes.uploadPPU(prg.getLabel('PaletteData'), palette.length);

    // Load sprites to RAM
    meta.copy(C6502_NES.SPR_START, prg.getLabel('SpriteData'), sprites.length);

    // Cleanup
    meta.jsr('ResetAndCleanupPPU');
    
    // NMI
    prg.setLabel('NMI');		

    // Controller
    nes.readControllers(BUTTONS_1, BUTTONS_2);

    meta.jsr('WriteText');

    // Transfer sprite data at the end of NMI
    meta.setImm(nes.SPR_ADDR, 0x00);
    meta.setImm(nes.SPR_DMA, 0x02);
    // Once the second write is done the DMA transfer will start automatically. All data for the 64 sprites will be copied. 
    // Like all graphics updates, this needs to be done at the beginning of the VBlank period, so it will go in the NMI section of your code.			
    
    prg.add('RTI');

    // IRQ/BRK?
    prg.setLabel('BRK');
    prg.add('RTI');

    // Set Vectors
    prg.moveTo(0xbffa);
    prg.put16(prg.getLabel('NMI'));		// NMI Interrupt Vector
    prg.put16(prg.getLabel('RESET')); 	// Reset Vector
    prg.put16(prg.getLabel('BRK')); 	// IRQ/BRK Vector (not used)
    //prg.put16(0);

    // Include CHR
    prg.moveTo(0xc000);
    prg.include('gfx.chr');
    
    nes.writeFile("nes-helloworld.nes");
}