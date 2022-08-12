import { J6502_Program } from './j6502';

function J6502_Meta(prg: J6502_Program) {
	if (!(prg instanceof J6502_Program))
		throw new Error(`'prg' should be an instance of J6502_Program`);

	// Helper
	this.utils = {

	};

	// Low-level 
	this.setImm = function (addr, value) {
		if (value !== undefined) {
			prg.add('LDA_IMM', value);
		}
		prg.add('STA_ABS', addr);
	};

	this.setAbs = function (addr, otherAddr) {
		if (otherAddr !== undefined) {
			prg.add('LDA_ABS', otherAddr);
		}
		prg.add('STA_ABS', addr);
	};

	// Divides numerator by denominator, saves result in numerator address
	this.div = function (numeratorAddr, denominatorAddr) {
		let L1 = prg.createUniqueLabelName('L1');
		let L2 = prg.createUniqueLabelName('L2');
		prg.add('LDA_IMM', 0);
		prg.add('LDX_IMM', 8);
		prg.add('ASL_ABS', numeratorAddr);
		prg.setLabel(L1);
		prg.add('ROL');
		prg.add('CMP_ABS', denominatorAddr);
		prg.add('BCC', prg.getLabelRel(L2));
		prg.add('SBC_ABS', denominatorAddr);
		prg.setLabel(L2);
		prg.add('ROL_ABS', numeratorAddr);
		prg.add('DEX');
		prg.add('BNE', prg.getLabelRel(L1))
	};

	this.push = function () {
		prg.add('PHA');
	};

	this.pushImm = function (value) {
		prg.add('LDA_IMM', value);
		this.push();
	};

	this.pushAbs = function (addr) {
		prg.add('LDA_ABS', addr);
		this.push();
	};

	this.pop = function () {
		prg.add('PLA');
	};

	this.popAbs = function (addr) {
		this.pop();
		prg.add('STA_ABS', addr);
	};

	this.jsr = function (labelName) {
		prg.add('JSR', prg.getLabel(labelName));
	};

	// Mid level
	this.copy = function (dstAddr, srcAddr, dataLength) {
		let newLabel = prg.createUniqueLabelName(`copy_Loop`);
		// TODO: push/pop X?
		prg.add('LDX_IMM', 0); // start at 0
		prg.setLabel(newLabel);
		prg.add('LDA_ABS_X', srcAddr); // load data from address SpriteData + x
		prg.add('STA_ABS_X', dstAddr); // store into RAM (0200 + x)
		prg.add('INX');
		prg.add('CPX_IMM', dataLength);
		prg.add('BNE', prg.getLabelRel(newLabel));
	};

}

export {
	J6502_Meta
}