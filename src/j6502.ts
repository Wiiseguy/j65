/*
	6502 js assembler

	03-05-2020: Started
*/
 
import { Instructions } from './j6502-instr';
import { readFileSync, writeFileSync } from 'fs'
import { StreamBuffer } from 'streambuf';

class Instruction {
	name: string;
	data: number | BaseLabel;
	constructor(name, data) {
		this.name = name;
		this.data = data;
	}
}

class DataInsertion {
	data: number[] | Buffer;
	constructor(bytes: number[] | Buffer) {
		this.data = bytes;
	}
}

class CursorMover {
	address: number;
	constructor(address: number) {
		this.address = address;
	}
}

type AssemblerInstruction = Instruction | DataInsertion | CursorMover;

class BaseLabel {

}

class Label extends BaseLabel {
	name: string;
	constructor(name) {
		super();
		this.name = name;
	}
}

class RelativeLabel extends BaseLabel {
	name: string;
	constructor(name) {
		super();
		this.name = name;
	}
}



class J6502_Program {
	size: number;
	labels: Record<string, number> = {};
	labelCounter = 0;
	vars: Record<string, number> = {};
	varsCounter = 0;
	bufPos = 0;
	origin = 0;
	assembly: AssemblerInstruction[] = [];

	constructor(size = 0x4000) {
		this.size = size;
	}

	getLabelAddress(name: string) {
		let label = this.labels[name];
		if (label === undefined) throw new RangeError(`Unknown label: ${name}`);
		//console.log("Fetched label:", name, '=', label.toString(16));
		return label;
	}

	getRelativeLabelAddress(name: string, pos: number) {
		let addr = this.getLabelAddress(name);
		let relative = addr - this.origin - pos - 2; // offset -2 to take own instruction + this relative addr into account
		//console.log("Fetched relative label:", name, '=', relative.toString(16));
		return relative & 0xff;
	}

	build(clamp = false) {
		let prg = Buffer.alloc(this.size);
		let buf = StreamBuffer.from(prg);
		prg.fill(0x00); // reset buffer

		for (let a of this.assembly) {
			if (a instanceof Instruction) {
				let instr = Instructions[a.name];
				let data: number;
				if (a.data instanceof Label) {
					data = this.getLabelAddress(a.data.name);
				} else if (a.data instanceof RelativeLabel) {
					data = this.getRelativeLabelAddress(a.data.name, buf.getPos());
				} else {
					data = a.data as number;
				}

				let expectedNumBytes = instr.size;
				let bytesToWrite = new Uint8Array(expectedNumBytes);
				bytesToWrite[0] = instr.op; // first byte is the op code
				for (let i = 0; i < expectedNumBytes - 1; i++) {
					bytesToWrite[i + 1] = data >> (8 * i) & 0xff; // shift data to lower endian format
				}
				//console.log("  ", a.name, data || '', "->", /*bytesToWrite,*/ bytesToWrite[0].toString(16), uintLeArrToString(bytesToWrite.slice(1)), instr.desc ? `(${instr.desc})` : '');
				buf.write(Buffer.from(bytesToWrite));
			} else if (a instanceof DataInsertion) {
				let data = a.data;
				if (data instanceof Label) {
					let b16 = this.getLabelAddress(data.name);
					data = [b16 & 0xff, b16 >> 8];
				} else if (data instanceof RelativeLabel) {
					data = [this.getRelativeLabelAddress(data.name, buf.getPos())];
				}
				//console.log(`- putting ${data.length} bytes`, data.map(d => String.fromCharCode(d)).join('').slice(0, 32), data, 'at', buf.getPos().toString(16));
				let u8a = new Uint8Array(data);
				buf.write(Buffer.from(u8a));
			} else if (a instanceof CursorMover) {
				let addr = a.address;
				//console.log("- moved to", addr.toString(16));
				buf.setPos(addr);
			}
		}

		if (clamp) {
			prg = prg.slice(0, buf.getPos());
		}

		return prg;
	};

	add(name: string, data: (number | BaseLabel) = undefined) {
		let instr = Instructions[name];
		if (!instr) throw RangeError(`Unknown instruction: ${name}`);
		this.bufPos += instr.size;
		this.assembly.push(new Instruction(name, data));
	}

	put(data: number) {
		if (data >= 0 && data <= 0xff) {
			this.bufPos += 1;
			this.assembly.push(new DataInsertion([data]));
		} else {
			throw new RangeError(`put: ${data} is not between 0 and ${0xff}`);
		}
	}

	put16(data: number) {
		this.bufPos += 2;
		this.assembly.push(new DataInsertion([data & 0xff, data >> 8]));
	}

	putBytes(arr: (number[] | string)) {
		if (typeof arr === 'string')
			arr = arr.split('').map(c => c.charCodeAt(0));
		this.bufPos += arr.length;
		this.assembly.push(new DataInsertion(arr));
	}

	include(filePath) {
		let fileBuffer = readFileSync(filePath);
		this.bufPos += fileBuffer.length;
		this.assembly.push(new DataInsertion(fileBuffer));
	}

	import(importFn) {
		importFn(this);
	}

	createUniqueLabelName(name) {
		let lbl = `${name}_${this.labelCounter}`;
		this.labelCounter = this.labelCounter + 1;
		return lbl;
	}

	setLabel(name) {
		if (this.labels[name] !== undefined) throw new RangeError(`Label redefinition: ${name}`);
		this.labels[name] = this.bufPos + this.origin; // TODO: add origin at build, so origin can also be set later?
		//console.log("Added label:", name, 'at', labels[name].toString(16));
	}

	createLabel(name) {
		return new Label(name);
	}

	createLabelRel(name) {
		return new RelativeLabel(name);
	}

	setVar(name) {
		this.vars[name] = this.varsCounter;
		this.varsCounter = this.varsCounter + 1;
		return this.vars[name];
	}

	var(name) {
		return this.vars[name];
	}

	setLabelOrigin(addr) {
		this.origin = addr;
	}

	// Moves relative to origin
	moveTo(addr: number) {
		this.bufPos = addr - this.origin;
		this.assembly.push(new CursorMover(this.bufPos));
	}

	getAssembly() {
		return this.assembly;
	}

	writeFile(fileName) {
		let prgBuf = this.build();
		writeFileSync(fileName, prgBuf);
	}
}

export {
	Instruction,
	DataInsertion,
	CursorMover,
	AssemblerInstruction,

	BaseLabel,
	Label,
	RelativeLabel,

	J6502_Program
}