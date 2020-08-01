import c from "https://deno.land/x/color/index.ts";

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
		this.output(c.blue.text("INFO") + c.reset.text(" ") + msg, LogType.Info);
	}
	public warn(msg: string): void {
		this.output(c.yellow.text("WARN") + c.reset.text(" ") + msg, LogType.Warning);
	}
	public error(msg: string): void {
		this.output(c.red.text("ERROR") + c.reset.text(" ") + msg, LogType.Error);
	}
	public debug(msg: string): void {
		this.output(c.magenta.text("DEBUG") + c.reset.text(" ") + msg, LogType.Debug);
	}
	public log(msg: string): void {
		this.output(msg, LogType.Log);
	}
	public panic(msg: string, code?: number): void {
		this.output(c.red.text("PANIC") + c.reset.text(" ") + msg, LogType.Panic);
		Deno.exit(code || 1);
	}
}
