import c from 'https://deno.land/x/color/index.ts'

export enum Verbosity {
    Default,
    Verbose
}

enum LogType {
    Info,
    Warning,
    Error,
    Debug,
    Log
}

export class Logger {
    verbosity: Verbosity;

    constructor(verbosity: Verbosity) {
        this.verbosity = verbosity;
    }

    output(msg: string, type: LogType) : void {
        if(this.verbosity == Verbosity.Verbose && type == LogType.Debug) {
            console.log(msg);
        }
        else if(type != LogType.Debug) {
            console.log(msg);
        }
    }
    
    public info(msg: string) : void {this.output(c.blue.text("INFO") + c.reset.text(" ") + msg, LogType.Info);}
    public warn(msg: string) : void {this.output(c.yellow.text("WARN") + c.reset.text(" ") + msg, LogType.Warning);}
    public error(msg: string) : void {this.output(c.red.text("ERROR") + c.reset.text(" ") + msg, LogType.Error);}
    public debug(msg: string) : void {this.output(c.magenta.text("DEBUG") + c.reset.text(" ") + msg, LogType.Debug);}
    public log(msg: string) : void {this.output(msg, LogType.Log);}
}