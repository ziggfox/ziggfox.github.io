import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { minify } from "html-minifier-terser";
import { hydrateRemoteLinkMetadata } from "./metadata.ts";
import { renderMarkdownPage } from "./markdown.ts";
import { parseAndValidateSiteYaml, parseAndValidateSectionsYaml, resolveLinkPageData } from "./schema.ts";
import { renderPage } from "./template.ts";

const SITE_DATA_PATH = resolve("data/site.yaml");
const TEMPLATE_PATH = resolve("src/template.html");
const OUTPUT_PATH = resolve("dist/index.html");
const MARKDOWN_OUTPUT_PATH = resolve("dist/index.md");
const ROBOTS_OUTPUT_PATH = resolve("dist/robots.txt");
const SITEMAP_OUTPUT_PATH = resolve("dist/sitemap.xml");

export async function main(): Promise<void> {
  const [siteYamlSource, templateSource] = await Promise.all([
    readUtf8(SITE_DATA_PATH),
    readUtf8(TEMPLATE_PATH),
  ]);

  const siteData = parseAndValidateSiteYaml(siteYamlSource);
  const importedSections = await Promise.all(
    siteData.imports.map(async (importPath) => {
      const importedYamlSource = await readUtf8(resolve(dirname(SITE_DATA_PATH), importPath));
      return parseAndValidateSectionsYaml(importedYamlSource, importPath);
    }),
  );
  const draftData = {
    ...siteData,
    sections: importedSections.flatMap((item) => item.sections),
  };
  const hydratedData = await hydrateRemoteLinkMetadata(draftData);
  const data = resolveLinkPageData(hydratedData);
  const rendered = renderPage(templateSource, data);
  const minified = await minifyGeneratedHtml(rendered);
  const markdown = renderMarkdownPage(data);
  const robotsTxt = renderRobotsTxt(data.page.canonicalUrl);
  const sitemapXml = renderSitemapXml(data.page.canonicalUrl);

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await Promise.all([
    writeFile(OUTPUT_PATH, minified, "utf8"),
    writeFile(MARKDOWN_OUTPUT_PATH, markdown, "utf8"),
    writeFile(ROBOTS_OUTPUT_PATH, robotsTxt, "utf8"),
    writeFile(SITEMAP_OUTPUT_PATH, sitemapXml, "utf8"),
  ]);
  process.stdout.write(`Generated ${OUTPUT_PATH}\n`);
}

async function readUtf8(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

async function minifyGeneratedHtml(html: string): Promise<string> {
  return minify(html, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    keepClosingSlash: true,
    minifyCSS: true,
    removeComments: true,
    removeRedundantAttributes: false,
    removeScriptTypeAttributes: false,
    removeStyleLinkTypeAttributes: false,
    sortAttributes: false,
    sortClassName: false,
  });
}

function renderRobotsTxt(canonicalUrl: string): string {
  const siteUrl = normalizeSiteUrl(canonicalUrl);
  return ["User-agent: *", "Allow: /", `Sitemap: ${siteUrl}/sitemap.xml`, ""].join("\n");
}

function renderSitemapXml(canonicalUrl: string): string {
  const pageUrl = normalizePageUrl(canonicalUrl);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <url>",
    `    <loc>${escapeXml(pageUrl)}</loc>`,
    "  </url>",
    "</urlset>",
    "",
  ].join("\n");
}

function normalizeSiteUrl(canonicalUrl: string): string {
  const url = new URL(canonicalUrl);
  return `${url.origin}${url.pathname.replace(/\/$/u, "")}`;
}

function normalizePageUrl(canonicalUrl: string): string {
  const url = new URL(canonicalUrl);
  if (url.pathname === "/index.html") {
    url.pathname = "/";
  }
  return url.toString();
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

await main();
