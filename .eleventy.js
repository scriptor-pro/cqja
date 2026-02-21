const { JSDOM } = require("jsdom");
const fs = require("fs");
const dateFrFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const frCollator = new Intl.Collator("fr", {
  sensitivity: "base",
  numeric: true,
});

function plainTextFromHtml(value) {
  const html = String(value || "");
  const dom = new JSDOM(`<body>${html}</body>`);
  return (dom.window.document.body.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(value) {
  if (!value) {
    return 0;
  }
  return value.split(/\s+/).filter(Boolean).length;
}

function noteWordCountFromFile(inputPath) {
  try {
    const raw = fs.readFileSync(inputPath, "utf8");
    const withoutFrontmatter = raw.replace(/^---[\s\S]*?---\s*/, "");
    const withoutLinks = withoutFrontmatter.replace(
      /\[([^\]]+)\]\([^\)]+\)/g,
      "$1",
    );
    const withoutMarkup = withoutLinks
      .replace(/<[^>]+>/g, " ")
      .replace(/[`*_>#\-\[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return countWords(withoutMarkup);
  } catch {
    return 0;
  }
}

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

  eleventyConfig.addFilter("dateRfc822", function (value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toUTCString();
  });

  eleventyConfig.addFilter("dateFr", function (value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return dateFrFormatter.format(date);
  });

  eleventyConfig.addFilter("excerptPlain", function (value, maxLength = 180) {
    const text = plainTextFromHtml(value);

    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
  });

  eleventyConfig.addFilter("absoluteUrl", function (value, baseUrl) {
    if (!value) {
      return baseUrl || "";
    }
    if (/^https?:\/\//.test(value)) {
      return value;
    }
    try {
      return new URL(value, baseUrl).toString();
    } catch {
      return value;
    }
  });

  eleventyConfig.addCollection("cqjaOrdered", function (collectionApi) {
    return collectionApi
      .getFilteredByTag("note")
      .sort((a, b) => a.date - b.date);
  });

  eleventyConfig.addCollection("homePages", function (collectionApi) {
    const maxWordsPerPage = 500;
    const notes = collectionApi
      .getFilteredByTag("note")
      .sort((a, b) => b.date - a.date);

    const pages = [];
    let currentPage = {
      notes: [],
      totalWords: 0,
    };

    for (const note of notes) {
      const noteWords = noteWordCountFromFile(
        note.inputPath || note.page?.inputPath,
      );

      if (
        currentPage.notes.length > 0 &&
        currentPage.totalWords + noteWords > maxWordsPerPage
      ) {
        pages.push(currentPage);
        currentPage = {
          notes: [],
          totalWords: 0,
        };
      }

      currentPage.notes.push(note);
      currentPage.totalWords += noteWords;
    }

    if (currentPage.notes.length > 0) {
      pages.push(currentPage);
    }

    return pages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
      totalPages: pages.length,
    }));
  });

  eleventyConfig.addCollection("notesRecent", function (collectionApi) {
    return collectionApi
      .getFilteredByTag("note")
      .sort((a, b) => b.date - a.date);
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
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return frCollator.compare(a.tag, b.tag);
      });
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
