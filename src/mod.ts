#!/usr/bin/env -S deno run --unstable -A

import { exec } from "./libraries/exec.ts";
import { Logger } from "./libraries/logging.ts";
import Options from "./libraries/options.ts";
import startWayland from "./backends/wayland.ts";
import startX11 from "./backends/x11.ts";
import startSound, { dispose as disposeAudio } from "./backends/audio.ts";

const options = new Options(Deno.args);
const logger = new Logger(options.loggerOptions);

logger.debug(`Starting Mon2Cam with the following options: ${Deno.inspect(options)}`);
logger.debug("Checking if V4L2 device exists");
await Deno.stat("/dev/video" + options.device)
	.then(() => {
		logger.debug(`V4L2 device found with id ${options.device}`);
	})
	.catch(async (error) => {
		if (error instanceof Deno.errors.NotFound) {
			logger.debug(`V4L2 device not found with id ${options.device}, creating it`);
			let rem = await exec("sudo modprobe -r v4l2loopback", options.execOptions);
			let ins = await exec(
				`sudo modprobe v4l2loopback video_nr=${options.device} 'card_label=Mon2Cam'`,
				options.execOptions
			);
			if (!rem.status.success || !ins.status.success) {
				logger.panic(`Failed to create V4L2 device with id ${options.device}`);
			}
			logger.debug(`V4L2 device created with id ${options.device}`);
		} else logger.error(error);
	});

if (!options.wayland) {
	await exec("xisxwayland", { output: 3 })
		.then((cmd) => {
			if (cmd.status.success) {
				options.wayland = true;
			}
		})
		.catch(() => null);
}

if (options.sound) await startSound(options, logger);
if (options.wayland) {
	logger.info("Wayland detected, running wayland backend.");
	startWayland(options, logger);
} else {
	logger.info("X11 detected, running x11 backend. (use -w to force wayland)");
	startX11(options, logger);
}

for await (const _ of Deno.signal(Deno.Signal.SIGINT)) {
	await disposeAudio(logger);
	logger.write();
	Deno.exit();
}
