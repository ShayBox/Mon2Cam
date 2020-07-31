#!/usr/bin/env -S deno run

import { getOptions } from "./options.ts";

const options = getOptions(Deno.args);

console.log(options);
