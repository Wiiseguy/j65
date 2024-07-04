import { J6502_Program } from './j6502';

class J6502_Meta {
	#prg: J6502_Program;
	constructor(prg: J6502_Program) {
		if (!(prg instanceof J6502_Program))
			throw new Error(`'prg' should be an instance of J6502_Program`);
		this.#prg = prg;
	}

	// Low-level 
	setImm(addr, value) {
		if (value !== undefined) {
			this.#prg.add('LDA_IMM', value);
		}
		this.#prg.add('STA_ABS', addr);
	}

	setAbs(addr, otherAddr) {
		if (otherAddr !== undefined) {
			this.#prg.add('LDA_ABS', otherAddr);
		}
		this.#prg.add('STA_ABS', addr);
	}

	// Divides numerator by denominator, saves result in numerator address
	div(numeratorAddr, denominatorAddr) {
		let L1 = this.#prg.createUniqueLabelName('L1');
		let L2 = this.#prg.createUniqueLabelName('L2');
		this.#prg.add('LDA_IMM', 0);
		this.#prg.add('LDX_IMM', 8);
		this.#prg.add('ASL_ABS', numeratorAddr);
		this.#prg.setLabel(L1);
		this.#prg.add('ROL');
		this.#prg.add('CMP_ABS', denominatorAddr);
		this.#prg.add('BCC', this.#prg.createLabelRel(L2));
		this.#prg.add('SBC_ABS', denominatorAddr);
		this.#prg.setLabel(L2);
		this.#prg.add('ROL_ABS', numeratorAddr);
		this.#prg.add('DEX');
		this.#prg.add('BNE', this.#prg.createLabelRel(L1))
	}

	push() {
		this.#prg.add('PHA');
	}

	pushImm(value) {
		this.#prg.add('LDA_IMM', value);
		this.push();
	}

	pushAbs(addr) {
		this.#prg.add('LDA_ABS', addr);
		this.push();
	}

	pop () {
		this.#prg.add('PLA');
	}

	popAbs(addr) {
		this.pop();
		this.#prg.add('STA_ABS', addr);
	}

	jsr(labelName) {
		this.#prg.add('JSR', this.#prg.createLabel(labelName));
	}

	// Mid level
	copy(dstAddr, srcAddr, dataLength) {
		let newLabel = this.#prg.createUniqueLabelName(`copy_Loop`);
		// TODO: push/pop X?
		this.#prg.add('LDX_IMM', 0); // start at 0
		this.#prg.setLabel(newLabel);
		this.#prg.add('LDA_ABS_X', srcAddr); // load data from address SpriteData + x
		this.#prg.add('STA_ABS_X', dstAddr); // store into RAM (0200 + x)
		this.#prg.add('INX');
		this.#prg.add('CPX_IMM', dataLength);
		this.#prg.add('BNE', this.#prg.createLabelRel(newLabel));
	}

}

export {
	J6502_Meta
}