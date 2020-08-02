class colors {
	static readonly reset: color = "\x1b[0m";
	static readonly bright: color = "\x1b[1m";
	static readonly dim: color = "\x1b[2m";
	static readonly underscore: color = "\x1b[4m";
	static readonly blink: color = "\x1b[5m";
	static readonly reverse: color = "\x1b[7m";
	static readonly hidden: color = "\x1b[8m";
	static readonly black: color = "\x1b[30m";
	static readonly red: color = "\x1b[31m";
	static readonly green: color = "\x1b[32m";
	static readonly yellow: color = "\x1b[33m";
	static readonly blue: color = "\x1b[34m";
	static readonly magenta= "\x1b[35m";
	static readonly cyan: color = "\x1b[36m";
	static readonly white: color = "\x1b[37m";
	static readonly bgBlack: color = "\x1b[40m";
	static readonly bgRed: color = "\x1b[41m";
	static readonly bgGreen: color = "\x1b[42m";
	static readonly bgYellow: color = "\x1b[43m";
	static readonly bgBlue: color = "\x1b[44m";
	static readonly bgMagenta: color = "\x1b[45m";
	static readonly bgCyan: color = "\x1b[46m";
	static readonly bgWhite: color = "\x1b[47m";
};

export class color extends String{}

export default colors;
export function wrap(color: color, value: string) {
	return color + value + colors.reset;
}
