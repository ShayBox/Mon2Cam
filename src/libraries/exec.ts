import { v4 } from "https://deno.land/std@0.63.0/uuid/mod.ts";

function splitCommand(command: string): string[] {
	var myRegexp = /[^\s]+|"([^"]*)"/gi;
	var splits = [];

	do {
		//Each call to exec returns the next regex match as an array
		var match = myRegexp.exec(command);
		if (match != null) {
			//Index 1 in the array is the captured group if it exists
			//Index 0 is the matched text, which we use if no captured group exists
			splits.push(match[1] ? match[1] : match[0]);
		}
	} while (match != null);

	return splits;
}

export enum OutputMode {
	None = 0, // no output, just run the command
	StdOut = 1, // dump the output to stdout
	Capture = 2, // capture the output and return it
	Tee = 3, // both dump and capture the output
}

export interface IExecStatus {
	code: number;
	success: boolean;
}

export interface IExecResponse {
	status: IExecStatus;
	output: string;
}

export interface ExecOptions {
	output?: OutputMode;
	verbose?: boolean;
	continueOnError?: boolean;
	out?: "inherit" | "piped" | "null" | number;
}

export const exec = async (
	command: string,
	options: ExecOptions = { output: OutputMode.Tee, verbose: false }
): Promise<IExecResponse> => {
	let splits = splitCommand(command);

	let uuid = "";
	if (options.verbose) {
		uuid = v4.generate();
		console.log(``);
		console.log(`Exec Context: ${uuid}`);
		console.log(`    Exec Options: `, options);
		console.log(`    Exec Command: ${command}`);
		console.log(`    Exec Command Splits:  [${splits}]`);
	}

	let out = options.out || "piped";
	let p = Deno.run({ cmd: splits, stdout: out, stderr: out, env: { LANG: "C" } });

	let promises = [];
	if (p && options.output != OutputMode.None) {
		promises.push(readInput(p, inputType.STDIN));

		// If the verbose flag is set, output the stderr as well
		if (options.verbose) promises.push(readInput(p, inputType.STDERR));
	}

	let promiseResults = Promise.all(promises);
	let response = (await promiseResults).join("\n"); // Join STDIN and STDOUT with a line break between them

	let status = await p.status();
	p.stdout?.close();
	p.stderr?.close();
	p.close();

	let result = {
		status: {
			code: status.code,
			success: status.success,
		},
		output: response.trim(),
		[Deno.customInspect](): string {
			return `${Deno.inspect(this.status)},\n output: \"${this.output}\"`;
		},
	};
	if (options.verbose) {
		console.log("    Exec Result: ", result);
		console.log(`Exec Context: ${uuid}`);
		console.log(``);
	}
	return result;
};

export const execSequence = async (
	commands: string[],
	options: ExecOptions = {
		output: OutputMode.StdOut,
		continueOnError: false,
		verbose: false,
	}
): Promise<IExecResponse[]> => {
	let results: IExecResponse[] = [];

	for (let i = 0; i < commands.length; i++) {
		let result = await exec(commands[i], options);
		results.push(result);
		if (options.continueOnError == false && result.status.code != 0) {
			break;
		}
	}

	return results;
};

const decoder = new TextDecoder();
async function readInput(p: any, type: inputType): Promise<string> {
	let response = "";
	while (true) {
		const buff = new Uint8Array(1);
		try {
			let result;
			if (type == inputType.STDIN) result = await p.stdout?.read(buff);
			else if (type == inputType.STDERR) result = await p.stderr?.read(buff);
			else console.log("UNSUPPORTED INPUTTYPE, UPDATE CODE");

			if (!result) {
				break;
			}

			response += decoder.decode(buff);
		} catch (ex) {
			break;
		}
	}
	return response;
}

enum inputType {
	STDIN,
	STDERR,
}
