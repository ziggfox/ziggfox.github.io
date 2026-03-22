export type PageMeta = {
  title: string;
  description: string;
  canonicalUrl: string;
  siteName: string;
  ogType: string;
  ogLocale: string;
  ogImageUrl: string;
  ogImageAlt: string;
  ogImageWidth: string;
  ogImageHeight: string;
  twitterCard: string;
  twitterSite?: string;
  twitterImageUrl: string;
  themeColor: string;
  faviconUrl: string;
};

export type HeroContent = {
  label: string;
  title: string;
  description: string;
  sectionNavAriaLabel: string;
};

export type FooterContent = {
  heading: string;
  operatorName: string;
  summary: string;
  policy: string;
  disclaimer: string;
  contactLabel: string;
  contactUrl: string;
  contactNote: string;
  copyright: string;
};

export type LinkItem = {
  title: string;
  url: string;
  note: string;
};

export type DraftLinkItem = {
  title?: string;
  url: string;
  note?: string;
};

export type LinkSection = {
  id: string;
  title: string;
  description: string;
  links: LinkItem[];
};

export type DraftLinkSection = {
  id: string;
  title: string;
  description: string;
  links: DraftLinkItem[];
};

export type LinkPageData = {
  page: PageMeta;
  hero: HeroContent;
  footer: FooterContent;
  sections: LinkSection[];
};

export type DraftLinkPageData = {
  page: PageMeta;
  hero: HeroContent;
  footer: FooterContent;
  sections: DraftLinkSection[];
};

export type DraftSiteData = {
  page: PageMeta;
  hero: HeroContent;
  footer: FooterContent;
  imports: string[];
};

export type DraftSectionsFileData = {
  sections: DraftLinkSection[];
};

type YamlLine = {
  number: number;
  indent: number;
  text: string;
};

const SECTION_ID_PATTERN = /^[a-z0-9-]+$/;

export function parseAndValidateSiteYaml(input: string): DraftSiteData {
  const lines = toYamlLines(input);
  if (lines.length === 0) {
    throw new Error("site.yaml が空です");
  }

  const page = parsePage(lines);
  const hero = parseHero(lines);
  const footer = parseFooter(lines);
  const imports = parseImports(lines);

  validatePageMeta(page);
  validateHeroContent(hero);
  validateFooterContent(footer);
  validateImports(imports);
  return { page, hero, footer, imports };
}

export function parseAndValidateSectionsYaml(
  input: string,
  fileLabel = "data/links.yaml",
): DraftSectionsFileData {
  const lines = toYamlLines(input);
  if (lines.length === 0) {
    throw new Error(`${fileLabel} が空です`);
  }

  const sections = parseSections(lines, fileLabel);
  validateDraftSections(sections);
  return { sections };
}

function toYamlLines(input: string): YamlLine[] {
  return input
    .split(/\r?\n/u)
    .map((rawLine, index) => {
      const withoutComment = rawLine.replace(/\s+#.*$/u, "");
      const trimmedEnd = withoutComment.replace(/\s+$/u, "");
      return {
        number: index + 1,
        indent: countIndent(trimmedEnd),
        text: trimmedEnd.trim(),
      };
    })
    .filter((line) => line.text.length > 0);
}

function countIndent(value: string): number {
  const match = value.match(/^ */u);
  return match?.[0].length ?? 0;
}

function parseImports(lines: YamlLine[]): string[] {
  const importsIndex = lines.findIndex((line) => line.indent === 0 && line.text === "imports:");
  if (importsIndex === -1) {
    throw new Error("site.yaml に imports: が必要です");
  }

  const imports: string[] = [];
  for (let index = importsIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.indent === 0) {
      break;
    }
    if (line.indent !== 2 || !line.text.startsWith("- ")) {
      throw new Error(`行 ${line.number}: imports 配下は '- links.yaml' 形式で記述してください`);
    }
    const value = parseScalar(line.text.slice(2).trim());
    if (value.length === 0) {
      throw new Error(`行 ${line.number}: imports の値が空です`);
    }
    imports.push(value);
  }

  return imports;
}

