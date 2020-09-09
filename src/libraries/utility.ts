import { exec } from "./exec.ts";
import { Logger } from "./logging.ts";

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

const supported_resolutions = [[1920, 1080], [1280, 720], [640, 480]];
export function check_resolution(logger: Logger, selected_x: number, selected_y: number) {
	let found_compatible = false;
	for(const [x,y] of supported_resolutions ) {
		if(x == selected_x && y == selected_y) {
			found_compatible = true;
			break;
		}
	}
	if(!found_compatible)
		logger.warn(`The selected resolution (${selected_x}:${selected_y}) may not be supported by discord. Please use the -r flag to change the resolution, if needed.`)
}
