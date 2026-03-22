import type { DraftLinkItem, DraftLinkPageData, DraftLinkSection } from "./schema.ts";

type RemoteMetadata = {
  title?: string;
  description?: string;
};

const HTML_CONTENT_TYPE_PATTERN = /text\/html|application\/xhtml\+xml/u;

export async function hydrateRemoteLinkMetadata(data: DraftLinkPageData): Promise<DraftLinkPageData> {
  const sections = await Promise.all(data.sections.map(hydrateSectionMetadata));
  return { ...data, sections };
}

async function hydrateSectionMetadata(section: DraftLinkSection): Promise<DraftLinkSection> {
  const links = await Promise.all(section.links.map(hydrateLinkMetadata));
  return { ...section, links };
}

async function hydrateLinkMetadata(link: DraftLinkItem): Promise<DraftLinkItem> {
  if (link.title && link.note) {
    return link;
  }

  const metadata = await fetchRemoteMetadata(link.url);
  return {
    ...link,
    title: link.title ?? metadata.title,
    note: link.note ?? metadata.description,
  };
}

async function fetchRemoteMetadata(url: string): Promise<RemoteMetadata> {
  if (!/^https?:\/\//u.test(url)) {
    return {};
  }

  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "linkmap/1.0",
      },
    });
    if (!response.ok) {
      return {};
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!HTML_CONTENT_TYPE_PATTERN.test(contentType)) {
      return {};
    }

    const html = await response.text();
    return {
      title: extractTitleTag(html),
      description: extractDescriptionMeta(html),
    };
  } catch {
    return {};
  }
}

function extractTitleTag(html: string): string | undefined {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu);
  return normalizeMetadataContent(match?.[1]);
}

function extractDescriptionMeta(html: string): string | undefined {
  const metaPattern = /<meta\b[^>]*>/giu;
  for (const tag of html.match(metaPattern) ?? []) {
    const attrs = parseMetaAttributes(tag);
    const name = (attrs.name ?? attrs.property ?? "").toLowerCase();
    if (name === "description" || name === "og:description" || name === "twitter:description") {
      return normalizeMetadataContent(attrs.content);
    }
  }
  return undefined;
}

function parseMetaAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gu;
  for (const match of tag.matchAll(attrPattern)) {
    const [, key, doubleQuoted, singleQuoted, unquoted] = match;
    attrs[key.toLowerCase()] = doubleQuoted ?? singleQuoted ?? unquoted ?? "";
  }
  return attrs;
}

function normalizeMetadataContent(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = decodeHtmlEntities(value.replace(/\s+/gu, " ").trim());
  return normalized.length > 0 ? normalized : undefined;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");
}