function parsePage(lines: YamlLine[]): PageMeta {
  const pageIndex = lines.findIndex((line) => line.indent === 0 && line.text === "page:");
  if (pageIndex === -1) {
    throw new Error("site.yaml に page: が必要です");
  }

  const page: Partial<PageMeta> = {};
  for (let index = pageIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.indent === 0) {
      break;
    }
    if (line.indent !== 2) {
      throw new Error(`行 ${line.number}: page 配下のインデントが不正です`);
    }
    applyKeyValue(line, page, "page");
  }

  assertRequiredString(page.title, "page.title は必須です");
  assertRequiredString(page.description, "page.description は必須です");
  assertRequiredString(page.canonicalUrl, "page.canonicalUrl は必須です");
  assertRequiredString(page.siteName, "page.siteName は必須です");
  assertRequiredString(page.ogImageUrl, "page.ogImageUrl は必須です");
  assertRequiredString(page.twitterImageUrl, "page.twitterImageUrl は必須です");
  assertRequiredString(page.themeColor, "page.themeColor は必須です");
  assertRequiredString(page.faviconUrl, "page.faviconUrl は必須です");

  return {
    title: page.title,
    description: page.description,
    canonicalUrl: page.canonicalUrl,
    siteName: page.siteName,
    ogType: page.ogType ?? "website",
    ogLocale: page.ogLocale ?? "ja_JP",
    ogImageUrl: page.ogImageUrl,
    ogImageAlt: page.ogImageAlt ?? `${page.title} のOGP画像`,
    ogImageWidth: page.ogImageWidth ?? "1200",
    ogImageHeight: page.ogImageHeight ?? "630",
    twitterCard: page.twitterCard ?? "summary_large_image",
    twitterSite: page.twitterSite,
    twitterImageUrl: page.twitterImageUrl,
    themeColor: page.themeColor,
    faviconUrl: page.faviconUrl,
  };
}

function parseHero(lines: YamlLine[]): HeroContent {
  const heroIndex = lines.findIndex((line) => line.indent === 0 && line.text === "hero:");
  if (heroIndex === -1) {
    throw new Error("site.yaml に hero: が必要です");
  }

  const hero: Partial<HeroContent> = {};
  for (let index = heroIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.indent === 0) {
      break;
    }
    if (line.indent !== 2) {
      throw new Error(`行 ${line.number}: hero 配下のインデントが不正です`);
    }
    applyKeyValue(line, hero, "hero");
  }

  assertRequiredString(hero.label, "hero.label は必須です");
  assertRequiredString(hero.title, "hero.title は必須です");
  assertRequiredString(hero.description, "hero.description は必須です");

  return {
    label: hero.label,
    title: hero.title,
    description: hero.description,
    sectionNavAriaLabel: hero.sectionNavAriaLabel ?? "カテゴリ一覧",
  };
}

function parseFooter(lines: YamlLine[]): FooterContent {
  const footerIndex = lines.findIndex((line) => line.indent === 0 && line.text === "footer:");
  if (footerIndex === -1) {
    throw new Error("site.yaml に footer: が必要です");
  }

  const footer: Partial<FooterContent> = {};
  for (let index = footerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.indent === 0) {
      break;
    }
    if (line.indent !== 2) {
      throw new Error(`行 ${line.number}: footer 配下のインデントが不正です`);
    }
    applyKeyValue(line, footer, "footer");
  }

  assertRequiredString(footer.heading, "footer.heading は必須です");
  assertRequiredString(footer.operatorName, "footer.operatorName は必須です");
  assertRequiredString(footer.summary, "footer.summary は必須です");
  assertRequiredString(footer.policy, "footer.policy は必須です");
  assertRequiredString(footer.disclaimer, "footer.disclaimer は必須です");
  assertRequiredString(footer.contactLabel, "footer.contactLabel は必須です");
  assertRequiredString(footer.contactUrl, "footer.contactUrl は必須です");
  assertRequiredString(footer.contactNote, "footer.contactNote は必須です");
  assertRequiredString(footer.copyright, "footer.copyright は必須です");

  return {
    heading: footer.heading,
    operatorName: footer.operatorName,
    summary: footer.summary,
    policy: footer.policy,
    disclaimer: footer.disclaimer,
    contactLabel: footer.contactLabel,
    contactUrl: footer.contactUrl,
    contactNote: footer.contactNote,
    copyright: footer.copyright,
  };
}

