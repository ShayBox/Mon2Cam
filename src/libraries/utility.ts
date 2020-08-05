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
