import { DateTime, DeepPartial, MathUtil, ObjectUtil } from "@simplysm/sd-core-common";
import * as path from "path";
import { FsUtil } from "./FsUtil";
import * as os from "os";
import CpuUsage = NodeJS.CpuUsage;

export enum LoggerStyle {
  clear = "\x1b[0m",

  fgGray = "\x1b[90m",
  fgBlack = "\x1b[30m",
  fgWhite = "\x1b[37m",

  fgRed = "\x1b[31m",
  fgGreen = "\x1b[32m",
  fgYellow = "\x1b[33m",
  fgBlue = "\x1b[34m",
  fgMagenta = "\x1b[35m",
  fgCyan = "\x1b[36m",

  bgBlack = "\x1b[40m\x1b[97m",
  bgRed = "\x1b[41m\x1b[97m",
  bgGreen = "\x1b[42m\x1b[97m",
  bgYellow = "\x1b[43m\x1b[97m",
  bgBlue = "\x1b[44m\x1b[97m",
  bgMagenta = "\x1b[45m\x1b[97m",
  bgWhite = "\x1b[46m\x1b[97m"
}

export enum LoggerSeverity {
  debug = "debug",
  log = "log",
  info = "info",
  warn = "warn",
  error = "error",
  none = ""
}

export interface ILoggerConfig {
  dot: boolean;

  console: {
    style: LoggerStyle;
    level: LoggerSeverity;
    styles: {
      debug: LoggerStyle;
      log: LoggerStyle;
      info: LoggerStyle;
      warn: LoggerStyle;
      error: LoggerStyle;
    };
  };

  file: {
    level: LoggerSeverity;
    outDir: string;
    maxBytes?: number;
  };
}

export interface ILoggerHistory {
  datetime: DateTime;
  group: string[];
  severity: LoggerSeverity;
  logs: any[];
}

export class Logger {
  private static readonly _configs = new Map<string, DeepPartial<ILoggerConfig>>();
  private static _historyLength = 0;

  private readonly _randomForStyle = MathUtil.getRandomInt(4, 9);

  public static get(group: string[] = []): Logger {
    return new Logger(group);
  }

  public static setConfig(group: string[], config: DeepPartial<ILoggerConfig>): void;
  public static setConfig(config: DeepPartial<ILoggerConfig>): void;
  public static setConfig(arg1: string[] | DeepPartial<ILoggerConfig>, arg2?: DeepPartial<ILoggerConfig>): void {
    const group = (arg2 !== undefined ? arg1 : []) as string[];
    const config = (arg2 !== undefined ? arg2 : arg1) as DeepPartial<ILoggerConfig>;

    Logger._configs.set(group.join("_"), config);
  }

  public static restoreConfig(): void {
    Logger._configs.clear();
  }

  public static setHistoryLength(len: number): void {
    Logger._historyLength = len;
  }

  public static history: ILoggerHistory[] = [];


  private constructor(private readonly _group: string[]) {
  }

  private _prevDebugCpuUsage?: CpuUsage;

  public debug(...args: any[]): void {
    if (this._prevDebugCpuUsage) {
      const usage = process.cpuUsage(this._prevDebugCpuUsage);
      this._write(LoggerSeverity.debug, [
        "[" + Math.floor((usage.user + usage.system) / 1000).toLocaleString() + "ms/cpu]",
        ...args
      ]);
    }
    else {
      this._write(LoggerSeverity.debug, args);
    }
    this._prevDebugCpuUsage = process.cpuUsage();
  }

  public log(...args: any[]): void {
    this._write(LoggerSeverity.log, args);
  }

  public info(...args: any[]): void {
    this._write(LoggerSeverity.info, args);
  }

  public warn(...args: any[]): void {
    this._write(LoggerSeverity.warn, args);
  }

  public error(...args: any[]): void {
    this._write(LoggerSeverity.error, args);
  }

