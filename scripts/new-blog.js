/**
 * New Blog Post Scaffold
 * Creates a new markdown file with frontmatter template
 * Run: npm run new:blog "Your Post Title"
 */

const fs = require('fs');
const path = require('path');
const slugify = require('slugify');

const POSTS_DIR = path.join(__dirname, '../blog/posts');

// Get title from command line args
const title = process.argv.slice(2).join(' ');

if (!title) {
    console.error('❌ Usage: npm run new:blog "Your Post Title"');
    process.exit(1);
}

const slug = slugify(title, { lower: true, strict: true });
const date = new Date().toISOString().split('T')[0];
const filename = `${slug}.md`;
const filepath = path.join(POSTS_DIR, filename);

// Check if file already exists
if (fs.existsSync(filepath)) {
    console.error(`❌ File already exists: ${filename}`);
    process.exit(1);
}

// Frontmatter template
const frontmatter = `---
title: "${title}"
date: "${date}"
category: "General"  # Options: AI/ML, Full Stack, Backend, Computer Vision, Architecture, Frontend
readTime: "5 min read"
description: "Brief description for SEO and blog cards (1-2 sentences)"
tags: ["Tag1", "Tag2", "Tag3"]
heroImage: "blog-placeholder-1.webp"  # Use existing or add new image to root folder
---

# ${title}

Your introduction here. Hook the reader with what they'll learn.

## Section 1

Content goes here. Write in **Markdown** — supports:

- **Bold** and *italic*
- \`inline code\`
- [Links](https://example.com)
- Lists (bullet or numbered)
- Blockquotes

### Subsection

\`\`\`javascript
// Code blocks with syntax highlighting
function hello() {
    console.log("Hello, World!");
}
\`\`\`

## Section 2

More content...

### Tips for Great Posts

1. **Start with a problem** — what challenge did you face?
2. **Show real code** — copy-pasteable examples
3. **Explain trade-offs** — why this approach over others?
4. **Include metrics** — latency, cost, accuracy improvements
5. **Link to repo/demo** — let readers explore further

## Conclusion

Wrap up with key takeaways and what's next.

---

*Want more? Check out my other posts on [the blog](../blog.html) or connect with me on [GitHub](https://github.com/suryashahi) and [LinkedIn](https://linkedin.com/in/surya-bahadur-shahi-61674a259/).*`;

fs.writeFileSync(filepath, frontmatter);
console.log(`✅ Created: blog/posts/${filename}`);
console.log(`📝 Edit the file, then run: npm run build:blog`);