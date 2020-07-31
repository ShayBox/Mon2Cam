import { parseOptions } from "./options.ts";
import { readStdin, exec } from "./deps.ts";

const options = parseOptions(Deno.args);

await Deno.stat("/dev/video" + options.device).catch(async (error) => {
	if (error instanceof Deno.errors.NotFound) {
		await exec("sudo modprobe -r v4l2loopback");
		await exec(`sudo modprobe v4l2loopback video_nr=${options.device} 'card_label=Mon2Cam'`);
	} else console.error(error);
});

if (!options.monitor) {
	await exec("xrandr --listactivemonitors");
	console.log("Which monitor:");

	const monitor = parseInt(await readStdin(), 10);
	if (monitor === NaN) {
		console.error("Invalid input");
		Deno.exit(1);
	}

	options.monitor = monitor;
}
