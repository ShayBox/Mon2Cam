import { exec, OutputMode } from "https://deno.land/x/exec@0.0.5/mod.ts";
import { readStdin } from "./utility.ts";
import Logger from "./logging.ts";
import Options from "./options.ts";

const options = new Options(Deno.args);
const logger = new Logger(options.verbosity);

await Deno.stat("/dev/video" + options.device).catch(async (error) => {
	if (error instanceof Deno.errors.NotFound) {
		await exec("sudo modprobe -r v4l2loopback", options.execOptions);
		await exec(`sudo modprobe v4l2loopback video_nr=${options.device} 'card_label=Mon2Cam'`, options.execOptions);
	} else logger.error(error);
});

if (options.border) {
	// enableBorder();
}

if (options.sound) {
	// enableSound();
}

if (options.wayland) {
	// Wayland
} else {
	if (typeof options.monitor !== "number") {
		await exec("xrandr --listactivemonitors");
		logger.log("Which monitor:");

		const monitor = parseInt(await readStdin(), 10);
		if (monitor === NaN) {
			logger.error("Invalid input");
			Deno.exit(1);
		}

		options.monitor = monitor;
	}
}
