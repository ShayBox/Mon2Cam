import Logger from "./logging.ts";
import { exec, OutputMode } from "./exec.ts";
import Options from "./options.ts";

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

export default async function (logger: Logger, options: Options) {
	// TODO: Request actual data, and create sinks accordingly

	//#region Functions
	async function getSinks(): Promise<Sink[]> {
		return new Promise(async (resolve) => {
			let cmd = await exec("pactl list short sinks", { output: OutputMode.Capture });
			if (cmd.status.success) {
				let lines = cmd.output.split("\n");
				let sinks: Sink[] = [];
				lines.forEach((line) => {
					let s = line.split("	");
					sinks.push({ index: Number.parseInt(s[0]), name: s[1], module: s[2], mix: s[3], status: s[4] });
				});
				resolve(sinks);
			} else {
				logger.error(`An error occured while trying to list the sinks`);
				Deno.exit(cmd.status.code);
			}
			resolve(undefined);
		});
	}

	async function getSink(identifier: string | number): Promise<Sink> {
		return new Promise(async (resolve) => {
			let cmd = await exec("pactl list short sinks", { output: OutputMode.Capture });
			if (cmd.status.success) {
				let lines = cmd.output.split("\n");
				lines.forEach((line) => {
					let s = line.split("	");
					if (typeof identifier === "string") {
						if (s[1] === identifier) {
							resolve({ index: Number.parseInt(s[0]), name: s[1], module: s[2], mix: s[3], status: s[4] });
						}
					} else {
						if (Number.parseInt(s[0]) === identifier) {
							resolve({ index: Number.parseInt(s[0]), name: s[1], module: s[2], mix: s[3], status: s[4] });
						}
					}
				});
			} else {
				logger.error(`An error occured while trying to find the following sink: ${identifier}`);
				Deno.exit(cmd.status.code);
			}
			resolve(undefined);
		});
	}

	// FIXME: Currently the description cannot contain spaces due to a bug in pactl: https://gitlab.freedesktop.org/pulseaudio/pulseaudio/-/issues/615
	async function createNullSink(name: string, description: string): Promise<Number> {
		return new Promise(async (resolve) => {
			let cmd = await exec(
				`pactl load-module module-null-sink sink_name="${name}" sink_properties=device.description="${description}"`,
				{ output: OutputMode.Capture }
			);
			if (cmd.status.success) {
				resolve(Number.parseInt(cmd.output));
			} else {
				logger.error(`An error occured while trying to create the following null sink: ${name}`);
				Deno.exit(cmd.status.code);
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
				{ output: OutputMode.Capture }
			);

			if (cmd.status.success) {
				resolve(Number.parseInt(cmd.output));
			} else {
				logger.error(`An error occured while trying to create the following combined sink: ${name}`);
				Deno.exit(cmd.status.code);
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
