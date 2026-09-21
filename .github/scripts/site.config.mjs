export const siteConfig = {
  domain: "hussamfaroug.com",
  origin: "https://hussamfaroug.com",
  name: "Hussam Faroug",
  themeColor: "#0b0b0d",
  siteTitle: "Hussam Faroug | Personal Website",
  siteDescription: "The personal website of Hussam Faroug.",
  privacyTitle: "Privacy Policy - Hussam Faroug",
  privacyDescription: "Privacy policy for hussamfaroug.com.",
  privacyUpdated: "September 19, 2026",
  contactEmail: "admin@hussamfaroug.com",
  assets: {
    favicon: "/HF.svg",
    stylesheet: "/style.css",
    background: "/Background.jpeg",
    socialPreview: "/social-preview.svg",
    runtimeScript: "/site-tools.mjs",
    bimiLogo: "/.well-known/bimi/logo.svg"
  },
  wellKnown: {
    agentCard: "/.well-known/agent-card.json",
    apiCatalog: "/.well-known/api-catalog",
    mtaSts: "/.well-known/mta-sts.txt"
  },
  pages: [
    {
      path: "/",
      title: "Home",
      description: "Personal landing page.",
      lastModified: "2026-09-19"
    },
    {
      path: "/Privacy.html",
      title: "Privacy",
      description: "Privacy policy.",
      lastModified: "2026-09-19"
    }
  ],
  mtaSts: {
    version: "STSv1",
    mode: "testing",
    maxAge: 604800,
    mx: ["mx01.mail.icloud.com", "mx02.mail.icloud.com"]
  }
};
