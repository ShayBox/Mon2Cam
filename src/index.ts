import { Logger } from "./logging.ts"
import { parseOptions } from "./options.ts";
import mod from "./mod.ts"
import audio from "./audio.ts"

const options = parseOptions(Deno.args);
const logger = new Logger(options.verbosity);

async function init() {
    //await mod(logger, options);
    if(options.sound)
        await audio(logger, options);
}

init();
