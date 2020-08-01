import { exec, OutputMode } from "./exec.ts";

export async function readStdin() {
	const buffer = new Uint8Array(1024);
	const number = <number>await Deno.stdin.read(buffer);

	return new TextDecoder().decode(buffer.subarray(0, number));
}

export async function checkDependency(command: string) {
	await exec(command, { output: OutputMode.None }).catch((error) => {
		if (error instanceof Deno.errors.NotFound) {
			console.log(command + " not installed");
		} else {
			console.error(error);
		}

		Deno.exit(1);
	});
}
