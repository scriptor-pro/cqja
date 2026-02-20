
const { JSDOM } = require("jsdom");

module.exports = function(eleventyConfig) {

  eleventyConfig.addCollection("cqjaOrdered", function(collectionApi) {
    return collectionApi
      .getFilteredByTag("note")
      .sort((a, b) => a.date - b.date);
  });

  eleventyConfig.addCollection("tagStats", function(collectionApi) {
    let tagCount = {};

    collectionApi.getFilteredByTag("note").forEach(item => {
      (item.data.tags || []).forEach(tag => {
        if (tag !== "note") {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        }
      });
    });

    const max = Math.max(...Object.values(tagCount), 1);
    const min = Math.min(...Object.values(tagCount), 0);

    return Object.entries(tagCount).map(([tag, count]) => {
      const weight = (count - min) / (max - min || 1);
      return { tag, count, weight };
    });
  });

  eleventyConfig.addTransform("externalLinks", function(content) {
    if (this.page.outputPath && this.page.outputPath.endsWith(".html")) {
      const dom = new JSDOM(content);
      const document = dom.window.document;

      document.querySelectorAll("a[href]").forEach(link => {
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
      output: "_site"
    }
  };
};
