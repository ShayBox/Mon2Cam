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

	const { output } = await exec("xrandr --listactivemonitors", { output: 2 });
	const monitorLine = output.split("\n")[options.monitor + 1];
	const monitorInfo = monitorLine.trim().split(" ")[2];
	const regexGroups = /([0-9]+)\/([0-9]+)x([0-9]+)\/([0-9]+)\+([0-9]+)\+([0-9]+)/.exec(monitorInfo);
	if (!regexGroups || regexGroups.length < 7) {
		logger.panic("Xrandr output has changed and this code needs updated");
		return;
	}

	const monitorWidth = regexGroups[1];
	const monitorHeight = regexGroups[3];
	const monitorX = regexGroups[5];
	const monitorY = regexGroups[6];

	const display = Deno.env.get("DISPLAY");
	if (!display) {
		logger.panic("Display env variable not defined, are you even using X?");
		return;
	}

	logger.info("CTRL + C to stop");
	logger.info("The screen will look mirrored for you, not others");

	const commandLines = [
		"ffmpeg",
		"-f x11grab",
		`-r ${options.framerate}`,
		`-s ${monitorWidth}x${monitorHeight}`,
		`-i ${display}+${monitorX},${monitorY}`,
		...options.ffmpeg,
		"-pix_fmt yuv420p",
		"-f v4l2",
		`/dev/video${options.device}`,
	];
	await exec(commandLines.join(" "), options);
}
