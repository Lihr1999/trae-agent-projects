declare module 'koa-cors' {
  import { Middleware } from 'koa';

  interface CorsOptions {
    origin?: string | string[] | ((ctx: any) => string);
    methods?: string | string[];
    headers?: string | string[];
    exposeHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
  }

  function cors(options?: CorsOptions): Middleware;

  export = cors;
}
