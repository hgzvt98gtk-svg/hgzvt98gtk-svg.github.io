export const siteConfig = {
  personName: "Hussam Faroug",
  domain: "hussamfaroug.com",
  origin: "https://hussamfaroug.com",
  email: "admin@hussamfaroug.com",
  themeColor: "#0b0b0d",
  privacyLastUpdated: "September 19, 2026",
  privacyLastModified: "2026-09-19",
  siteStatus: "agent-ready",
  assetPaths: {
    icon: "/HF.svg",
    stylesheet: "/style.css",
    appScript: "/app.js",
    background: "/Background.jpeg",
    socialPreview: "/social-preview.svg",
    agentCard: "/.well-known/agent-card.json",
    apiCatalog: "/.well-known/api-catalog",
    privacyPage: "/Privacy.html",
    llms: "/llms.txt",
    robots: "/robots.txt",
    sitemap: "/sitemap.xml",
    bimiLogo: "/.well-known/bimi/logo.svg",
    mtaSts: "/.well-known/mta-sts.txt"
  },
  pageTitles: {
    home: "Hussam Faroug | Personal Website",
    privacy: "Privacy Policy - Hussam Faroug"
  },
  descriptions: {
    home: "The personal website of Hussam Faroug.",
    privacy: "Privacy policy for hussamfaroug.com.",
    agentCard: "Personal website and contact page for Hussam Faroug."
  },
  mtaSts: {
    version: "STSv1",
    mode: "testing",
    maxAge: 604800,
    mx: ["mx01.mail.icloud.com", "mx02.mail.icloud.com"]
  },
  apis: []
};

function toAbsoluteUrl(origin, path) {
  return new URL(path, `${origin}/`).toString();
}

export function deriveSiteUrls(config) {
  const { origin, assetPaths } = config;
  const assetUrlKeys = {
    privacy: "privacyPage",
    socialPreview: "socialPreview",
    sitemap: "sitemap",
    agentCard: "agentCard",
    apiCatalog: "apiCatalog",
    llms: "llms",
    robots: "robots",
    mtaSts: "mtaSts",
    bimiLogo: "bimiLogo"
  };

  return {
    home: new URL("/", `${origin}/`).toString(),
    ...Object.fromEntries(Object.entries(assetUrlKeys).map(([urlKey, assetKey]) => [urlKey, toAbsoluteUrl(origin, assetPaths[assetKey])]))
  };
}

export const siteUrls = deriveSiteUrls(siteConfig);
