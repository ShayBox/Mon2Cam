import { exec } from "./libraries/exec.ts";
import Logger from "./logging.ts";
import Options from "./options.ts";
import startWayland from "./backends/x11.ts";
import startX11 from "./backends/x11.ts";

const options = new Options(Deno.args);
const logger = new Logger(options.verbose);

await Deno.stat("/dev/video" + options.device).catch(async (error) => {
	if (error instanceof Deno.errors.NotFound) {
		await exec("sudo modprobe -r v4l2loopback", options);
		await exec(`sudo modprobe v4l2loopback video_nr=${options.device} 'card_label=Mon2Cam'`, options);
	} else logger.error(error);
});

// if (options.sound) startSound();
if (options.wayland) {
	await startWayland(options, logger);
} else {
	await startX11(options, logger);
}
