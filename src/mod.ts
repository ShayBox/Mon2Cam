import { exec } from "./exec.ts";
import Logger from "./logging.ts";
import Options from "./options.ts";
import startWayland from "./x11.ts";
import startX11 from "./x11.ts";
import enableSound from "./audio.ts"

const options = new Options(Deno.args);
const logger = new Logger(options.verbose);

await Deno.stat("/dev/video" + options.device).catch(async (error) => {
	if (error instanceof Deno.errors.NotFound) {
		await exec("sudo modprobe -r v4l2loopback", options);
		await exec(`sudo modprobe v4l2loopback video_nr=${options.device} 'card_label=Mon2Cam'`, options);
	} else logger.error(error);
});

// if (options.border) enableBorder();
if (options.sound) enableSound(options, logger);
if (options.wayland) startWayland(options, logger);
else startX11(options, logger);
