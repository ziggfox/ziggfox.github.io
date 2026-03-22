import type { FooterContent, LinkItem, LinkPageData, LinkSection } from "./schema.ts";

export function renderMarkdownPage(data: LinkPageData): string {
  const lines: string[] = [
    `# ${data.hero.title}`,
    "",
    data.hero.description,
    "",
    `- 公開URL: ${data.page.canonicalUrl}`,
    `- 説明: ${data.page.description}`,
    "",
    "## カテゴリ一覧",
    "",
    ...data.sections.map((section) => `- [${section.title}](#${section.id})`),
    "",
    ...renderSections(data.sections),
    ...renderFooter(data.footer),
  ];

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderSections(sections: LinkSection[]): string[] {
  return sections.flatMap((section, index) => {
    const sectionLines = renderSectionMarkdown(section);
    return index === sections.length - 1 ? sectionLines : [...sectionLines, ""];
  });
}

function renderSectionMarkdown(section: LinkSection): string[] {
  return [
    `## ${section.title}`,
    "",
    `<a id="${section.id}"></a>`,
    "",
    section.description,
    "",
    ...section.links.flatMap(renderLinkMarkdown),
  ];
}

function renderLinkMarkdown(link: LinkItem): string[] {
  return [`- [${escapeMarkdown(link.title)}](${link.url})`, `  - ${link.note}`];
}

function renderFooter(footer: FooterContent): string[] {
  return [
    "",
    "## このサイトについて",
    "",
    `- 運営者: ${footer.operatorName}`,
    `- 概要: ${footer.summary}`,
    `- 掲載方針: ${footer.policy}`,
    `- ご利用上の注意: ${footer.disclaimer}`,
    `- 連絡先: [${escapeMarkdown(footer.contactLabel)}](${footer.contactUrl})`,
    `- 連絡先補足: ${footer.contactNote}`,
    "",
    footer.copyright,
  ];
}

function escapeMarkdown(value: string): string {
  return value.replaceAll("[", "\\[").replaceAll("]", "\\]");
}
