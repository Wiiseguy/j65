const J6502_Program = require('../j6502');
const J6502_Meta = require('../j6502-meta');
const J6502_NES = require('../j6502-nes');

// Program entry
main(process.argv);

function main(args) {
    // Create PRG ROM and write some program!
    let prg = new J6502_Program(0x8000);
    let meta = new J6502_Meta(prg);
    let nes = new J6502_NES(prg);
    prg.setLabelOrigin(0x8000);

    const BUTTONS_1		= 0xfe;
    const BUTTONS_2		= 0xff;

    const palette = [
        0x22, 0x29, 0x1A, 0x0F,   0x22, 0x36, 0x17, 0x0F,   0x22, 0x30, 0x21, 0x0F,   0x22, 0x27, 0x17, 0x0F, // background palette
        //0x0F, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x0F, // background palette
        0x22, 0x16, 0x28, 0x02,   0x22, 0x02, 0x38, 0x3C,   0x22, 0x1C, 0x15, 0x14,   0x22, 0x02, 0x38, 0x3C // sprite palette
        //0x0F, 0x1C, 0x15, 0x14, 0x31, 0x02, 0x38, 0x3C, 0x0F, 0x1C, 0x15, 0x14, 0x31, 0x02, 0x38, 0x3C  // sprite palette
    ];

    const sprites = [
        // Y, tile, attrs, X
        0x80, 0x32, 0x00, 0x80, // sprite 0
        0x80, 0x33, 0x00, 0x88, // sprite 1
        0x88, 0x34, 0x00, 0x80, // sprite 2
        0x88, 0x35, 0x00, 0x88, // sprite 3

        0x08, 0x00, 0x00, 0x00, // 4
        0x08, 0x01, 0x00, 0x08, // 5
        0x08, 0x02, 0x00, 0x10, // 6
        // counter
        0x08, 0x00, 0x00, 0x20, // 7
        0x08, 0x00, 0x00, 0x28, // 8
        0x08, 0x00, 0x00, 0x30, // 9
    ];

    const background = [
        0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24,  // row 1
        0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24,  // all sky
        
        0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24,  // row 2
        0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24,  // all sky
        
        0x24, 0x24, 0x24, 0x24, 0x45, 0x45, 0x24, 0x24, 0x45, 0x45, 0x45, 0x45, 0x45, 0x45, 0x24, 0x24,  // row 3
        0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x53, 0x54, 0x24, 0x24,  // some brick tops
        
        0x24, 0x24, 0x24, 0x24, 0x47, 0x47, 0x24, 0x24, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x24, 0x24,  // row 4
        0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x55, 0x56, 0x24, 0x24,  // brick bottoms
        0x24, 0x24, 0x24, 0x24, 0x45, 0x45, 0x24, 0x24, 0x45, 0x45, 0x45, 0x45, 0x45, 0x45, 0x24, 0x24,  // row 3
        0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x53, 0x54, 0x24, 0x24,  // some brick tops
        
        0x24, 0x24, 0x24, 0x24, 0x47, 0x47, 0x24, 0x24, 0x47, 0x47, 0x47, 0x47, 0x47, 0x47, 0x24, 0x24,  // row 4
        0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x55, 0x56, 0x24, 0x24,  // brick bottoms
        
        0x24, 0x24, 0x24, 0x24, 0x45, 0x45, 0x24, 0x24, 0x45, 0x45, 0x45, 0x45, 0x45, 0x45, 0x24, 0x24,  // row 3
        0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x53, 0x54, 0x24, 0x24,  // some brick tops
        
        0x11, 0x18, 0x12, 0x24, 0x0E, 0x16, 0x16, 0x0A, 0x2B, 0x47, 0x47, 0x47, 0x47, 0x47, 0x24, 0x24,  // row 4
        0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x24, 0x55, 0x56, 0x24, 0x24   // brick bottoms
    ];
    const attributes = [
        0b00000000,  0b00110000,  0b10010000,  0b00000000,  0b00000000,  0b00000000,  0b00000000,  0b00110000
    ];

    // Set palette data
    prg.setLabel("PaletteData");
    prg.putBytes(palette);

    // Set sprite data
    prg.setLabel("SpriteData");
    prg.putBytes(sprites);

    // Set background data
    prg.setLabel("BackgroundData");
    prg.putBytes(background);
    prg.setLabel("AttributeData");
    prg.putBytes(attributes);

    // Import subroutines
    nes.importUtilities();
    
    prg.setLabel('ResetAndCleanupPPU');
        meta.setImm(nes.PPU_CTRL, 0b10010000); // enable NMI, sprites from Pattern Table 0 (bit 3), bg (bit 4) generate NMI at start of vblank (bit 7)
        meta.setImm(nes.PPU_MASK, 0b00011110); // no intensify (black background), enable sprites, enable bgs
        meta.setImm(nes.PPU_SCROLL, 0);
        meta.setImm(nes.PPU_SCROLL); // tell the ppu there is no background scrolling twice (btw no value = write whatever is in A)
        prg.add('RTS');

    // Reset
    prg.setLabel('RESET');
    nes.reset();

    // Load palette		
    nes.setPPUAddress(0x3f00); // The palettes start at PPU address $3F00 and $3F10.
    nes.uploadPPU(prg.getLabel('PaletteData'), palette.length);

    // Load sprites to RAM
    meta.copy(nes.SPR_START, prg.getLabel('SpriteData'), sprites.length);

    // Setup backgrounds
    nes.setPPUAddress(0x2000); 
    nes.uploadPPU(prg.getLabel('BackgroundData'), background.length);

    // Setup bg attributes
    nes.setPPUAddress(0x23c0); 
    nes.uploadPPU(prg.getLabel('AttributeData'), attributes.length);

    // Cleanup
    meta.jsr('ResetAndCleanupPPU');
    
    // NMI
    prg.setLabel('NMI');

    prg.add('LDX_ABS', 0x0000);
    prg.add('INX');
    prg.add('STX_ABS', 0x0000);
    prg.add('STX_ABS', nes.utils.getSpriteTile(6));

    // Controller
    nes.readControllers(BUTTONS_1, BUTTONS_2);

    meta.setAbs(nes.utils.getSpriteY(4), BUTTONS_1);
    meta.setAbs(nes.utils.getSpriteTile(4), BUTTONS_1);
    meta.setAbs(nes.utils.getSpriteTile(5), BUTTONS_1);

    // Display 123!
    meta.setImm(0x01, 10); // store 10 at 0x01, used as denominator
    //meta.setImm(0x02, 123);
    prg.add('STX_ABS', 0x02);
    meta.div(0x02, 0x01); // divide 123 by 10
    prg.add('STA_ABS', nes.utils.getSpriteTile(9)); // store remainder (3)
    meta.div(0x02, 0x01); // divide 12 by 10
    prg.add('STA_ABS', nes.utils.getSpriteTile(8)); // store remainder (2)
    meta.div(0x02, 0x01); // divide 1 by 10
    prg.add('STA_ABS', nes.utils.getSpriteTile(7)); // store remainder (1)

    // Move mario sprites
    prg.add('LDA_ABS', BUTTONS_1);
    prg.add('AND_IMM', nes.BTN_RIGHT);
    prg.add('BEQ', prg.getLabelRel('NotR'));
    prg.add('INC_ABS', nes.utils.getSpriteX(0));
    prg.add('INC_ABS', nes.utils.getSpriteX(1));
    prg.add('INC_ABS', nes.utils.getSpriteX(2));
    prg.add('INC_ABS', nes.utils.getSpriteX(3));
    prg.setLabel('NotR')

    prg.add('LDA_ABS', BUTTONS_1);
    prg.add('AND_IMM', nes.BTN_LEFT);
    prg.add('BEQ', prg.getLabelRel('NotL'));
    prg.add('DEC_ABS', nes.utils.getSpriteX(0));
    prg.add('DEC_ABS', nes.utils.getSpriteX(1));
    prg.add('DEC_ABS', nes.utils.getSpriteX(2));
    prg.add('DEC_ABS', nes.utils.getSpriteX(3));
    prg.setLabel('NotL')

    prg.add('LDA_ABS', BUTTONS_1);
    prg.add('AND_IMM', nes.BTN_UP);
    prg.add('BEQ', prg.getLabelRel('NotU'));
    prg.add('DEC_ABS', nes.utils.getSpriteY(0));
    prg.add('DEC_ABS', nes.utils.getSpriteY(1));
    prg.add('DEC_ABS', nes.utils.getSpriteY(2));
    prg.add('DEC_ABS', nes.utils.getSpriteY(3));
    prg.setLabel('NotU')

    prg.add('LDA_ABS', BUTTONS_1);
    prg.add('AND_IMM', nes.BTN_DOWN);
    prg.add('BEQ', prg.getLabelRel('NotD'));
    prg.add('INC_ABS', nes.utils.getSpriteY(0));
    prg.add('INC_ABS', nes.utils.getSpriteY(1));
    prg.add('INC_ABS', nes.utils.getSpriteY(2));
    prg.add('INC_ABS', nes.utils.getSpriteY(3));
    prg.setLabel('NotD')


    //nes.setPPUAddress(0x2100); 
    //nes.uploadPPU(nes.utils.getSpriteTile(8), 1);

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
    
    nes.writeFile("nes-sprites.nes");
}