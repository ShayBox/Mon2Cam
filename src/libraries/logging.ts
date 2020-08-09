import { dispose as disposeAudio } from "../backends/audio.ts";

export enum LogType {
	Debug,
	Error,
	Info,
	Log,
	Panic,
	Warning,
}

export class Logger {
	private verbose: boolean;

	constructor(verbose: boolean) {
		this.verbose = verbose;
	}

	output(msg: string, type: LogType): void {
		switch (type) {
			case LogType.Debug: {
				if (!this.verbose) break;
			}
			case LogType.Info:
				console.info(msg);
				break;

			case LogType.Log:
				console.log(msg);
				break;

			case LogType.Warning:
				console.warn(msg);
				break;

			case LogType.Error:
			case LogType.Panic:
				console.error(msg);
		}
	}

	public info(msg: string): void {
		this.output(wrap(Color.blue, "INFO ") + msg, LogType.Info);
	}
	public warn(msg: string): void {
		this.output(wrap(Color.yellow, "WARN ") + msg, LogType.Warning);
	}
	public error(msg: string): void {
		this.output(wrap(Color.red, "ERROR ") + msg, LogType.Error);
	}
	public debug(msg: string): void {
		this.output(wrap(Color.magenta, "DEBUG ") + msg, LogType.Debug);
	}
	public log(msg: string, color?: Color): void {
		let _msg = color ? wrap(color, msg) : msg;
		this.output(_msg, LogType.Log);
	}
	public panic(msg: string, code?: number): void {
		disposeAudio(this).finally(() => {
			this.output(wrap(Color.red, `PANIC ${msg}`), LogType.Panic);
			Deno.exit(code || 1);
		});
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
