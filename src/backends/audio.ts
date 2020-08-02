import Logger from "../logging.ts";
import { exec } from "../libraries/exec.ts";
import Options from "../options.ts";
import {readStdin} from "../utility.ts";

/*
/  VS_APP Is responsible for combining the sound of the applications. 
/  Both the host and the client will hear this.
/  VS_MIC Is responsible for combining the devices that only the client will hear. 
/  (Mainly microphones)
*/
const VS_APP = "VirtualSinkAPP";
const VS_APP_DESCRIPTION = "Mon2Cam application sink";
const VS_MIC = "VirtualSinkMIC";
const VS_MIC_DESCRIPTION = "Mon2Cam microphone sink";

const NULL_SINK_MODULE = "module-null-sink.c";
const COMBINED_SINK_MODULE = "module-combined-sink.c";

export default async function (options: Options, logger: Logger) {
	// TODO: Request actual data, and create sinks accordingly
	
	logger.log("Choose which applications you want to route:");

	const monitor = parseInt(await readStdin(), 10);

	//#region Functions
	async function getSinks(): Promise<Sink[]> {
		return new Promise(async (resolve) => {
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
		return new Promise(async (resolve) => {
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
			resolve(undefined);
		});
	}

	// FIXME: Currently the description cannot contain spaces due to a bug in pactl: https://gitlab.freedesktop.org/pulseaudio/pulseaudio/-/issues/615
	async function createNullSink(name: string, description: string): Promise<Number> {
		return new Promise(async (resolve) => {
			let cmd = await exec(
				`pactl load-module module-null-sink sink_name="${name}" sink_properties=device.description="${description}"`,
				{ output: options.output }
			);
			if (cmd.status.success) {
				resolve(parseInt(cmd.output));
				logger.debug(`Created null sink with name "${name} and index: ${parseInt(cmd.output)}`);
			} else {
				logger.panic(`An error occured while trying to create the following null sink: ${name}`, cmd.status.code);
			}
			resolve(undefined);
		});
	}

	// FIXME: Currently the description cannot contain spaces due to a bug in pactl: https://gitlab.freedesktop.org/pulseaudio/pulseaudio/-/issues/615
	async function createCombinedSink(name: string, description: string, slaves: string[]): Promise<Number> {
		return new Promise(async (resolve) => {
			if (slaves.length == 0) {
				logger.error("Zero slaves passed to createCombinedSink");
				resolve(undefined);
			}
			let cmd = await exec(
				`pactl load-module module-combine-sink sink_name="${name}" slaves="${slaves.join()}" sink_properties=device.description="${description}"`,
				{ output: options.output }
			);
			if (cmd.status.success) {
				resolve(parseInt(cmd.output));
				logger.debug(`Created combined sink [${slaves.join()}] with name "${name}" and index: ${parseInt(cmd.output)}`);
			} else {
				logger.panic(`An error occured while trying to create the following combined sink: ${name}`, cmd.status.code);
			}
			resolve(undefined);
		});
	}
	//#endregion
}

export interface Sink {
	index: number;
	name: string;
	module: string;
	mix: string;
	status: string;
}

// TODO: Write parser