function parseSections(lines: YamlLine[], fileLabel: string): DraftLinkSection[] {
  const sectionsIndex = lines.findIndex((line) => line.indent === 0 && line.text === "sections:");
  if (sectionsIndex === -1) {
    throw new Error(`${fileLabel} に sections: が必要です`);
  }

  const sections: DraftLinkSection[] = [];
  let currentSection: Partial<DraftLinkSection> | null = null;
  let currentLinks: DraftLinkItem[] | null = null;
  let currentLink: Partial<DraftLinkItem> | null = null;

  for (const line of lines.slice(sectionsIndex + 1)) {
    if (line.indent === 0) {
      break;
    }

    if (line.indent === 2 && line.text.startsWith("- ")) {
      finalizeLink(line.number);
      finalizeSection(line.number);
      currentSection = {};
      currentLinks = null;
      applyKeyValue(line, currentSection, "section");
      continue;
    }

    if (!currentSection) {
      throw new Error(`行 ${line.number}: sections の要素を '- id: ...' 形式で開始してください`);
    }

    if (line.indent === 4 && line.text === "links:") {
      currentLinks = [];
      currentSection.links = currentLinks;
      continue;
    }

    if (line.indent === 6 && line.text.startsWith("- ")) {
      if (!currentLinks) {
        throw new Error(`行 ${line.number}: links: より前にリンク項目は書けません`);
      }
      finalizeLink(line.number);
      currentLink = {};
      currentLinks.push(currentLink as DraftLinkItem);
      applyKeyValue(line, currentLink, "link");
      continue;
    }

    if (line.indent === 4) {
      if (currentLinks) {
        throw new Error(`行 ${line.number}: links 配下のインデントが不正です`);
      }
      applyKeyValue(line, currentSection, "section");
      continue;
    }

    if (line.indent === 8) {
      if (!currentLink) {
        throw new Error(`行 ${line.number}: リンク項目の開始前にプロパティは書けません`);
      }
      applyKeyValue(line, currentLink, "link");
      continue;
    }

    throw new Error(`行 ${line.number}: 解釈できない YAML 構造です`);
  }

  finalizeLink(lines.at(-1)?.number ?? 0);
  finalizeSection(lines.at(-1)?.number ?? 0);
  return sections;

  function finalizeLink(lineNumber: number): void {
    if (!currentLink) {
      return;
    }
    assertRequiredString(currentLink.url, `行 ${lineNumber}: links[].url は必須です`);
    currentLink = null;
  }

  function finalizeSection(lineNumber: number): void {
    if (!currentSection) {
      return;
    }
    assertRequiredString(currentSection.id, `行 ${lineNumber}: sections[].id は必須です`);
    assertRequiredString(currentSection.title, `行 ${lineNumber}: sections[].title は必須です`);
    assertRequiredString(
      currentSection.description,
      `行 ${lineNumber}: sections[].description は必須です`,
    );
    if (!currentSection.links || currentSection.links.length === 0) {
      throw new Error(`行 ${lineNumber}: sections[].links は1件以上必要です`);
    }
    sections.push(currentSection as DraftLinkSection);
    currentSection = null;
    currentLinks = null;
  }
}

function applyKeyValue(
  line: YamlLine,
  target:
    | Partial<PageMeta>
    | Partial<HeroContent>
    | Partial<FooterContent>
    | Partial<LinkSection>
    | Partial<LinkItem>,
  kind: "page" | "hero" | "footer" | "section" | "link",
): void {
  const content = line.text.startsWith("- ") ? line.text.slice(2) : line.text;
  const separatorIndex = content.indexOf(":");
  if (separatorIndex === -1) {
    throw new Error(`行 ${line.number}: key: value 形式で記述してください`);
  }

  const key = content.slice(0, separatorIndex).trim();
  const rawValue = content.slice(separatorIndex + 1).trim();
  if (rawValue.length === 0) {
    throw new Error(`行 ${line.number}: ${kind}.${key} の値が空です`);
  }

  (target as Record<string, string>)[key] = parseScalar(rawValue);
}

function parseScalar(rawValue: string): string {
  if (
    (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'"))
  ) {
    return rawValue.slice(1, -1);
  }
  return rawValue;
}

function assertRequiredString(value: string | undefined, message: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(message);
  }
}

function validateImports(imports: string[]): void {
  if (imports.length === 0) {
    throw new Error("imports は1件以上必要です");
  }

  const uniqueImports = new Set<string>();
  for (const importPath of imports) {
    assertRequiredString(importPath, "imports の要素は空文字にできません");
    if (uniqueImports.has(importPath)) {
      throw new Error(`imports '${importPath}' が重複しています`);
    }
    uniqueImports.add(importPath);
  }
}

function formatLinkErrorContext(
  section: Pick<LinkSection, "id"> | Pick<DraftLinkSection, "id">,
  link: Pick<LinkItem, "title" | "url"> | Pick<DraftLinkItem, "title" | "url">,
  index: number,
): string {
  const details = [`section=${section.id}`, `linkIndex=${index}`];
  if (typeof link.title === "string" && link.title.trim().length > 0) {
    details.push(`title=${link.title}`);
  }
  if (typeof link.url === "string" && link.url.trim().length > 0) {
    details.push(`url=${link.url}`);
  }
  return details.join(", ");
}

