import { EventEmitter } from "events";
import { IQueryColumnDef } from "@simplysm/sd-orm-common";

export interface IDbConnection extends EventEmitter {
  dialect: "mysql" | "mssql" | "mssql-azure";
  isConnected: boolean;
  isOnTransaction: boolean;

  connectAsync(): Promise<void>;

  closeAsync(): Promise<void>;

  beginTransactionAsync(): Promise<void>;

  commitTransactionAsync(): Promise<void>;

  rollbackTransactionAsync(): Promise<void>;

  executeAsync(queries: string[]): Promise<any[][]>;

  bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], ...records: Record<string, any>[]): Promise<void>;
}
