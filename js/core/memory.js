var GeneralPurposeBuffer = function(size)
{
	if (size.constructor == ArrayBuffer)
		this.buffer = size;
	else
		this.buffer = new ArrayBuffer(size);
	
	this.u8 = new Uint8Array(this.buffer);
	this.u16 = new Uint16Array(this.buffer);
	this.u32 = new Uint32Array(this.buffer);
}

var MemoryMap = function(hardware, parallelPort, bios)
{
	if (hardware == undefined || parallelPort == undefined || bios == undefined)
		throw new Error("undefined parameters are not allowed");
	
	this.diags = console;
	
	this.ram = new GeneralPurposeBuffer(0x20000);
	this.scratchpad = new GeneralPurposeBuffer(0x400);
	
	this.hardware = hardware;
	this.parallelPort = parallelPort;
	this.bios = bios;
	
	this.ram.offset = 0x00000000;
	this.scratchpad.offset = 0x1F800000;
	this.parallelPort.offset = 0x1F000000;
	this.hardware.offset = 0x1F801000;
	this.bios.offset = 0x1FC00000;
	
	const pages = 0x20000000 / 0x1000;
	this.pageMap = new Array(pages);
	
	this._translateOutput = {
		buffer: null,
		offset: null
	};
	
	for (var i = 0x00000; i < 0x00200; i++) this.pageMap[i] = this.ram;
	for (var i = 0x00200; i < 0x1F000; i++) this.pageMap[i] = MemoryMap.unmapped;
	for (var i = 0x1F000; i < 0x1F010; i++) this.pageMap[i] = parallelPort;
	for (var i = 0x1F010; i < 0x1F800; i++) this.pageMap[i] = MemoryMap.unmapped;
	this.pageMap[0x1F800] = this.scratchpad;
	for (var i = 0x1F801; i < 0x1F803; i++) this.pageMap[i] = hardware;
	for (var i = 0x1F803; i < 0x1FC00; i++) this.pageMap[i] = MemoryMap.unmapped;
	for (var i = 0x1FC00; i < 0x1FC80; i++) this.pageMap[i] = bios;
	for (var i = 0x1FC80; i < 0x20000; i++) this.pageMap[i] = MemoryMap.unmapped;
}

MemoryMap.unmapped = {
	buffer: new ArrayBuffer(0),
	u8Array: new Uint8Array(this.buffer),
	u16Array: new Uint16Array(this.buffer),
	u32Array: new Uint32Array(this.buffer),
	
	get offset() { return 0; },
	get u8() {
		console.warn("accessing unmapped memory--set a breakpoint in memory.js to debug");
		return this.u8Array;
	},
	get u16() {
		console.warn("accessing unmapped memory--set a breakpoint in memory.js to debug");
		return this.u16Array;
	},
	get u32() {
		console.warn("accessing unmapped memory--set a breakpoint in memory.js to debug");
		return this.u32Array;
	}
};

MemoryMap.prototype.translate = function(address)
{
	if (address === undefined)
		throw new Error("undefined address");
	
	address &= 0x1FFFFFFF;
	var pageHandler = this.pageMap[address >>> 12];
	this._translateOutput.buffer = pageHandler;
	this._translateOutput.offset = address - pageHandler.offset;
	
	return this._translateOutput;
}

MemoryMap.prototype.read8 = function(address)
{
	var translated = this.translate(address);
	return translated.buffer.u8[translated.offset];
}
		
MemoryMap.prototype.write8 = function(address, value)
{
	var translated = this.translate(address);
	translated.buffer.u8[translated.offset] = value;
};

// see below for the other read/write functions

(function()
{
	var endianTestBuffer = new ArrayBuffer(2);
	var u8 = new Uint8Array(endianTestBuffer);
	var u16 = new Uint16Array(endianTestBuffer);
	
	u16[0] = 0xDEAD;
	if (u8[0] == 0xDE)
	{
		// big-endian; shit
		MemoryMap.endianness = "big";
		
		// those will come in handy at some point
		function swap16(x)
		{
			return ((x & 0xFF) << 8) | (x >>> 8);
		}
		
		function swap32(x)
		{
			return ((x & 0xff) << 24)
				  | ((x & 0xff00) << 8)
				  | ((x & 0xff0000) >>> 8)
				  | (x >>> 24);
		}
		
		console.error("JSX does not support big-endian processors at the moment");
	}
	else
	{
		// little-endian; praise the lord!
		MemoryMap.endianness = "little";
		
		MemoryMap.prototype.read16 = function(address)
		{
			var translated = this.translate(address);
			return translated.buffer.u16[translated.offset >>> 1];
		}
		
		MemoryMap.prototype.read32 = function(address)
		{
			var translated = this.translate(address);
			return translated.buffer.u32[translated.offset >>> 2];
		}
		
		MemoryMap.prototype.write16 = function(address, value)
		{
			var translated = this.translate(address);
			translated.buffer.u16[translated.offset >>> 1] = value;
		}
		
		MemoryMap.prototype.write32 = function(address, value)
		{
			var translated = this.translate(address);
			translated.buffer.u32[translated.offset >>> 2] = value;
		}
	}
	
	var offset = 0;
	for (var key in MemoryMap.regions)
	{
		MemoryMap.offsets[key] = offset;
		offset += MemoryMap.regions[key];
	}
})();