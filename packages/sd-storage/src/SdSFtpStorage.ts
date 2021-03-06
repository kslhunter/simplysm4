import { ISdFtpConnectionConfig, ISdStorage } from "./commons";
import * as SFtpClient from "ssh2-sftp-client";

export class SdSFtpStorage implements ISdStorage {
  private _sftp?: SFtpClient;

  public async connectAsync(connectionConfig: ISdFtpConnectionConfig): Promise<void> {
    this._sftp = new SFtpClient();
    await this._sftp.connect({
      host: connectionConfig.host,
      port: connectionConfig.port,
      username: connectionConfig.username,
      password: connectionConfig.password
    });
  }

  public async mkdirAsync(storageDirPath: string): Promise<void> {
    await this._sftp!.mkdir(storageDirPath, true);
  }

  public async renameAsync(fromPath: string, toPath: string): Promise<void> {
    await this._sftp!.rename(fromPath, toPath);
  }

  public async putAsync(localPathOrBuffer: string | Buffer, storageFilePath: string): Promise<void> {
    if (typeof localPathOrBuffer === "string") {
      await this._sftp!.fastPut(localPathOrBuffer, storageFilePath);
    }
    else {
      await this._sftp!.put(localPathOrBuffer, storageFilePath);
    }
  }

  public async uploadDirAsync(fromPath: string, toPath: string): Promise<void> {
    await this._sftp!.uploadDir(fromPath, toPath);
  }

  public async closeAsync(): Promise<void> {
    await this._sftp!.end();
  }
}
