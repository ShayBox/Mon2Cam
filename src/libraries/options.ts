import type { LoggerOptions } from "./logging.ts";
import { ExecOptions, OutputMode } from "./exec.ts";
import { parse } from "https://deno.land/std@0.62.0/flags/mod.ts";

export default class Options {
	public framerate: number = 60;
	public device: number = 50;
	public monitor?: number;
	public resolution: string = "";
	public verboseFile?: string;
	public ffmpeg: string[] = [];
	public border: boolean = false;
	public sound: boolean = false;
	public wayland: boolean = false;
	public loggerOptions: LoggerOptions = { verbose: false };
	public execOptions: ExecOptions = { verbose: false, output: OutputMode.Capture };

	constructor(args: string[]) {
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
			wayland: "w",
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
					"-w   --wayland     Force the use of the wayland backend (Useful when it's not detected)",
					"-v,  --verbose,    Show verbose output",
					"",
					"To find out more, visit https://github.com/shaybox/mon2cam",
				].join("\n")
			);

			Deno.exit();
		}

		if (typeof p.framerate === "number") this.framerate = p.framerate;
		if (typeof p.device === "number") this.device = p.device;
		if (typeof p.monitor === "number") this.monitor = p.monitor;
		if (typeof p.resolution === "string") this.resolution = p.resolution;
		if (typeof p.vflip === "boolean") this.ffmpeg.push("-vf vflip");
		if (typeof p.hflip === "boolean") this.ffmpeg.push("-vf hflip");
		if (typeof p.border === "boolean") this.border = p.border;
		if (typeof p.sound === "boolean") this.sound = p.sound;
		if (typeof p.wayland === "boolean") this.wayland = p.wayland;
		if (typeof p.verbose === "boolean") {
			this.loggerOptions = { verbose: true };
			this.execOptions = { verbose: true, output: OutputMode.Tee };
		} else if (typeof p.verbose === "string") {
			this.loggerOptions = { verbose: true, file: p.verbose };
			this.execOptions = { verbose: true, output: OutputMode.Tee };
		}
	}
}
