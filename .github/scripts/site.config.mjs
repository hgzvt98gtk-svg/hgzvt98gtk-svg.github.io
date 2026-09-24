import { siteFilePaths } from "./site-paths.mjs";

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
    icon: "https://assets.hussamfaroug.com/HF.svg",
    stylesheet: "/style.css",
    appScript: `/${siteFilePaths.appScript}`,
    background: "https://assets.hussamfaroug.com/Background.jpeg",
    socialPreview: "https://assets.hussamfaroug.com/social-preview.svg",
    agentCard: `/${siteFilePaths.agentCard}`,
    apiCatalog: `/${siteFilePaths.apiCatalog}`,
    privacyPage: `/${siteFilePaths.privacy}`,
    sitemap: `/${siteFilePaths.sitemap}`,
    bimiLogo: "/.well-known/bimi/logo.svg"
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
    mode: "enforce",
    maxAge: 604800,
    mx: ["mx01.mail.icloud.com", "mx02.mail.icloud.com"]
  },
  apis: []
};
