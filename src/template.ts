import type {
  FooterContent,
  HeroContent,
  LinkItem,
  LinkPageData,
  LinkSection,
  PageMeta,
} from "./schema.ts";

const PAGE_META_START = "<!-- @generated:page-meta:start -->";
const PAGE_META_END = "<!-- @generated:page-meta:end -->";
const HERO_CONTENT_START = "<!-- @generated:hero-content:start -->";
const HERO_CONTENT_END = "<!-- @generated:hero-content:end -->";
const FOOTER_CONTENT_START = "<!-- @generated:footer-content:start -->";
const FOOTER_CONTENT_END = "<!-- @generated:footer-content:end -->";
const LINK_SECTIONS_START = "<!-- @generated:link-sections:start -->";
const LINK_SECTIONS_END = "<!-- @generated:link-sections:end -->";

export function renderPage(template: string, data: LinkPageData): string {
  const generatedDate = formatBuildDate(new Date());
  const pageMeta = renderPageMeta(data.page);
  const heroContent = renderHeroContent(data.hero, data.sections);
  const footerContent = renderFooterContent(data.footer, generatedDate);
  const linkSections = renderLinkSections(data.sections);

  const withMeta = replaceGeneratedBlock(template, PAGE_META_START, PAGE_META_END, pageMeta);
  const withHero = replaceGeneratedBlock(withMeta, HERO_CONTENT_START, HERO_CONTENT_END, heroContent);
  const withFooter = replaceGeneratedBlock(withHero, FOOTER_CONTENT_START, FOOTER_CONTENT_END, footerContent);
  return replaceGeneratedBlock(withFooter, LINK_SECTIONS_START, LINK_SECTIONS_END, linkSections);
}

