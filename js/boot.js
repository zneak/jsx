document.addEventListener('DOMContentLoaded', function()
{
	document.querySelector("#bios").addEventListener("change", function()
	{
		var reader = new FileReader();
		reader.onload = function()
		{
			var bios = new GeneralPurposeBuffer(reader.result);
			var mdec = new MemoryDecoder();
			var hardwareRegisters = new HardwareRegisters(mdec);
			var parallelPort = new ParallelPortMemoryRange();
			var memory = new MemoryMap(hardwareRegisters, parallelPort, bios);
			
			mdec.memory = memory;
			
			var psx = new R3000a();
			psx.reset(memory);
			
			try
			{
				psx.execute(R3000a.bootAddress);
			}
			catch (e)
			{
				document.querySelector("#crash").textContent = e.toString();
				
				var totalJitted = 0;
				var totalUnimplemented = 0;
				var unimplemented = {};
				for (var fn in psx.compiled)
				{
					var func = psx.compiled[fn];
					totalJitted += func.totalCount;
					for (var key in func.unimplemented)
					{
						if (!(key in unimplemented))
							unimplemented[key] = 0;
						
						var count = func.unimplemented[key];
						unimplemented[key] += count;
						totalUnimplemented += count;
					}
				}
				
				totalJitted += psx.recompiler.jittedInstructions;
				for (var key in psx.recompiler.unimplementedInstructionCounts)
				{
					if (!(key in unimplemented))
						unimplemented[key] = 0;
					
					var count = func.unimplemented[key];
					unimplemented[key] += count;
					totalUnimplemented += count;
				}
				
				
				var list = document.querySelector("#missing");
				for (var key in unimplemented)
				{
					var count = unimplemented[key];
					var li = document.createElement('li');
					li.textContent = key + " (" + count + ")";
					list.appendChild(li);
				}
				document.querySelector("#missing-count").textContent = totalUnimplemented + "/" + totalJitted;
			}
		}
		
		reader.readAsArrayBuffer(this.files[0]);
	});
});