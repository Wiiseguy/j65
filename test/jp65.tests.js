const test = require('aqa')

const JP65 = require('../dist/jp65');

const JP = JP65.J6502_Parser;

test('Syntax - all syntax flavors', t => {
    // Parse
    let p = new JP();
    let prg = p.parse([
        'LDA #1 ; comment',    // LDA IMM
        'lda #1', 
        'lda #12',  
        'lda #123', 
        'lda #257', 
        'lda #$3',  
        'lda #$10', 
        'lda #%10101010',

        'lda $5 ; comment',       // LDA ZP
        'lda $5',
        'lda $55', 

        'lda $6,x ; comment',     // LDA ZP_X
        'lda $6,x', 
        'lda $10 , x', 

        'ldx $6,y ; comment',     // LDX ZP_Y (no ZP_X exists for LDA)
        'ldx $6,y', 
        'ldx $10 , y',

        'lda $AA0 ; comment',     // LDA ABS
        'lda $AA0',  
        'lda $aa0',  
        'lda $aa01', 

        'lda $aa02,x ; comment',  // LDA ABS_X
        'lda $aa02,x',  
        'lda $aa02 , x',  

        'lda $aa03,y ; comment',  // LDA ABS_Y
        'lda $aa03,y',  
        'lda $aa03 , y',  

        'lda ($04,x) ; comment',  // LDA IND_X
        'lda ($04,x)',  
        'lda ( $04 , x )',  

        'lda ($05),y ; comment',  // LDA IND_Y
        'lda ($05),y',  
        'lda ( $05 ) , y ',

        'Test_BNE:',
        'bne Test_BNE',
        'bne $fe',
        'jmp Test_BNE',
        'jmp $00fc',
        'jmp ($aa01)',
        'brk'           // BRK
    ].join('\n'))

    const expected = [
        ['LDA_IMM',     1],
        ['LDA_IMM',     1],
        ['LDA_IMM',     12],
        ['LDA_IMM',     123],
        ['LDA_IMM',     1],
        ['LDA_IMM',     3],
        ['LDA_IMM',     16],
        ['LDA_IMM',     170],

        ['LDA_ZP',      5],
        ['LDA_ZP',      5],
        ['LDA_ZP',      0x55],

        ['LDA_ZP_X',    6],
        ['LDA_ZP_X',    6],
        ['LDA_ZP_X',    16],

        ['LDX_ZP_Y',    6],
        ['LDX_ZP_Y',    6],
        ['LDX_ZP_Y',    16],

        ['LDA_ABS',     0xaa0],
        ['LDA_ABS',     0xaa0],
        ['LDA_ABS',     0xaa0],
        ['LDA_ABS',     43521],

        ['LDA_ABS_X',   43522],
        ['LDA_ABS_X',   43522],
        ['LDA_ABS_X',   43522],

        ['LDA_ABS_Y',   43523],
        ['LDA_ABS_Y',   43523],
        ['LDA_ABS_Y',   43523],

        ['LDA_IND_X',   4],
        ['LDA_IND_X',   4],
        ['LDA_IND_X',   4],

        ['LDA_IND_Y',   5],
        ['LDA_IND_Y',   5],
        ['LDA_IND_Y',   5],

        ['BNE',         {name: 'Test_BNE'}],
        ['BNE',         0xfe],
        ['JMP_ABS',     {name: 'Test_BNE'}],
        ['JMP_ABS',     0xfc],
        ['JMP_IND',     0xaa01],

        ['BRK',         undefined],
    ];

    // Assert
    let a = prg.getAssembly();
    //console.log("Assembly:", a);

    const assert_a = (i, name, data) => {
        //console.log(i)
        t.is(a[i].name, name, i);
        t.deepEqual(a[i].data, data, i);
    };   

    t.is(a.length, expected.length);

    expected.forEach((e,i) => assert_a(i, e[0], e[1]));

})

test('Endianess', t => {
    // Parse
    let p = new JP();
    let prg = p.parse([
        'lda $4401',
        'brk'
    ].join('\n'));

    // Assert
    let a = prg.getAssembly();
    let b = prg.build(true);

    let bne = a[2];
    t.deepEqual(a, [
        { name:"LDA_ABS", data: 0x4401 },
        { name:"BRK" }
    ]);

    let expectedProgram = [
        0xad, 0x01, 0x44, // lda $4401
        0x00 // brk
    ];
    t.deepEqual(b, Buffer.from(expectedProgram));

})

test('Syntax - labels', t => {
    // Parse
    let p = new JP();
    let prg = p.parse([
        'lda #$01',
        'test_label:',
        'lda #$02',
        'bne test_label',
        'bne $fb',
        'jmp test_label',
        'brk'
    ].join('\n'))

    // Assert
    let a = prg.getAssembly();
    let b = prg.build(true);

    let bne = a[2];
    t.is(bne.name, 'BNE');
    t.is(bne.data.name, 'test_label');

    let expectedProgram = [
        0xa9, 0x01, // lda_imm #$01
        0xa9, 0x02, // lda_imm #$02
        0xd0, 0xfc,  // bne -3
        0xd0, 0xfb,  // bne -4
        0x4c, 0x02, 0x00, // jmp
        0x00
    ];
    t.deepEqual(b, Buffer.from(expectedProgram));
})

test('Syntax - origin', t => {
    // Parse
    let p = new JP();
    let prg = p.parse([
        '.org $0001',
        'lda #$01',
        'test_label:',
        'lda #$02',
        'bne test_label',
        'bne $fb',
        'jmp test_label',
        'jmp $aa01',
        'brk'
    ].join('\n'))

    // Assert
    let a = prg.getAssembly();
    let b = prg.build(true);

    let bne = a[2];
    t.is(bne.name, 'BNE');
    t.is(bne.data.name, 'test_label');

    let expectedProgram = [
        0xa9, 0x01, // lda_imm #$01
        0xa9, 0x02, // lda_imm #$02
        0xd0, 0xfc,  // bne -3
        0xd0, 0xfb,  // bne -4
        0x4c, 0x03, 0x00, // jmp test_label
        0x4c, 0x01, 0xaa, // jmp $aa01
        0x00
    ];
    t.deepEqual(b, Buffer.from(expectedProgram));
})

test('Syntax - origin 2', t => {
    // Parse
    let p = new JP();
    let prg = p.parse([
        '.org $0001',
        'lda #$01',
        'test_label:',
        '.org $0000',
        'lda #$02',
        'bne test_label',
        'bne $fb',
        'jmp test_label',
        'brk'
    ].join('\n'))

    // Assert
    let a = prg.getAssembly();
    let b = prg.build(true);

    let bne = a[2];
    t.is(bne.name, 'BNE');
    t.is(bne.data.name, 'test_label');

    let expectedProgram = [
        0xa9, 0x01, // lda_imm #$01
        0xa9, 0x02, // lda_imm #$02
        0xd0, 0xfc,  // bne -3
        0xd0, 0xfb,  // bne -4
        0x4c, 0x03, 0x00, // jmp
        0x00
    ];

    // TODO: what should be the result?
    //t.deepEqual(b, Buffer.from(expectedProgram));
})
