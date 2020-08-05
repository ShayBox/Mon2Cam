import { exec } from "../libraries/exec.ts";
import { readStdin, checkDependency } from "../libraries/utility.ts";
import Logger, {colors as c} from "../libraries/logging.ts";
import Options from "../libraries/options.ts";

interface XMonitorInfo {
	index: string;
	height: string;
	width: string;
	x: string;
	y: string;
}

function getMonitorInfo(xrandr: string): XMonitorInfo {
	const regexGroups = /([\d]+): \+[\*]?[\d\w\-]+ ([\d]+)\/([\d]+)x([\d]+)\/([\d]+)\+([\d]+)\+([\d]+)/.exec(xrandr);
	if (!regexGroups || regexGroups.length < 7) {
		throw new Error("Xrandr output has changed and this code needs updated");
	}

	return {
		index: regexGroups[1],
		height: regexGroups[4],
		width: regexGroups[2],
		x: regexGroups[6],
		y: regexGroups[7],
	};
}

export default async function (options: Options, logger: Logger) {
	await checkDependency("xrandr");
	await checkDependency("ffmpeg");

	const { output } = await exec("xrandr --listactivemonitors", { output: 2 });
	const lines = output.split("\n").slice(1);

	if (!options.monitor) {
		const monitors = lines.map((line) => getMonitorInfo(line));
		for (const monitor of monitors) {
			logger.log(`${c.yellow}${monitor.index}:${c.reset} ${monitor.width}x${monitor.height}`);
		}
		logger.log("Which monitor?", c.yellow);

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

	const monitor = getMonitorInfo(lines[options.monitor]);
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
		`-s ${monitor.width}x${monitor.height}`,
		`-i ${display}+${monitor.x},${monitor.y}`,
		...options.ffmpeg,
		"-pix_fmt yuv420p",
		"-f v4l2",
		`/dev/video${options.device}`,
	];
	await exec(commandLines.join(" "), options);
}
