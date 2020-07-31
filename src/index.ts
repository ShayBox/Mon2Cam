import { Logger } from "./logging.ts"
import { parseOptions } from "./options.ts";
import mod from "./mod.ts"

const options = parseOptions(Deno.args);
const logger = new Logger(options.verbosity);

mod(logger, options)