export function renderPageMeta(page: PageMeta): string {
  const structuredData = renderStructuredData(page);

  return [
    `  <title>${escapeHtml(page.title)}</title>`,
    `  <meta name="description" content="${escapeHtml(page.description)}" />`,
    '  <meta name="robots" content="index,follow" />',
    '  <meta name="format-detection" content="telephone=no,address=no,email=no" />',
    `  <meta name="theme-color" content="${escapeHtml(page.themeColor)}" />`,
    '  <meta name="apple-mobile-web-app-capable" content="yes" />',
    '  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
    '  <meta name="mobile-web-app-capable" content="yes" />',
    `  <link rel="canonical" href="${escapeHtml(page.canonicalUrl)}" />`,
    `  <link rel="icon" href="${escapeHtml(page.faviconUrl)}" />`,
    `  <link rel="apple-touch-icon" href="${escapeHtml(page.faviconUrl)}" />`,
    "",
    `  <meta property="og:type" content="${escapeHtml(page.ogType)}" />`,
    `  <meta property="og:locale" content="${escapeHtml(page.ogLocale)}" />`,
    `  <meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `  <meta property="og:description" content="${escapeHtml(page.description)}" />`,
    `  <meta property="og:url" content="${escapeHtml(page.canonicalUrl)}" />`,
    `  <meta property="og:site_name" content="${escapeHtml(page.siteName)}" />`,
    `  <meta property="og:image" content="${escapeHtml(page.ogImageUrl)}" />`,
    `  <meta property="og:image:alt" content="${escapeHtml(page.ogImageAlt)}" />`,
    `  <meta property="og:image:width" content="${escapeHtml(page.ogImageWidth)}" />`,
    `  <meta property="og:image:height" content="${escapeHtml(page.ogImageHeight)}" />`,
    "",
    `  <meta name="twitter:card" content="${escapeHtml(page.twitterCard)}" />`,
    ...(page.twitterSite ? [`  <meta name="twitter:site" content="${escapeHtml(page.twitterSite)}" />`] : []),
    `  <meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
    `  <meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
    `  <meta name="twitter:image" content="${escapeHtml(page.twitterImageUrl)}" />`,
    `  <meta name="twitter:image:alt" content="${escapeHtml(page.ogImageAlt)}" />`,
    `  <script type="application/ld+json">${escapeScriptTag(structuredData)}</script>`,
  ].join("\n");
}

export function renderStructuredData(page: PageMeta): string {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: page.siteName,
        url: page.canonicalUrl,
        inLanguage: toLanguageTag(page.ogLocale),
        description: page.description,
      },
      {
        "@type": "CollectionPage",
        name: page.title,
        url: page.canonicalUrl,
        inLanguage: toLanguageTag(page.ogLocale),
        description: page.description,
        isPartOf: {
          "@type": "WebSite",
          name: page.siteName,
          url: page.canonicalUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "ホーム",
            item: page.canonicalUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "リンク集",
            item: page.canonicalUrl,
          },
        ],
      },
    ],
  };

  return JSON.stringify(data);
}

export function renderSectionNav(sections: LinkSection[], ariaLabel = "カテゴリ一覧"): string {
  const items = sections
    .map((section) => `            <li><a href="#${escapeHtml(section.id)}">${escapeHtml(section.title)}</a></li>`)
    .join("\n");

  return [
    `        <nav class="section-nav" aria-label="${escapeHtml(ariaLabel)}">`,
    "          <ul>",
    items,
    "          </ul>",
    "        </nav>",
  ].join("\n");
}

export function renderHeroContent(hero: HeroContent, sections: LinkSection[]): string {
  const sectionNav = renderSectionNav(sections, hero.sectionNavAriaLabel);
  return [
    `        <p class="hero-label">${escapeHtml(hero.label)}</p>`,
    `        <h1 class="site-title">${escapeHtml(hero.title)}</h1>`,
    `        <p class="site-description">${escapeHtml(hero.description)}</p>`,
    "",
    sectionNav,
  ].join("\n");
}

export function renderFooterContent(footer: FooterContent, updatedAt: string): string {
  const contactDomain = getLinkLabel(footer.contactUrl);
  const contactUrl = isExternalUrl(footer.contactUrl)
    ? contactDomain
    : footer.contactUrl.replace(/^mailto:/u, "");

  return [
    `        <section class="trust-section" aria-labelledby="trust-heading">`,
    `          <div class="trust-heading-row">`,
    `            <h2 id="trust-heading" class="trust-title">${escapeHtml(footer.heading)}</h2>`,
    `            <p class="trust-updated">最終更新: <time datetime="${escapeHtml(updatedAt)}">${escapeHtml(updatedAt)}</time></p>`,
    `          </div>`,
    `          <div class="trust-grid">`,
    `            <section class="trust-card" aria-labelledby="trust-operator-heading">`,
    `              <h3 id="trust-operator-heading">運営者</h3>`,
    `              <p class="trust-operator">${escapeHtml(footer.operatorName)}</p>`,
    `              <p>${escapeHtml(footer.summary)}</p>`,
    `            </section>`,
    `            <section class="trust-card" aria-labelledby="trust-policy-heading">`,
    `              <h3 id="trust-policy-heading">掲載方針</h3>`,
    `              <p>${escapeHtml(footer.policy)}</p>`,
    `            </section>`,
    `            <section class="trust-card" aria-labelledby="trust-disclaimer-heading">`,
    `              <h3 id="trust-disclaimer-heading">ご利用上の注意</h3>`,
    `              <p>${escapeHtml(footer.disclaimer)}</p>`,
    `            </section>`,
    `            <section class="trust-card" aria-labelledby="trust-contact-heading">`,
    `              <h3 id="trust-contact-heading">連絡先</h3>`,
    `              <p><a href="${escapeHtml(footer.contactUrl)}">${escapeHtml(footer.contactLabel)}</a></p>`,
    `              <p class="trust-contact-note">${footer.contactNote ? ` ${escapeHtml(footer.contactNote)}` : ""}</p>`,
    `            </section>`,
    `          </div>`,
    `          <p class="trust-copyright">${escapeHtml(footer.copyright)}</p>`,
    `        </section>`,
  ].join("\n");
}

export function renderLinkSections(sections: LinkSection[]): string {
  return sections.map(renderSection).join("\n\n");
}

function renderSection(section: LinkSection): string {
  const headingId = `${section.id}-heading`;
  const links = section.links.map(renderLink).join("\n");

  return [
    `        <section id="${escapeHtml(section.id)}" class="link-section" aria-labelledby="${escapeHtml(headingId)}">`,
    '          <div class="section-heading">',
    `            <h2 id="${escapeHtml(headingId)}">${escapeHtml(section.title)}</h2>`,
    '            <a class="back-to-top" href="#top">上部へ戻る</a>',
    "          </div>",
    `          <p class="section-description">${escapeHtml(section.description)}</p>`,
    '          <ul class="link-list">',
    links,
    "          </ul>",
    "        </section>",
  ].join("\n");
}

function renderLink(link: LinkItem): string {
  const attrs = [`href="${escapeHtml(link.url)}"`];
  const domain = getLinkLabel(link.url);
  if (isExternalUrl(link.url)) {
    attrs.push(`aria-label="${escapeHtml(`${link.title}。${domain}`)}"`);
  }

  return [
    '            <li class="link-item">',
    `              <a ${attrs.join(" ")}>`,
    `                <span class="link-title">${escapeHtml(link.title)}</span>`,
    `                <span class="link-url">${escapeHtml(domain)}</span>`,
    `                <span class="link-note">${escapeHtml(link.note)}</span>`,
    "              </a>",
    "            </li>",
  ].join("\n");
}

function replaceGeneratedBlock(
  template: string,
  startMarker: string,
  endMarker: string,
  content: string,
): string {
  const start = template.indexOf(startMarker);
  const end = template.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`テンプレートマーカーが見つかりません: ${startMarker} ... ${endMarker}`);
  }

  const before = template.slice(0, start + startMarker.length);
  const after = template.slice(end);
  return `${before}\n${content}\n        ${after.trimStart()}`;
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//u.test(url);
}

function getLinkLabel(url: string): string {
  if (!isExternalUrl(url)) {
    return url;
  }

  try {
    return new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    return url;
  }
}

function toLanguageTag(locale: string): string {
  return locale.replace("_", "-");
}

function escapeScriptTag(value: string): string {
  return value.replaceAll("</script>", "<\\/script>");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatBuildDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
