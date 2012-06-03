var PSX = function(diags, webgl, bios, controller1StateArray, controller2StateArray)
{
	this.emulatedSystem = PSX.NTSC;
	
	this.diags = diags;
	this.bios = new GeneralPurposeBuffer(bios);
	this.parallelPort = new ParallelPortMemoryRange(this);
	
	this.cpu = new R3000a(this);
	this.mdec = new MotionDecoder(this);
	this.gpu = new GPU(this, webgl);
	this.spu = new SPU(this, null);
	this.hardwareRegisters = new HardwareRegisters(this, this.mdec, this.gpu);
	this.memory = new MemoryMap(this, this.hardwareRegisters, this.parallelPort, this.bios);
	
	this.gpu.install(this.hardwareRegisters);
	this.spu.install(this.hardwareRegisters);
}

PSX.noDiags = {
	debug: function() {},
	log: function() {},
	warn: function() {},
	error: function() {}
};

PSX.PAL = {
	frameRate: 60,
	vblankStart: 240,
	hsyncTotal: 262,
	spuUpdateInterval: 23
};

PSX.NTSC = {
	frameRate: 50,
	vblankStart: 256,
	hsyncTotal: 312,
	spuUpdateInterval: 22
};

PSX.prototype.reset = function()
{
	this.pc = R3000a.bootAddress;
	this.cpu.reset();
	this.mdec.reset();
	this.gpu.reset();
	this.spu.reset();
	this.memory.reset();
}

PSX.prototype.runFrame = function(context)
{
	this.pc = this.cpu.run(this.pc, context);
}