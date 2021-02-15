import {exec} from "../libraries/exec.ts";
import {readStdin, checkDependency, checkResolution} from "../libraries/utility.ts";
import {Logger, Color, wrap} from "../libraries/logging.ts";
import type Options from "../libraries/options.ts";

interface XMonitorInfo {
    index: string;
    name: string;
    height: number;
    width: number;
    x: string;
    y: string;
}

function getMonitorInfo(xrandr: string): XMonitorInfo {
    const regexGroups = /([\d]+): \+[\*]?([\d\w\-\.]+) ([\d]+)\/([\d]+)x([\d]+)\/([\d]+)\+([\d]+)\+([\d]+)/.exec(xrandr);
    if (!regexGroups || regexGroups.length < 7) {
        throw new Error("Xrandr output has changed and this code needs updated");
    }

    return {
        index: regexGroups[1],
        name: regexGroups[2],
        height: parseInt(regexGroups[5], 10),
        width: parseInt(regexGroups[3], 10),
        x: regexGroups[7],
        y: regexGroups[8],
    };
}

export default async function (options: Options, logger: Logger) {
    await checkDependency("xrandr", logger);
    await checkDependency("ffmpeg", logger);

    const {output} = await exec("xrandr --listactivemonitors", {output: 2});
    const lines = output.split("\n").slice(1);

    if (typeof options.monitor !== "number") {
        const monitors = lines.map((line) => getMonitorInfo(line));

        if (monitors.length <= 1) {
            options.monitor = 0;
            return;
        }

        for (const monitor of monitors) {
            logger.log(
                `${wrap(Color.yellow, monitor.index)}: ${monitor.width}x${monitor.height} ${wrap(Color.dim, monitor.name)}`
            );
        }
        logger.log("Which monitor?", Color.yellow);

        const monitor = parseInt(await readStdin(), 10);
        if (isNaN(monitor)) {
            logger.panic("Input not a number");
        }

        const monitorCount = output.split("\n").length - 2;
        if (monitor < 0 || monitor > monitorCount) {
            logger.panic("Input not a monitor");
        }

        options.monitor = monitor;
    }

    const monitor = getMonitorInfo(lines[options.monitor]);
    const display = Deno.env.get("DISPLAY");
    if (!display) {
        logger.panic("Display env variable not defined, are you even using X?");
        return;
    }

    if (options.resolution) {
        const split = options.resolution.split(":");
        const width = split[0];
        const height = split[1];
        if (options.border) {
            options.ffmpeg.push(
                `-vf scale=${options.resolution}:force_original_aspect_ratio=decrease,pad=${width}:${height}:x=(${width}-iw)/2:y=(${height}-ih)/2`
            );
        } else {
            options.ffmpeg.push(`-vf scale=${options.resolution}`);
        }
    }

    checkResolution(logger, monitor.width, monitor.height);

    let enableHwEnc = false;

    if (options.hwEncoder) {
        //check if hw encoding is supported


        //get encoders supported by systm
        let output = (await exec("ffmpeg -hwaccels")).output;
        let supportredEncoders = output.split("\n").slice(1)

        //check if the specified encoder is supported
        if (supportredEncoders.indexOf(options.hwEncoder) < 0) {
            logger.panic(`Hardware encoder ${options.hwEncoder} is not supported. Aborting.`);
            return;
        }
        enableHwEnc = true;
    }

    logger.info("CTRL + C to stop");
    logger.info("The screen will look mirrored for you, not others");

    const commandLines = [
        "ffmpeg",
        "-f x11grab",
        `-r ${options.framerate}`,
        `-s ${monitor.width}x${monitor.height}`,
        `-i ${display}+${monitor.x},${monitor.y}`,
        ...options.ffmpeg,
        "-pix_fmt yuv420p",
        "-f v4l2",
        `/dev/video${options.device}`,
    ];

    //insert the hardware encoder
    if (enableHwEnc){
        commandLines.splice(1,0, `-hwaccel ${options.hwEncoder}`);
        logger.debug("Using specified hardware encoder");
    }

    let result = await exec(commandLines.join(" "), options.execOptions);
    if (!result.status.success) logger.panic("X11 backend exited with an error.");
}
