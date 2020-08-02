export enum LogType {
	Debug,
	Error,
	Info,
	Log,
	Panic,
	Warning,
}

export default class Logger {
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
		this.output(wrap(Color.red, `PANIC ${msg}`), LogType.Panic);
		Deno.exit(code || 1);
	}
}

export class Color {
	public static readonly reset: "\x1b[0m";
	public static readonly bright: "\x1b[1m";
	public static readonly dim: "\x1b[2m";
	public static readonly underscore: "\x1b[4m";
	public static readonly blink: "\x1b[5m";
	public static readonly reverse: "\x1b[7m";
	public static readonly hidden: "\x1b[8m";
	public static readonly black: "\x1b[30m";
	public static readonly red: "\x1b[31m";
	public static readonly green: "\x1b[32m";
	public static readonly yellow: "\x1b[33m";
	public static readonly blue: "\x1b[34m";
	public static readonly magenta = "\x1b[35m";
	public static readonly cyan: "\x1b[36m";
	public static readonly white: "\x1b[37m";
	public static readonly bgBlack: "\x1b[40m";
	public static readonly bgRed: "\x1b[41m";
	public static readonly bgGreen: "\x1b[42m";
	public static readonly bgYellow: "\x1b[43m";
	public static readonly bgBlue: "\x1b[44m";
	public static readonly bgMagenta: "\x1b[45m";
	public static readonly bgCyan: "\x1b[46m";
	public static readonly bgWhite: "\x1b[47m";
}

export function wrap(color: Color, value: string) {
	return color + value + Color.reset;
}
