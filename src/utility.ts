export async function readStdin() {
	const buffer = new Uint8Array(1024);
	const number = <number>await Deno.stdin.read(buffer);

	return new TextDecoder().decode(buffer.subarray(0, number));
}
