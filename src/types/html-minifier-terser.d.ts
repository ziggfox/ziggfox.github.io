declare module "html-minifier-terser" {
  export interface MinifyOptions {
    collapseWhitespace?: boolean;
    conservativeCollapse?: boolean;
    keepClosingSlash?: boolean;
    minifyCSS?: boolean;
    removeComments?: boolean;
    removeRedundantAttributes?: boolean;
    removeScriptTypeAttributes?: boolean;
    removeStyleLinkTypeAttributes?: boolean;
    sortAttributes?: boolean;
    sortClassName?: boolean;
  }

  export function minify(input: string, options?: MinifyOptions): Promise<string>;
}
