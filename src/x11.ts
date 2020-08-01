import { exec, OutputMode } from "./exec.ts";
import { readStdin, checkDependency } from "./utility.ts";
import Logger from "./logging.ts";
import Options from "./options.ts";

export default async function (options: Options, logger: Logger) {
	await checkDependency("xrandr");
	await checkDependency("ffmpeg");

	if (typeof options.monitor !== "number") {
		const { output } = await exec("xrandr --listactivemonitors");
		logger.log("Which monitor:");

		const monitor = parseInt(await readStdin(), 10);
		if (isNaN(monitor)) {
			logger.panic("Input not a number");
		}

		const monitorCount = output.split("\n").length - 2;
		if (monitor < 0 || monitor > monitorCount) {
			logger.panic("Input not a monitor");
		}

		options.monitor = monitor;
	}
}
