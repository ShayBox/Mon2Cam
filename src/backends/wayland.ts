import type { Logger } from "../libraries/logging.ts";
import type Options from "../libraries/options.ts";
import { checkDependency } from "../libraries/utility.ts";
import { exec } from "../libraries/exec.ts";

export default async function (options: Options, logger: Logger) {
	checkDependency("wf-recorder", logger);

	logger.info("CTRL + C to stop");
	logger.info("The screen will look mirrored for you, not others");
	//TODO: List outputs and be able to select one (using wayland-info?)
	//TODO: Check for unsupported resolutions
	const commandLines = ["wf-recorder", "-x yuv420p", "-c rawvideo", "-m v4l2", `-f /dev/video${options.device}`];
	await exec(commandLines.join(" "), options.execOptions);
}
