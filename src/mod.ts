#!/usr/bin/env -S deno run --unstable --allow-run --allow-read --allow-env

import { exec } from "./libraries/exec.ts";
import { Logger } from "./libraries/logging.ts";
import Options from "./libraries/options.ts";
import startWayland from "./backends/x11.ts";
import startX11 from "./backends/x11.ts";
import startSound, { dispose as disposeAudio } from "./backends/audio.ts";

const options = new Options(Deno.args);
const logger = new Logger(options.verbose);

await Deno.stat("/dev/video" + options.device).catch(async (error) => {
	if (error instanceof Deno.errors.NotFound) {
		await exec("sudo modprobe -r v4l2loopback", options);
		await exec(`sudo modprobe v4l2loopback video_nr=${options.device} 'card_label=Mon2Cam'`, options);
	} else logger.error(error);
});

if (!options.wayland) {
	await exec("xisxwayland", { output: 3 }).then((cmd) => {
		if (cmd.status.success) {
			options.wayland = true;
		}
	});
}

if (options.sound) await startSound(options, logger);
if (options.wayland) {
	startWayland(options, logger);
} else {
	startX11(options, logger);
}

for await (const _ of Deno.signal(Deno.Signal.SIGINT)) {
	await disposeAudio(logger);
	Deno.exit();
}
