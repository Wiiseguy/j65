const fs = require('fs');
const StreamBuffer = require('streambuf');

function C6502_Program(size) {
	if(!size) size = 0x4000; // 16K default
	let prg = Buffer.alloc(size);
	prg.fill(0xff);
	let buf = StreamBuffer(prg);

	// TODO: move outside func
	let instructions = {
		'ASL_ABS': 		{ op: 0x0e, size: 3, desc: 'Shift Left One Bit (Memory)' },
		'ORA_IMM':		{ op: 0x09, size: 2, desc: 'OR Memory with Accumulator' },
		'BPL': 			{ op: 0x10, size: 2, desc: 'Branch on Result Plus (N == 0)' },
		'JSR': 			{ op: 0x20, size: 3, desc: 'Jump to New Location Saving Return Address' },
		'AND_IMM':		{ op: 0x29, size: 2, desc: 'AND Memory with Accumulator' },
		'ROL': 			{ op: 0x2a, size: 1, desc: 'Rotate One Bit Left (Accumulator)' },
		'BIT_ABS':		{ op: 0x2c, size: 3, desc: 'Test Bits in Memory with Accumulator' },
		'ROL_ABS':		{ op: 0x2e, size: 3, desc: 'Rotate One Bit Left (Memory)' },
		'RTI': 			{ op: 0x40, size: 1, desc: 'Return from Interrupt' },
		'PHA': 			{ op: 0x48, size: 1, desc: 'Push Accumulator on Stack' },
		'LSR': 			{ op: 0x4a, size: 1, desc: 'Shift One Bit Right (Accumulator)' },	
		'JMP_ABS': 		{ op: 0x4c, size: 3 },
		'RTS': 			{ op: 0x60, size: 1, desc: 'Return from Subroutine' },
		'PLA': 			{ op: 0x68, size: 1, desc: 'Pull Accumulator from Stack' },
		'ADC_IMM': 		{ op: 0x69, size: 2 },
		'ROR': 			{ op: 0x6a, size: 1, desc: 'Rotate One Bit Right (Accumulator)' },
		'ROR_ABS':		{ op: 0x6e, size: 3, desc: 'Rotate One Bit Right (Memory)' },
		'SEI': 			{ op: 0x78, size: 1, desc: 'Set Interrupt Disable Status' },
		'DEY': 			{ op: 0x88, size: 1, desc: 'Decrement Index Y by One' },
		'TXA': 			{ op: 0x8a, size: 1 },
		'STA_ABS': 		{ op: 0x8d, size: 3 },
		'STX_ABS':		{ op: 0x8e, size: 3 },
		'BCC': 			{ op: 0x90, size: 2, desc: 'Branch on Carry Clear' },
		'TYA': 			{ op: 0x98, size: 1 },
		'STA_ABS_Y':	{ op: 0x99, size: 3 },
		'TXS': 			{ op: 0x9a, size: 1, desc: 'Transfer Index X to Stack Register (X -> SP)' },
		'STA_ABS_X':	{ op: 0x9d, size: 3 },
		'LDY_IMM': 		{ op: 0xa0, size: 2 },
		'LDX_IMM': 		{ op: 0xa2, size: 2 },
		'TAY': 			{ op: 0xa8, size: 1 },
		'LDA_IMM': 		{ op: 0xa9, size: 2 },
		'TAX': 			{ op: 0xaa, size: 1 },
		'LDA_ABS': 		{ op: 0xad, size: 3 },
		'LDX_ABS': 		{ op: 0xae, size: 3 },
		'LDA_ABS_X': 	{ op: 0xbd, size: 3 },
		'LDA_ABS_Y': 	{ op: 0xb9, size: 3 },
		'INY': 			{ op: 0xc8, size: 1 },
		'DEX': 			{ op: 0xca, size: 1, desc: 'Decrement Index X by One' },
		'CMP_ABS':		{ op: 0xcd, size: 3, desc: 'Compare Memory with Accumulator' },
		'BNE': 			{ op: 0xd0, size: 2, desc: 'Branch on Result not Zero' },
		'CLD': 			{ op: 0xd8, size: 1, desc: 'Clear Decimal Mode' },
		'DEC_ABS':		{ op: 0xce, size: 3, desc: 'Decrement Memory by One' },
		'CPX_IMM': 		{ op: 0xe0, size: 2, desc: 'Compare value and Index X' },
		'INX': 			{ op: 0xe8, size: 1 },
		'NOP': 			{ op: 0xea, size: 1, desc: 'No Operation' },
		'CPX_ABS': 		{ op: 0xec, size: 3, desc: 'Compare value at address and Index X' },
		'INC_ABS':		{ op: 0xee, size: 3, desc: 'Increment Memory by One' },
		'SBC_ABS':		{ op: 0xed, size: 3, desc: 'Subtract Memory from Accumulator with Borrow' },
		'BEQ': 			{ op: 0xf0, size: 2, desc: 'Branch on Result Zero' },
	};

	// Vars
	let labels = {};
	let labelCounter = 0;	
	let vars = {};
	let varsCounter = 0;
	let origin = 0; // used for labels
	let assembly = [];

	function Instruction(name, data) {
		// TODO: Keep buf as internal cursor to resolve labels 
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

	function getLabelAddress(name) {
		let label = labels[name];
		if(label === undefined) throw new RangeError(`Unknown label: ${name}`);
		console.log("Fetched label:", name, '=', label.toString(16));
		return label;
	}

	function getRelativeLabelAddress(name) {
		let addr = getLabelAddress(name);
		let relative = addr - origin - buf.getPos() - 2; // offset -2 to take own instruction + this relative addr into account
		console.log("Fetched relative label:", name, '=', relative.toString(16));
		return relative & 0xff;
	}

	this.build = function() {
		buf.setPos(0);
		prg.fill(0xff); // reset buffer

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
				console.log("  ", a.name, data || '', "->", /*bytesToWrite,*/ bytesToWrite[0].toString(16), uintLeArrToString(bytesToWrite.slice(1)), instr.desc ? `(${instr.desc})` : '');
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
				console.log(`- putting ${data.length} bytes`, data.map(d => String.fromCharCode(d)).join('').slice(0, 32), data, 'at', buf.getPos().toString(16));
				let u8a = new Uint8Array(data);
				writeBytes(buf, u8a);
			} else if(a instanceof CursorMover) {
				let addr = a.address;
				console.log("- moved to", addr.toString(16));
				buf.setPos(addr);
			}
		}

		return buf.buffer;
	};

	this.add = function(name, data) {
		let instr = instructions[name];
		if(!instr) throw RangeError(`Unknown instruction: ${name}`);
		buf.skip(instr.size);
		assembly.push(new Instruction(name, data));
	};

	this.put = function(data) {
		if(data >= 0 && data <= 0xff) {
			buf.skip(1);
			assembly.push(new DataInsertion([data]));
		} else {
			throw new RangeError(`put: ${data} is not between 0 and ${0xff}`);
		}
	};

	this.put16 = function(data) {
		buf.skip(2);
		let b16 = Buffer.alloc(2);
		b16.writeUInt16LE(data);
		assembly.push(new DataInsertion(data));
	};

	this.putBytes = function(arr) {
		if(typeof arr === 'string')
			arr = arr.split('').map(c => c.charCodeAt(0));
		buf.skip(arr.length);
		assembly.push(new DataInsertion(arr));
	};

	this.include = function(filePath) {
		let fileBuffer = fs.readFileSync(filePath);
		buf.skip(fileBuffer.length);
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
		labels[name] = buf.getPos() + origin;
		console.log("Added label:", name, 'at', labels[name].toString(16));
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
		buf.setPos(addr - origin);
		assembly.push(new CursorMover(buf.getPos()));		
	};

	this.getBuffer = function() {
		return buf.buffer;
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