  private _write(severity: LoggerSeverity, logs: any[]): void {
    const config = this._getConfig();
    const now = new DateTime();

    const severityIndex = Object.values(LoggerSeverity).indexOf(severity);
    const consoleLevelIndex = Object.values(LoggerSeverity).indexOf(config.console.level);
    const fileLevelIndex = Object.values(LoggerSeverity).indexOf(config.file.level);

    if (severityIndex >= consoleLevelIndex) {
      if (typeof process.stdout.clearLine === "function") {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
      }

      // eslint-disable-next-line no-console
      console.log(
        LoggerStyle.fgGray + now.toFormatString("yyyy-MM-dd HH:mm:ss.fff") + " "
        + (this._group.length > 0 ? config.console.style + "[" + this._group.join(".") + "] " : "")
        + config.console.styles[severity] + severity.toUpperCase().padStart(5, " "),
        ...logs.map((log) => ((log instanceof Error && log.stack !== undefined) ? log.stack : log)),
        LoggerStyle.clear
      );
    }
    else if (config.dot) {
      process.stdout.write(".");
    }

    if (severityIndex >= fileLevelIndex) {
      let text = now.toFormatString("yyyy-MM-dd HH:mm:ss.fff") + " ";
      text += (this._group.length > 0 ? "[" + this._group.join(".") + "] " : "");
      text += severity.toUpperCase().padStart(5, " ") + os.EOL;

      for (const log of logs) {
        let convertedLog = log;
        // 색상빼기
        if (typeof convertedLog === "string") {
          convertedLog = convertedLog.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
        }
        else if (typeof convertedLog.toString === "function" && !(/^\[.*]$/).test(convertedLog.toString())) {
          convertedLog = convertedLog.toString();
        }
        else {
          convertedLog = JSON.stringify(convertedLog);
        }

        text += convertedLog + os.EOL;
      }


      const outPath = path.resolve(config.file.outDir, now.toFormatString("yyyyMMdd"));
      FsUtil.mkdirs(outPath);

      const fileNames = FsUtil.readdir(outPath);
      const lastFileSeq = fileNames
        .filter((fileName) => fileName.endsWith(".log"))
        .map((fileName) => Number(path.basename(fileName, path.extname(fileName))))
        .filter((item) => !Number.isNaN(item))
        .max();

      let logFileName = "1.log";
      if (lastFileSeq !== undefined) {
        const lstat = FsUtil.lstat(path.resolve(outPath, lastFileSeq + ".log"));
        if (lstat.size > (config.file.maxBytes ?? 500 * 1000)) {
          logFileName = (lastFileSeq + 1).toString() + ".log";
        }
        else {
          logFileName = lastFileSeq + ".log";
        }
      }
      const logFilePath = path.resolve(outPath, logFileName);
      if (FsUtil.exists(logFilePath)) {
        FsUtil.appendFile(logFilePath, text);
      }
      else {
        FsUtil.writeFile(logFilePath, text);
      }
    }

    if (Logger._historyLength > 0) {
      Logger.history.push({
        datetime: now,
        group: this._group,
        severity,
        logs
      });

      while (Logger.history.length > Logger._historyLength) {
        Logger.history.remove(Logger.history[0]);
      }
    }
  }

  private _getConfig(): ILoggerConfig {
    let config: ILoggerConfig = {
      dot: false,

      console: {
        style: LoggerStyle[Object.keys(LoggerStyle)[this._randomForStyle]],
        level: LoggerSeverity.log,
        styles: {
          debug: LoggerStyle.fgGray,
          log: LoggerStyle.clear,
          info: LoggerStyle.fgCyan,
          warn: LoggerStyle.fgYellow,
          error: LoggerStyle.fgRed
        }
      },

      file: {
        level: LoggerSeverity.none,
        outDir: path.resolve(process.cwd(), "_logs"),
        maxBytes: 300 * 1000
      }
    };

    const currGroup: string[] = [];
    config = ObjectUtil.merge(config, Logger._configs.get(currGroup.join("_")));
    for (const groupItem of this._group) {
      currGroup.push(groupItem);

      if (Logger._configs.has(currGroup.join("_"))) {
        config = ObjectUtil.merge(config, Logger._configs.get(currGroup.join("_")));
      }
    }

    return config;
  }
}
