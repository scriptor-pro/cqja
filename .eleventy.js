const { JSDOM } = require("jsdom");
const dateFrFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");

  eleventyConfig.addFilter("tagSlug", function (value) {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  });

  eleventyConfig.addFilter("hasTag", function (items, tag) {
    return (items || []).filter((item) => (item.data.tags || []).includes(tag));
  });

  eleventyConfig.addFilter("dateIso", function (value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toISOString().slice(0, 10);
  });

  eleventyConfig.addFilter("dateFr", function (value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return dateFrFormatter.format(date);
  });

  eleventyConfig.addFilter("excerptPlain", function (value, maxLength = 180) {
    const html = String(value || "");
    const dom = new JSDOM(`<body>${html}</body>`);
    const text = (dom.window.document.body.textContent || "")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
  });

  eleventyConfig.addCollection("cqjaOrdered", function (collectionApi) {
    return collectionApi
      .getFilteredByTag("note")
      .sort((a, b) => a.date - b.date);
  });

  eleventyConfig.addCollection("tagStats", function (collectionApi) {
    const tagCount = {};

    collectionApi.getFilteredByTag("note").forEach((item) => {
      (item.data.tags || []).forEach((tag) => {
        if (tag !== "note") {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        }
      });
    });

    const max = Math.max(...Object.values(tagCount), 1);
    const min = Math.min(...Object.values(tagCount), 0);

    return Object.entries(tagCount)
      .map(([tag, count]) => {
        const weight = (count - min) / (max - min || 1);
        return { tag, count, weight };
      })
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  });

  eleventyConfig.addTransform("externalLinks", function (content) {
    if (this.page.outputPath && this.page.outputPath.endsWith(".html")) {
      const dom = new JSDOM(content);
      const document = dom.window.document;

      document.querySelectorAll("a[href]").forEach((link) => {
        const href = link.getAttribute("href");
        if (href.startsWith("http")) {
          link.setAttribute("target", "_blank");
          link.setAttribute("rel", "noopener noreferrer");
        }
      });

      return dom.serialize();
    }
    return content;
  });

  return {
    dir: {
      input: ".",
      output: "_site",
    },
  };
};
