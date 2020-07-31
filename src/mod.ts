import { exec } from "https://deno.land/x/exec@0.0.5/mod.ts";
import { parseOptions } from "./options.ts";

const options = parseOptions(Deno.args);

await Deno.stat("/dev/video" + options.device).catch(async (error) => {
	if (error instanceof Deno.errors.NotFound) {
		await exec("sudo modprobe -r v4l2loopback");
		await exec(`sudo modprobe v4l2loopback video_nr=${options.device} 'card_label=Mon2Cam'`);
	} else console.error(error);
});
