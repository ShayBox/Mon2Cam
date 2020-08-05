import Logger, { colors as c } from "../libraries/logging.ts";
import { exec } from "../libraries/exec.ts";
import Options from "../libraries/options.ts";
import {readStdin} from "../libraries/utility.ts";

/*
/  VS_APP Is responsible for combining the sound of the applications. 
/  Both the host and the client will hear this.
/  VS_MIC Is responsible for combining the devices that only the client will hear. 
/  (Mainly microphones)
*/
const VS_APP = "VirtualSinkAPP";
const VS_APP_DESCRIPTION = "Mon2CamApplicationSink";
const VS_MIC = "VirtualSinkMIC";
const VS_MIC_DESCRIPTION = "Mon2CamMicrophoneSink";

const NULL_SINK_MODULE = "module-null-sink.c";
const COMBINED_SINK_MODULE = "module-combined-sink.c";

const DEFAULT_SINK = "@DEFAULT_SINK@";
const LIST_ERROR_MESSAGE_NAN = "You need to pass a space separated list e.g.:\"3 14\"";


let createdModules:Number[] = [];

export default async function (options: Options, logger: Logger) {
	// TODO: Get user input
	// TODO: Detect already created modules
	
	let apps = await getUserSelectedApplications();
	let sources = await getUserSelectedSources();

	let micSink = await getSinkByModule(await createNullSink(VS_MIC, VS_MIC_DESCRIPTION));
	let combinedSink = await getSinkByModule(await createCombinedSink("VirtualSinkAPP", `Mon2CamCombinedSink`, [micSink.name,DEFAULT_SINK]));

	apps.forEach(app => {
		moveSinkInput(app, combinedSink.index);
	});

	sources.forEach(sources => {
		createLoopbackDevice(sources, micSink.index)
	});

	//#region Functions
	async function getSinks(): Promise<Sink[]> {
		return new Promise(async resolve => {
			let cmd = await exec("pactl list short sinks", { output: options.output });
			if (cmd.status.success) {
				let lines = cmd.output.split("\n");
				let sinks: Sink[] = [];
				lines.forEach((line) => {
					let s = line.split("	");
					sinks.push({ index: parseInt(s[0]), name: s[1], module: s[2], mix: s[3], status: s[4] });
				});
				resolve(sinks);
			} else {
				logger.panic(`An error occured while trying to list the sinks`, cmd.status.code);
			}
			resolve(undefined);
		});
	}

	async function getSink(identifier: string | number): Promise<Sink> {
		return new Promise(async resolve => {
			let cmd = await exec("pactl list short sinks", { output: options.output });
			if (cmd.status.success) {
				let lines = cmd.output.split("\n");
				lines.forEach((line) => {
					let s = line.split("	");
					if (typeof identifier === "string") {
						if (s[1] === identifier) {
							resolve({ index: parseInt(s[0]), name: s[1], module: s[2], mix: s[3], status: s[4] });
						}
					} else {
						if (parseInt(s[0]) === identifier) {
							resolve({ index: parseInt(s[0]), name: s[1], module: s[2], mix: s[3], status: s[4] });
						}
					}
				});
			} else {
				logger.panic(`An error occured while trying to find the following sink: ${identifier}`, cmd.status.code);
			}
		});
	}

	async function getSinkByModule(moduleIndex: number): Promise<Sink> {
		return new Promise(async resolve => {
			let cmd = await exec("pactl list sinks", { output: options.output });
			if (cmd.status.success) {
				let parsed = parseOutput(cmd.output);
				parsed.forEach(sink => {
					if(sink.arguments["Owner Module"] && parseInt(sink.arguments["Owner Module"]) == moduleIndex) {
						resolve({ index: sink.index, 
							name: sink.arguments["Name"], 
							module: sink.arguments["Driver"], 
							mix:sink.arguments["Sample Specification:"], 
							status: sink.arguments["State"] 
						});
					}
				});
			} else {
				logger.panic(`An error occured while trying to find the sink with the following module index: ${moduleIndex}`, cmd.status.code);
			}
		});
	}

	// FIXME: Currently the description cannot contain spaces due to a bug in pactl: https://gitlab.freedesktop.org/pulseaudio/pulseaudio/-/issues/615
	async function createNullSink(name: string, description: string): Promise<number> {
		return new Promise(async resolve => {
			let cmd = await exec(
				`pactl load-module module-null-sink sink_name="${name}" sink_properties=device.description="${description}"`,
				{ output: options.output }
			);
			if (cmd.status.success) {
				createdModules.push(parseInt(cmd.output));
				logger.debug(`Created null sink with name "${name}" and index: ${parseInt(cmd.output)}`);
				resolve(parseInt(cmd.output));
			} else {
				logger.panic(`An error occured while trying to create the following null sink: ${name}`, cmd.status.code);
			}
		});
	}

	// FIXME: Currently the description cannot contain spaces due to a bug in pactl: https://gitlab.freedesktop.org/pulseaudio/pulseaudio/-/issues/615
	async function createCombinedSink(name: string, description: string, slaves: string[]): Promise<number> {
		return new Promise(async resolve => {
			if (slaves.length == 0)
				logger.panic("Zero slaves passed to createCombinedSink");
			let cmd = await exec(
				`pactl load-module module-combine-sink sink_name="${name}" slaves="${slaves.join()}" sink_properties=device.description="${description}"`,
				{ output: options.output , verbose: true}
			);
			if (cmd.status.success) {
				createdModules.push(parseInt(cmd.output));
				logger.debug(`Created combined sink [${slaves.join()}] with name "${name}" and index: ${parseInt(cmd.output)}`);
				resolve(parseInt(cmd.output));
			} else {
				logger.panic(`An error occured while trying to create the following combined sink: ${name}`, cmd.status.code);
			}
		});
	}

	async function createLoopbackDevice(inputSource:number, outputSink:number): Promise<number> {
		return new Promise(async resolve => {
			let cmd = await exec(
				`pactl load-module module-loopback source=${inputSource} sink=${outputSink} sink_dont_move=true source_dont_move=true`,
				{ output: options.output }
			);
			if (cmd.status.success) {
				createdModules.push(parseInt(cmd.output));
				logger.debug(`Created loopback device that routes from "${inputSource}" to "${outputSink}" its index: ${parseInt(cmd.output)}`);
				resolve(parseInt(cmd.output));
			} else {
				logger.panic(`An error occured while trying to create a loopback device that would've routed from "${inputSource}" to "${outputSink}`, cmd.status.code);
			}
		});
	}

	async function moveSinkInput(inputIndex:number, outputSink:number): Promise<void> {
		return new Promise(async resolve => {
			let cmd = await exec(
				`pactl move-sink-input ${inputIndex} ${outputSink}`,
				{ output: options.output }
			);
			if (cmd.status.success) {
				logger.debug(`Moved sink-input (${inputIndex}) to sink number ${outputSink}`);
				resolve();
			} else {
				logger.panic(`An error occured while trying to move sink-input (${inputIndex}) to sink number ${outputSink}`, cmd.status.code);
			}
		});
	}

	// FIXME: Wtf is this name
	async function getUserInputtedIndexList(whitelist: number[]): Promise<number[]> {
		return new Promise(async resolve => {
			const sinkInputs = (await readStdin()).trim();
			if(sinkInputs.length == 0)
				logger.panic(LIST_ERROR_MESSAGE_NAN);
				
			var split = sinkInputs.split(" ");
			let output: number[] = [];
			split.forEach(elem => {
				let index = parseInt(elem);
				if(isNaN(index))
					logger.panic(LIST_ERROR_MESSAGE_NAN);
				else if(!whitelist.includes(index)) {
					logger.panic(`You passed a wrong index. ${c.blue}${index}${c.reset} ${c.red}not found!`)
				}
				output.push(parseInt(elem));
			});
			resolve(output);
		})
	}

	async function getUserSelectedApplications(): Promise<number[]> {
		return new Promise(async resolve => {
			let cmd = await exec("pactl list sink-inputs", { output: options.output });
			let parsed = parseOutput(cmd.output);
			let whitelist: number[] = [];
	
			parsed.forEach(sinkInput => {
				if(sinkInput.properties["application.name"]) { // If the input is an application
					let app_name = sinkInput.properties["application.name"].replace(/"/g, "");
					logger.log(`${c.yellow}${sinkInput.index}:${c.reset} ${app_name}`)
					whitelist.push(sinkInput.index);
				} 
			});
			logger.log("Choose which applications you want to route(space separated list):", c.yellow);
			resolve(await getUserInputtedIndexList(whitelist));
		})
	}

	async function getUserSelectedSources() : Promise<number[]> {
		return new Promise(async resolve => {
			let cmd = await exec("pactl list sources", { output: options.output });
			let parsed = parseOutput(cmd.output);
			let whitelist: number[] = [];
	
			parsed.forEach(source => {
				if(source.properties["udev.id"]) { // If the source is an actual physical device
					let name = source.properties["device.product.name"].replace(/"/g, "");
					logger.log(`${c.yellow}${source.index}:${c.reset} ${name}`)
					whitelist.push(source.index);
				} 
			});
			logger.log("Choose which sources you want to route(space separated list):", c.yellow);
			resolve(await getUserInputtedIndexList(whitelist));
		})
	}
	//#endregion
}

export async function dispose(logger: Logger) {
	createdModules.forEach(async index => {
		logger.debug(`Deleting module with index: ${index}`)
		await exec(`pactl unload-module ${index}`)
	});
	logger.debug("Exiting")
}

export interface Sink {
	index: number;
	name: string;
	module: string;
	mix: string;
	status: string;
}

interface Dictionary<T> {
    [key: string]: T;
}

class ParsedOutputElement {
	index: number = -1;
	arguments: Dictionary<string> = {};
	properties: Dictionary<string> = {};
}

function parseOutput(input:string): ParsedOutputElement[] {
	let output: ParsedOutputElement[] = [];
	let block: ParsedOutputElement = new ParsedOutputElement();
	input.split("\n").forEach(ln => {
		if(ln == "" || ln.trim().startsWith("Flags")) // These lines have incorrect formatting therefore, we ignore them
			return;
		let ws = countWhitespacePrefix(ln);
		
		// Index
		if(ws == 0) {
			if(block.index) // If the block is already initalized
				output.push(block);
			block = new ParsedOutputElement();
			block.index = parseInt(ln.split("#")[1]);
		}
		// Arguments
		else if(ws == 1) { 
			let split = ln.trim().split(": ");
			if(!split[1]) // It's the start of Properties, Formats, Ports etc.
				return;
			block.arguments[split[0]] = split[1];
		}
		// Properties
		else if(ws == 2) {
			let split = ln.trim().split(" = ");
			if(!split[1]) // We don't care about elements which are not on the proplist
				return;
			block.properties[split[0]] = split[1];
		}
	});
	output.push(block); // Push the last block
	return output;
}

function countWhitespacePrefix(input: string): number {
	return input.length - input.trim().length;
}
