import { siteFilePaths } from "./site-paths.mjs";

function toAbsolutePath(relativePath) {
  return `/${relativePath}`;
}

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
    appScript: toAbsolutePath(siteFilePaths.appScript),
    background: "/Background.jpeg",
    socialPreview: "/social-preview.svg",
    agentCard: toAbsolutePath(siteFilePaths.agentCard),
    apiCatalog: toAbsolutePath(siteFilePaths.apiCatalog),
    privacyPage: toAbsolutePath(siteFilePaths.privacy),
    llms: toAbsolutePath(siteFilePaths.llms),
    robots: toAbsolutePath(siteFilePaths.robots),
    sitemap: toAbsolutePath(siteFilePaths.sitemap),
    bimiLogo: "/.well-known/bimi/logo.svg",
    mtaSts: toAbsolutePath(siteFilePaths.mtaSts)
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
