import { parse } from "https://deno.land/std@0.62.0/flags/mod.ts";
import { OutputMode } from "https://deno.land/x/exec@0.0.5/mod.ts";

interface Options {
	framerate: number;
	device: number;
	monitor?: number;
	ffmpeg: string[];
	border: boolean;
	sound: boolean;
	output: OutputMode;
}

export function parseOptions(args: string[]): Options {
	const alias = {
		help: "h",
		framerate: "f",
		device: "d",
		monitor: "m",
		resolution: "r",
		vflip: "vf",
		hflip: "hf",
		border: "b",
		sound: "s",
		verbose: "v",
	};
	const p = parse(args, { alias });

	if (p.help) {
		console.log(
			[
				"Mon2Cam - Monitor 2 Camera",
				"",
				"Mon2Cam [options] [value]",
				"",
				"options:",
				"-h,  --help,       Show help",
				"-f,  --framerate,  Set framerate",
				"-d,  --device,     Set device number",
				"-m,  --monitor,    Set monitor number",
				"-r,  --resolution, Set output resolution (W:H)",
				"-vf, --vflip,      Vertically flip the camera",
				"-hf, --hflip,      Horizontally flip the camera",
				"-b,  --border,     Add border when scaling to avoid stretching",
				"-s,  --sound,      Create virtual sink and route sound into it",
				"-v,  --verbose,    Show verbose output",
				"",
				"To find out more, visit https://github.com/shaybox/mon2cam",
			].join("\n")
		);

		Deno.exit();
	}

	const options: Options = {
		framerate: 60,
		device: 50,
		ffmpeg: [],
		border: false,
		sound: false,
		output: OutputMode.Capture,
	};

	if (typeof p.framerate === "number") options.framerate = p.framerate;
	if (typeof p.device === "number") options.device = p.device;
	if (typeof p.monitor === "number") options.monitor = p.monitor;
	if (typeof p.resolution === "string") {
		options.ffmpeg.push("-vf scale=" + p.resolution);
	}
	if (typeof p.vflip === "boolean") options.ffmpeg.push("-vf vflip");
	if (typeof p.hflip === "boolean") options.ffmpeg.push("-vf hflip");
	if (typeof p.border === "boolean") options.border = p.border;
	if (typeof p.sound === "boolean") options.sound = p.sound;
	if (typeof p.verbose === "boolean") options.output = OutputMode.Tee;

	return options;
}
