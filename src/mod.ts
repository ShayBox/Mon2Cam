import { parseOptions } from "./options.ts";
import { readStdin, exec } from "./deps.ts";
import {Logger} from "./logging.ts"

const options = parseOptions(Deno.args);
const logger = new Logger(options.verbosity);

await Deno.stat("/dev/video" + options.device).catch(async (error) => {
	if (error instanceof Deno.errors.NotFound) {
		await exec("sudo modprobe -r v4l2loopback");
		await exec(`sudo modprobe v4l2loopback video_nr=${options.device} 'card_label=Mon2Cam'`);
	} else logger.error(error);
});

if (!options.monitor) {
	await exec("xrandr --listactivemonitors");
	logger.log("Which monitor:");

	const monitor = parseInt(await readStdin(), 10);
	if (monitor === NaN) {
		logger.error("Invalid input");
		Deno.exit(1);
	}

	options.monitor = monitor;
}
