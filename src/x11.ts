import { exec } from "https://deno.land/x/exec@0.0.5/mod.ts";
import { readStdin } from "./utility.ts";
import Logger from "./logging.ts";
import Options from "./options.ts";

export default function startX11(options: Options, logger: Logger) {
	if (typeof options.monitor !== "number") {
		await exec("xrandr --listactivemonitors");
		logger.log("Which monitor:");

		const monitor = parseInt(await readStdin(), 10);
		if (monitor === NaN) {
			logger.error("Invalid input");
			Deno.exit(1);
		}

		options.monitor = monitor;
	}
}