function validateSections(sections: LinkSection[]): void {
  if (sections.length === 0) {
    throw new Error("sections は1件以上必要です");
  }

  const ids = new Set<string>();
  for (const section of sections) {
    if (!SECTION_ID_PATTERN.test(section.id)) {
      throw new Error(`sections[].id '${section.id}' は英小文字・数字・ハイフンのみ使用できます`);
    }
    if (ids.has(section.id)) {
      throw new Error(`sections[].id '${section.id}' が重複しています`);
    }
    ids.add(section.id);

    for (const [index, link] of section.links.entries()) {
      const context = formatLinkErrorContext(section, link, index);
      assertRequiredString(link.title, `sections[].links[].title が空です: ${context}`);
      assertRequiredString(link.url, `sections[].links[].url が空です: ${context}`);
      assertRequiredString(link.note, `sections[].links[].note が空です: ${context}`);
    }
  }
}

function validateDraftSections(sections: DraftLinkSection[]): void {
  if (sections.length === 0) {
    throw new Error("sections は1件以上必要です");
  }

  const ids = new Set<string>();
  for (const section of sections) {
    if (!SECTION_ID_PATTERN.test(section.id)) {
      throw new Error(`sections[].id '${section.id}' は英小文字・数字・ハイフンのみ使用できます`);
    }
    if (ids.has(section.id)) {
      throw new Error(`sections[].id '${section.id}' が重複しています`);
    }
    ids.add(section.id);

    for (const [index, link] of section.links.entries()) {
      const context = formatLinkErrorContext(section, link, index);
      assertRequiredString(link.url, `sections[].links[].url が空です: ${context}`);
    }
  }
}

export function resolveLinkPageData(data: DraftLinkPageData): LinkPageData {
  const sections: LinkSection[] = data.sections.map((section) => ({
    ...section,
    links: section.links.map((link, index) => {
      const context = formatLinkErrorContext(section, link, index);
      assertRequiredString(link.title, `sections[].links[].title が空です: ${context}`);
      assertRequiredString(link.url, `sections[].links[].url が空です: ${context}`);
      assertRequiredString(link.note, `sections[].links[].note が空です: ${context}`);
      return {
        title: link.title,
        url: link.url,
        note: link.note,
      };
    }),
  }));

  validateSections(sections);
  return {
    page: data.page,
    hero: data.hero,
    footer: data.footer,
    sections,
  };
}

function validatePageMeta(page: PageMeta): void {
  assertRequiredString(page.title, "page.title が空です");
  assertRequiredString(page.description, "page.description が空です");
  assertRequiredString(page.canonicalUrl, "page.canonicalUrl が空です");
  assertRequiredString(page.siteName, "page.siteName が空です");
  assertRequiredString(page.ogType, "page.ogType が空です");
  assertRequiredString(page.ogImageUrl, "page.ogImageUrl が空です");
  assertRequiredString(page.twitterCard, "page.twitterCard が空です");
  assertRequiredString(page.twitterImageUrl, "page.twitterImageUrl が空です");
  assertRequiredString(page.themeColor, "page.themeColor が空です");
  assertRequiredString(page.faviconUrl, "page.faviconUrl が空です");
}

function validateFooterContent(footer: FooterContent): void {
  assertRequiredString(footer.heading, "footer.heading が空です");
  assertRequiredString(footer.operatorName, "footer.operatorName が空です");
  assertRequiredString(footer.summary, "footer.summary が空です");
  assertRequiredString(footer.policy, "footer.policy が空です");
  assertRequiredString(footer.disclaimer, "footer.disclaimer が空です");
  assertRequiredString(footer.contactLabel, "footer.contactLabel が空です");
  assertRequiredString(footer.contactUrl, "footer.contactUrl が空です");
  assertRequiredString(footer.contactNote, "footer.contactNote が空です");
  assertRequiredString(footer.copyright, "footer.copyright が空です");
}

function validateHeroContent(hero: HeroContent): void {
  assertRequiredString(hero.label, "hero.label が空です");
  assertRequiredString(hero.title, "hero.title が空です");
  assertRequiredString(hero.description, "hero.description が空です");
  assertRequiredString(hero.sectionNavAriaLabel, "hero.sectionNavAriaLabel が空です");
}
