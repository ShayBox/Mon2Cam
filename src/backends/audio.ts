import { Logger, Color } from "../libraries/logging.ts";
import { exec, OutputMode } from "../libraries/exec.ts";
import Options from "../libraries/options.ts";
import { readStdin } from "../libraries/utility.ts";

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
const LIST_ERROR_MESSAGE_NAN = 'You need to pass a space separated list e.g.:"3 14"';

let createdModules: Number[] = [];

export default async function (options: Options, logger: Logger) {
	// TODO: Detect already created modules

	let apps = await getUserSelectedApplications();
	let sources = await getUserSelectedSources();

	if(apps.length == 0 && sources.length == 0)
		logger.warn("No applications, nor any sources passed. Why are you using the sound flag?")

	let micSink = await getSinkByModule(await createNullSink(VS_MIC, VS_MIC_DESCRIPTION));
	
	if(apps.length > 0) {
		let combinedSink = await getSinkByModule(
			await createCombinedSink("VirtualSinkAPP", `Mon2CamCombinedSink`, [micSink.name, DEFAULT_SINK])
		);
		for (const app of apps) {
			await moveSinkInput(app, combinedSink.index);
		}
	}
	else
		logger.debug("No applications passed therefore skipping combined sink creation.");

	sources.forEach((sources) => {
		createLoopbackDevice(sources, micSink.index);
	});

	switchDiscordRecording(micSink);

	//#region Functions
	async function switchDiscordRecording(micSink: Sink): Promise<void> {
		return new Promise(async (resolve) => {
			while (true) {
				await new Promise((r) => setTimeout(r, 2000)); // Wait for 2 seconds
				let cmd = await exec("pactl list source-outputs", {
					output: options.output,
					verbose: options.output == OutputMode.Tee,
				});
				let parsed = parseOutput(cmd.output);
				parsed.forEach((recording) => {
					// Find the discord recording, switch to the recording sink and then exit the loop
					if (recording.properties["application.process.binary"] == '"Discord"') {
						moveSourceOutput(recording.index, `${micSink.name}.monitor`);
					}
				});
			}
			resolve();
		});
	}

	async function getSinks(): Promise<Sink[]> {
		return new Promise(async (resolve) => {
			let cmd = await exec("pactl list short sinks", {
				output: options.output,
				verbose: options.output == OutputMode.Tee,
			});
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
		return new Promise(async (resolve) => {
			let cmd = await exec("pactl list short sinks", {
				output: options.output,
				verbose: options.output == OutputMode.Tee,
			});
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
		return new Promise(async (resolve) => {
			let cmd = await exec("pactl list sinks", { output: options.output, verbose: options.output == OutputMode.Tee });
			if (cmd.status.success) {
				let parsed = parseOutput(cmd.output);
				parsed.forEach((sink) => {
					if (sink.arguments["Owner Module"] && parseInt(sink.arguments["Owner Module"]) == moduleIndex) {
						resolve({
							index: sink.index,
							name: sink.arguments["Name"],
							module: sink.arguments["Driver"],
							mix: sink.arguments["Sample Specification:"],
							status: sink.arguments["State"],
						});
					}
				});
			} else {
				logger.panic(
					`An error occured while trying to find the sink with the following module index: ${moduleIndex}`,
					cmd.status.code
				);
			}
		});
	}

	// FIXME: Currently the description cannot contain spaces due to a bug in pactl: https://gitlab.freedesktop.org/pulseaudio/pulseaudio/-/issues/615
	async function createNullSink(name: string, description: string): Promise<number> {
		return new Promise(async (resolve) => {
			let cmd = await exec(
				`pactl load-module module-null-sink sink_name="${name}" sink_properties=device.description="${description}"`,
				{ output: options.output, verbose: options.output == OutputMode.Tee }
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
		return new Promise(async (resolve) => {
			if (slaves.length == 0) logger.panic("Zero slaves passed to createCombinedSink");
			let cmd = await exec(
				`pactl load-module module-combine-sink sink_name="${name}" slaves="${slaves.join()}" sink_properties=device.description="${description}"`,
				{ output: options.output, verbose: options.output == OutputMode.Tee }
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

	async function createLoopbackDevice(inputSource: number, outputSink: number): Promise<number> {
		return new Promise(async (resolve) => {
			let cmd = await exec(
				`pactl load-module module-loopback source=${inputSource} sink=${outputSink} sink_dont_move=true source_dont_move=true`,
				{ output: options.output, verbose: options.output == OutputMode.Tee }
			);
			if (cmd.status.success) {
				createdModules.push(parseInt(cmd.output));
				logger.debug(
					`Created loopback device that routes from "${inputSource}" to "${outputSink}" its index: ${parseInt(
						cmd.output
					)}`
				);
				resolve(parseInt(cmd.output));
			} else {
				logger.panic(
					`An error occured while trying to create a loopback device that would've routed from "${inputSource}" to "${outputSink}`,
					cmd.status.code
				);
			}
		});
	}

	async function moveSinkInput(inputIndex: number, outputSink: number): Promise<void> {
		return new Promise(async (resolve) => {
			let cmd = await exec(`pactl move-sink-input ${inputIndex} ${outputSink}`, {
				output: options.output,
				verbose: options.output == OutputMode.Tee,
			});

			if (cmd.status.success) {
				logger.debug(`Moved sink-input (${inputIndex}) to sink number ${outputSink}`);
				resolve();
			} else {
				logger.panic(
					`An error occured while trying to move sink-input (${inputIndex}) to sink number ${outputSink}`,
					cmd.status.code
				);
			}
		});
	}

	// Choose where to record from
	async function moveSourceOutput(recordingIndex: number, source: string): Promise<void> {
		return new Promise(async (resolve) => {
			let cmd = await exec(`pactl move-source-output ${recordingIndex} ${source}`, {
				output: options.output,
				verbose: options.output == OutputMode.Tee,
			});
			if (cmd.status.success) {
				logger.debug(`Moved source-output (${recordingIndex}) to source ${source}`);
				resolve();
			} else {
				logger.panic(
					`An error occured while trying to move source-output (${recordingIndex}) to source ${source}`,
					cmd.status.code
				);
			}
		});
	}

	async function checkIfWhitelistContainsIndex(whitelist: ParsedOutputElement[], index: number): Promise<boolean> {
		for (let i = 0; i < whitelist.length; i++) {
			const element = whitelist[i];
			if(element.index == index)
				return true;
		}
		return false;
	}

	// FIXME: Wtf is this name
	async function getUserInputtedIndexList(whitelist: ParsedOutputElement[]): Promise<number[]> {
		return new Promise(async (resolve) => {
			const indexListString = (await readStdin()).trim();
			var split = indexListString == "" ? [] : indexListString.split(" ");
			let output: number[] = [];
			split.forEach((elem) => {
				let index = parseInt(elem);
				if (isNaN(index)) logger.panic(LIST_ERROR_MESSAGE_NAN);
				if (!checkIfWhitelistContainsIndex(whitelist, index)) {
					logger.panic(`You passed a wrong index. ${Color.blue}${index}${Color.reset} ${Color.red}not found!`);
				}
				output.push(parseInt(elem));
			});
			resolve(output);
		});
	}

	async function getUserSelectedApplications(): Promise<number[]> {
		return new Promise(async (resolve) => {
			let cmd = await exec("pactl list sink-inputs", {
				output: options.output,
				verbose: options.output == OutputMode.Tee,
			});
			let parsed = parseOutput(cmd.output);
			let validApps: ParsedOutputElement[] = [];
			let whitelist: number[] = [];

			parsed.forEach((sinkInput) => {
				// If the input is an application
				if (sinkInput.properties["application.name"])
					validApps.push(sinkInput);
			});
			if(validApps.length > 0) {
				validApps.forEach((sinkInput) => {
					let app_name = sinkInput.properties["application.name"].replace(/"/g, "");
					logger.log(`${Color.yellow}${sinkInput.index}:${Color.reset} ${app_name}`);
				});
				logger.log("Choose which applications you want to route(space separated list):", Color.yellow);
				resolve(await getUserInputtedIndexList(validApps));
			}
			else {
				logger.info("No valid applications found");
				resolve([]);
			}
		});
	}

	async function getUserSelectedSources(): Promise<number[]> {
		return new Promise(async (resolve) => {
			let cmd = await exec("pactl list sources", { output: options.output, verbose: options.output == OutputMode.Tee });
			
			let parsed = parseOutput(cmd.output);
			let validSources: ParsedOutputElement[] = [];
			parsed.forEach((source) => {
				// If the source is an actual physical device
				if (source.properties["udev.id"])
					validSources.push(source);
			});
			if(validSources.length > 0) {
				validSources.forEach((source) => {
					let source_name = source.properties["device.product.name"].replace(/"/g, "");
					logger.log(`${Color.yellow}${source.index}:${Color.reset} ${source_name}`);
				});
				logger.log("Choose which sources you want to route(space separated list):", Color.yellow);
				resolve(await getUserInputtedIndexList(validSources));
			}
			else {
				logger.info("No valid applications found");
				resolve([]);
			}
		});
	}
	//#endregion
}

export async function dispose(logger: Logger) {
	createdModules.forEach(async (index) => {
		logger.debug(`Deleting module with index: ${index}`);
		await exec(`pactl unload-module ${index}`);
	});
	logger.debug("Exiting");
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

function parseOutput(input: string): ParsedOutputElement[] {
	let output: ParsedOutputElement[] = [];
	let block: ParsedOutputElement = new ParsedOutputElement();
	input.split("\n").forEach((ln) => {
		if (ln == "" || ln.trim().startsWith("Flags"))
			// These lines have incorrect formatting therefore, we ignore them
			return;
		let ws = countWhitespacePrefix(ln);

		// Index
		if (ws == 0) {
			if (block.index)
				// If the block is already initalized
				output.push(block);
			block = new ParsedOutputElement();
			block.index = parseInt(ln.split("#")[1]);
		}
		// Arguments
		else if (ws == 1) {
			let split = ln.trim().split(": ");
			if (!split[1])
				// It's the start of Properties, Formats, Ports etc.
				return;
			block.arguments[split[0]] = split[1];
		}
		// Properties
		else if (ws == 2) {
			let split = ln.trim().split(" = ");
			if (!split[1])
				// We don't care about elements which are not on the proplist
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
