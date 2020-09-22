import { exec } from "./exec.ts";
import type { Logger } from "./logging.ts";

export async function readStdin() {
	const buffer = new Uint8Array(1024);
	const number = <number>await Deno.stdin.read(buffer);

	return new TextDecoder().decode(buffer.subarray(0, number));
}

export async function checkDependency(command: string, logger: Logger) {
	await exec(command, { output: 0 }).catch((error) => {
		if (error instanceof Deno.errors.NotFound) {
			logger.panic(command + " not installed");
		} else {
			logger.panic(error);
		}
	});
}

export const supportedResolutions = [
	[1920, 1080],
	[1280, 720],
	[640, 480],
];

export function checkResolution(logger: Logger, selected_x: number, selected_y: number) {
	if (!supportedResolutions.some(([x, y]) => x == selected_x && y == selected_y)) {
		logger.warn(
			`The selected resolution (${selected_x}:${selected_y}) may not be supported by discord. Please use the -r flag to change the resolution, if needed.`
		);
	}
}
