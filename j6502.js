/*
	6502 js assembler

	03-05-2020: Started
*/
const fs = require('fs');
const StreamBuffer = require('streambuf');

const C6502_Instructions = require('./j6502-instr');

function C6502_Program(size) {
	if(!size) size = 0x4000; // 16K default

	let instructions = C6502_Instructions;

	// Vars
	let labels = {};
	let labelCounter = 0;	
	let vars = {};
	let varsCounter = 0;
	let bufPos = 0;
	let origin = 0; // used for labels
	let assembly = [];

	function Instruction(name, data) {
		this.name = name;
		this.data = data;
	}

	function DataInsertion(bytes) {
		this.data = bytes;
	}

	function Label(name) {
		this.name = name;
	}

	function RelativeLabel(name) {
		this.name = name;
	}

	function CursorMover(addr) {
		this.address = addr;
	}

	this.build = function() {
		let prg = Buffer.alloc(size);
		let buf = StreamBuffer(prg);
		prg.fill(0xff); // reset buffer

		function getLabelAddress(name) {
			let label = labels[name];
			if(label === undefined) throw new RangeError(`Unknown label: ${name}`);
			//console.log("Fetched label:", name, '=', label.toString(16));
			return label;
		}
	
		function getRelativeLabelAddress(name) {
			let addr = getLabelAddress(name);
			let relative = addr - origin - buf.getPos() - 2; // offset -2 to take own instruction + this relative addr into account
			//console.log("Fetched relative label:", name, '=', relative.toString(16));
			return relative & 0xff;
		}

		for(let a of assembly) {
			if(a instanceof Instruction) {
				let instr = instructions[a.name];
				let data = a.data;				
				if(data instanceof Label) {
					data = getLabelAddress(data.name);
				} else if(data instanceof RelativeLabel) {
					data = getRelativeLabelAddress(data.name);
				}

				let expectedNumBytes = instr.size;
				let bytesToWrite = new Uint8Array(expectedNumBytes);
				bytesToWrite[0] = instr.op; // first byte is the op code
				for(let i = 0; i < expectedNumBytes-1; i++) {
					bytesToWrite[i+1] = data >> (8*i) & 0xff; // shift data to lower endian format
				}
				//console.log("  ", a.name, data || '', "->", /*bytesToWrite,*/ bytesToWrite[0].toString(16), uintLeArrToString(bytesToWrite.slice(1)), instr.desc ? `(${instr.desc})` : '');
				writeBytes(buf, bytesToWrite);
			} else if(a instanceof DataInsertion) {
				let data = a.data;
				if(data instanceof Label) {
					let b16 = getLabelAddress(data.name);
					let tb = Buffer.alloc(2);
					tb.writeUInt16LE(b16);
					data = tb;
				} else if(data instanceof RelativeLabel) {
					data = [getRelativeLabelAddress(data.name)];
				}
				//console.log(`- putting ${data.length} bytes`, data.map(d => String.fromCharCode(d)).join('').slice(0, 32), data, 'at', buf.getPos().toString(16));
				let u8a = new Uint8Array(data);
				writeBytes(buf, u8a);
			} else if(a instanceof CursorMover) {
				let addr = a.address;
				//console.log("- moved to", addr.toString(16));
				buf.setPos(addr);
			}
		}

		return prg;
	};

	this.add = function(name, data) {
		let instr = instructions[name];
		if(!instr) throw RangeError(`Unknown instruction: ${name}`);
		bufPos += instr.size;
		assembly.push(new Instruction(name, data));
	};

	this.put = function(data) {
		if(data >= 0 && data <= 0xff) {
			bufPos += 1;
			assembly.push(new DataInsertion([data]));
		} else {
			throw new RangeError(`put: ${data} is not between 0 and ${0xff}`);
		}
	};

	this.put16 = function(data) {
		bufPos += 2;
		let b16 = Buffer.alloc(2);
		b16.writeUInt16LE(data);
		assembly.push(new DataInsertion(data));
	};

	this.putBytes = function(arr) {
		if(typeof arr === 'string')
			arr = arr.split('').map(c => c.charCodeAt(0));
		bufPos += arr.length;
		assembly.push(new DataInsertion(arr));
	};

	this.include = function(filePath) {
		let fileBuffer = fs.readFileSync(filePath);
		bufPos += fileBuffer.length;
		assembly.push(new DataInsertion(fileBuffer));
	};

	this.import = function(importFn) {
		console.log("IMPORT:", importFn.name);
		importFn(this);
		console.log("END IMPORT:", importFn.name);
	};

	this.createUniqueLabelName = function(name) {
		let lbl = `${name}_${labelCounter}`;
		labelCounter = labelCounter + 1;
		return lbl;
	};

	this.setLabel = function(name) {
		if(labels[name] !== undefined) throw new RangeError(`Label redefinition: ${name}`);
		labels[name] = bufPos + origin;
		//console.log("Added label:", name, 'at', labels[name].toString(16));
	};

	this.getLabel = function(name) {
		return new Label(name);
	};

	this.getLabelRel = function(name) {
		return new RelativeLabel(name);		
	};

	this.setVar = function(name) {
		vars[name] = varsCounter;
		varsCounter = varsCounter + 1;
		return vars[name];
	};

	this.var = function(name) {
		return vars[name];
	};

	this.setOrigin = function(addr) {
		origin = addr;
	};

	// Moves relative to origin
	this.moveTo = function(addr) {
		bufPos = addr - origin;
		assembly.push(new CursorMover(bufPos));		
	};

	this.writeFile = function(fileName) {
		let prgBuf = this.build();
		fs.writeFileSync(fileName, prgBuf);
	};
}

function uintLeArrToString(uarr) {
	return [...uarr].reverse().map(a => a.toString(16).padStart(2, '0')).join('');
}

function writeBytes(sb, arr) {
	//console.log("- writing", arr.length, 'bytes');
	for(let i=0; i < arr.length; i++) {
		sb.writeByte(arr[i]);
	}
}

module.exports = C6502_Program;