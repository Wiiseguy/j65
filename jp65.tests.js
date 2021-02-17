const test = require('aqa')

const JP65 = require('./jp65');

const JP = JP65.C6502_Parser;

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

        'lda $5 ; comment',       // LDA ZP
        'lda $5',
        'lda $55', 

        'lda $6,x ; comment',     // LDA ZP_X
        'lda $6,x', 
        'lda $10 , x', 

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

        ['LDA_ZP',      5],
        ['LDA_ZP',      5],
        ['LDA_ZP',      0x55],

        ['LDA_ZP_X',    6],
        ['LDA_ZP_X',    6],
        ['LDA_ZP_X',    16],

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

        ['BRK',         undefined],
    ];

    // Assert
    let a = prg.getAssembly();
    console.log("Assembly:", a);

    const assert_a = (i, name, data) => {
        //console.log(i)
        t.is(a[i].name, name);
        t.is(a[i].data, data);
    };   

    t.is(a.length, expected.length);

    expected.forEach((e,i) => assert_a(i, e[0], e[1]));

})
