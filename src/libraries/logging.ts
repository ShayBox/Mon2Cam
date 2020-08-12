import { dispose as disposeAudio } from "../backends/audio.ts";

export interface LoggerOptions {
	verbose: boolean;
	file?: string;
}

export class Logger {
	private verbose: boolean;
	private file?: string;
	private data: string[] = [];

	public constructor(options: LoggerOptions) {
		this.verbose = options.verbose;
		this.file = options.file;
	}

	private async output(stdout: Function, msg: string, prefix?: string): Promise<void> {
		const _msg = prefix ? `${prefix} ${msg}` : msg;

		stdout(_msg);

		if (this.file) this.data.push(_msg);
	}

	public info(msg: string): void {
		this.output(console.info, msg, wrap(Color.blue, "INFO"));
	}
	public warn(msg: string): void {
		this.output(console.warn, msg, wrap(Color.yellow, "WARN"));
	}
	public error(msg: string): void {
		this.output(console.error, msg, wrap(Color.red, "ERROR"));
	}
	public debug(msg: string): void {
		if (!this.verbose) return;
		this.output(console.info, msg, wrap(Color.magenta, "DEBUG"));
	}
	public log(msg: string, color?: Color): void {
		const _msg = color ? wrap(color, msg) : msg;
		this.output(console.log, _msg);
	}
	public panic(msg: string, code?: number): void {
		disposeAudio(this).finally(() => {
			this.output(console.error, msg, wrap(Color.red, "PANIC"));
			Deno.exit(code || 1);
		});
	}

	public write() {
		if (!this.file) return;
		this.debug("Writing log");
		Deno.writeTextFileSync(this.file, this.data.join("\n"));
	}
}

export enum Color {
	reset = "\x1b[0m",
	bright = "\x1b[1m",
	dim = "\x1b[2m",
	underscore = "\x1b[4m",
	blink = "\x1b[5m",
	reverse = "\x1b[7m",
	hidden = "\x1b[8m",
	black = "\x1b[30m",
	red = "\x1b[31m",
	green = "\x1b[32m",
	yellow = "\x1b[33m",
	blue = "\x1b[34m",
	magenta = "\x1b[35m",
	cyan = "\x1b[36m",
	white = "\x1b[37m",
	bgBlack = "\x1b[40m",
	bgRed = "\x1b[41m",
	bgGreen = "\x1b[42m",
	bgYellow = "\x1b[43m",
	bgBlue = "\x1b[44m",
	bgMagenta = "\x1b[45m",
	bgCyan = "\x1b[46m",
	bgWhite = "\x1b[47m",
}

export function wrap(color: Color, value: string) {
	return color + value + Color.reset;
}
