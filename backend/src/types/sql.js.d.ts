// Type declarations for modules without @types packages
declare module 'sql.js' {
  interface SqlJsStatic {
    Database: {
      new (): Database;
      new (data: ArrayLike<number> | Buffer | null): Database;
    };
  }

  interface Database {
    run(sql: string, params?: any[]): Database;
    exec(sql: string): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
    getRowsModified(): number;
  }

  interface Statement {
    bind(params?: any[]): boolean;
    step(): boolean;
    getAsObject(params?: any): Record<string, any>;
    free(): boolean;
    reset(): void;
  }

  interface QueryExecResult {
    columns: string[];
    values: any[][];
  }

  function initSqlJs(): Promise<SqlJsStatic>;
  export = initSqlJs;
}
