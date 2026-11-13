/**
 * Blog Build Script
 * Converts Markdown posts to HTML using Handlebars template
 * Run: node scripts/build-blog.js
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const marked = require('marked');
const Handlebars = require('handlebars');
const slugify = require('slugify');

const POSTS_DIR = path.join(__dirname, '../blog/posts');
const TEMPLATE_PATH = path.join(__dirname, '../blog/template.html');
const OUTPUT_DIR = path.join(__dirname, '../blog');
const BLOG_INDEX_PATH = path.join(__dirname, '../blog.html');
const HOME_INDEX_PATH = path.join(__dirname, '../index.html');

// Configure marked for code highlighting
marked.setOptions({
    highlight: (code, lang) => {
        // We'll use Prism.js via CSS classes, just add language class
        return `<pre><code class="language-${lang || 'text'}">${escapeHtml(code)}</code></pre>`;
    },
    breaks: true,
    gfm: true
});

// Helper to escape HTML
function escapeHtml(text) {
    return text
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#039;');
}

// Handlebars helpers
Handlebars.registerHelper('encodeURIComponent', function(str) {
    return encodeURIComponent(str);
});

Handlebars.registerHelper('each', function(context, options) {
    if (!context || context.length === 0) return '';
    let ret = '';
    for (let i = 0; i < context.length; i++) {
        ret += options.fn(context[i]);
    }
    return ret;
});

// Read template
const templateSource = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
const template = Handlebars.compile(templateSource);

// Read blog index template (for updating blog.html cards)
const blogIndexSource = fs.readFileSync(BLOG_INDEX_PATH, 'utf-8');

// Parse all markdown posts
function parsePosts() {
    const files = fs.readdirSync(POSTS_DIR)
        .filter(f => f.endsWith('.md'))
        .filter(f => f !== 'TEMPLATE.md'); // Exclude template file

    const posts = [];
    const seenSlugs = new Set();

    for (const file of files) {
        const filePath = path.join(POSTS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const { data, content: markdown } = matter(content);

        // Validate required frontmatter
        const required = ['title', 'date', 'category', 'readTime', 'description', 'tags'];
        for (const field of required) {
            if (!data[field]) {
                console.error(`❌ Missing required frontmatter field "${field}" in ${file}`);
                process.exit(1);
            }
        }

        const slug = slugify(data.title, { lower: true, strict: true });

        // Check for duplicate slugs
        if (seenSlugs.has(slug)) {
            console.error(`❌ Duplicate slug "${slug}" from title "${data.title}" in ${file}`);
            console.error('   Each post must have a unique title. Please change the title.');
            process.exit(1);
        }
        seenSlugs.add(slug);

        const date = new Date(data.date);
        const dateISO = date.toISOString();
        const dateFormatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        // Convert markdown to HTML
        const htmlContent = marked.parse(markdown);

        const post = {
            slug,
            title: data.title,
            description: data.description,
            keywords: (data.tags || []).join(', '),
            category: data.category,
            readTime: data.readTime,
            tags: data.tags || [],
            heroImage: data.heroImage,
            dateISO,
            dateFormatted,
            date: data.date,
            content: htmlContent
        };

        posts.push(post);
    }

    // Sort by date descending (newest first)
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    return posts;
}

// Generate individual post HTML files
function generatePostHtml(posts) {
    console.log('📝 Generating post HTML files...');
    for (const post of posts) {
        const html = template(post);
        const outputPath = path.join(OUTPUT_DIR, `${post.slug}.html`);
        fs.writeFileSync(outputPath, html);
        console.log(`  ✅ ${post.slug}.html`);
    }
}

// Generate blog index cards HTML (for blog.html)
function generateBlogIndexCards(posts) {
    let cardsHtml = '';

    for (const post of posts) {
        cardsHtml += `
                <!-- Blog Post: ${post.title} -->
                <article class="blog-card">
                    <div class="blog-card-content">
                        <div class="blog-card-meta">
                            <time class="blog-card-date" datetime="${post.dateISO}">${post.dateFormatted}</time>
                            <span class="blog-card-category">${post.category}</span>
                        </div>
                        <h2 class="blog-card-title">${post.title}</h2>
                        <p class="blog-card-excerpt">
                            ${post.description}
                        </p>
                        <a href="blog/${post.slug}.html" class="blog-card-link">
                            Read More <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </article>`;
    }

    return cardsHtml;
}

// Update blog.html with new cards
function updateBlogIndex(posts) {
    console.log('📄 Updating blog.html...');
    const cardsHtml = generateBlogIndexCards(posts);

    // Find the blog-grid section and replace its content
    const startMarker = '<div class="blog-grid">';
    const endMarker = '</div>\n\n            <!-- Blog CTA -->';

    const startIdx = blogIndexSource.indexOf(startMarker);
    const endIdx = blogIndexSource.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1) {
        console.error('❌ Could not find blog-grid markers in blog.html');
        return;
    }

    const before = blogIndexSource.substring(0, startIdx + startMarker.length);
    const after = blogIndexSource.substring(endIdx);
    const newContent = before + '\n' + cardsHtml + '\n' + after;

    fs.writeFileSync(BLOG_INDEX_PATH, newContent);
    console.log('  ✅ blog.html updated');
}

// Update homepage blog preview (index.html)
function updateHomePreview(posts) {
    console.log('🏠 Updating homepage blog preview...');

    const homeSource = fs.readFileSync(HOME_INDEX_PATH, 'utf-8');
    const previewPosts = posts.slice(0, 3); // Latest 3 posts

    let previewHtml = '';
    for (const post of previewPosts) {
        previewHtml += `
                        <article class="blog-preview-card">
                            <div class="blog-preview-meta">
                                <time datetime="${post.dateISO}">${post.dateFormatted}</time>
                                <span class="blog-preview-category">${post.category}</span>
                            </div>
                            <h3>${post.title}</h3>
                            <p>${post.description}</p>
                            <a href="blog/${post.slug}.html" class="blog-preview-link">Read More <i class="fas fa-arrow-right"></i></a>
                        </article>`;
    }

    // Find blog-preview-grid section using comment markers
    const startMarker = '<!-- BLOG_PREVIEW_START -->';
    const endMarker = '<!-- BLOG_PREVIEW_END -->';

    const startIdx = homeSource.indexOf(startMarker);
    const endIdx = homeSource.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1) {
        console.error('❌ Could not find blog preview markers in index.html');
        return;
    }

    const before = homeSource.substring(0, startIdx + startMarker.length);
    const after = homeSource.substring(endIdx);
    const newContent = before + '\n' + previewHtml + '\n' + after;

    fs.writeFileSync(HOME_INDEX_PATH, newContent);
    console.log('  ✅ index.html updated');
}

// Generate sitemap.xml
function generateSitemap(posts) {
    console.log('🗺️ Generating sitemap.xml...');
    const baseUrl = 'https://suryashahi.com.np';
    const today = new Date().toISOString().split('T')[0];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}/</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${baseUrl}/about.html</loc>
        <lastmod>${today}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/projects.html</loc>
        <lastmod>${today}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>${baseUrl}/blog.html</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>`;

    for (const post of posts) {
        sitemap += `
    <url>
        <loc>${baseUrl}/blog/${post.slug}.html</loc>
        <lastmod>${post.date.split('T')[0]}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`;
    }

    sitemap += `
</urlset>`;

    fs.writeFileSync(path.join(__dirname, '../sitemap.xml'), sitemap);
    console.log('  ✅ sitemap.xml generated');
}

// Generate RSS feed
function generateRss(posts) {
    console.log('📡 Generating rss.xml...');
    const baseUrl = 'https://suryashahi.com.np';
    const buildDate = new Date().toUTCString();

    let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>Surya Bahadur Shahi — Tech Blog</title>
        <link>${baseUrl}/blog.html</link>
        <description>Technical articles on Full Stack Development, AI/ML, and Software Engineering</description>
        <language>en</language>
        <lastBuildDate>${buildDate}</lastBuildDate>
        <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
        <managingEditor>suryashahi153@gmail.com (Surya Bahadur Shahi)</managingEditor>
        <webMaster>suryashahi153@gmail.com (Surya Bahadur Shahi)</webMaster>`;

    for (const post of posts) {
        const pubDate = new Date(post.date).toUTCString();
        rss += `
        <item>
            <title><![CDATA[${post.title}]]></title>
            <link>${baseUrl}/blog/${post.slug}.html</link>
            <guid isPermaLink="true">${baseUrl}/blog/${post.slug}.html</guid>
            <description><![CDATA[${post.description}]]></description>
            <pubDate>${pubDate}</pubDate>
            <author>suryashahi153@gmail.com (Surya Bahadur Shahi)</author>
            ${post.tags.map(tag => `<category>${tag}</category>`).join('\n            ')}
        </item>`;
    }

    rss += `
    </channel>
</rss>`;

    fs.writeFileSync(path.join(__dirname, '../rss.xml'), rss);
    console.log('  ✅ rss.xml generated');
}

// Clean up old HTML files that no longer have corresponding .md files
function cleanOldHtmlFiles(validSlugs) {
    console.log('🧹 Cleaning old HTML files...');
    const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.html'));
    let cleaned = 0;
    for (const file of files) {
        const slug = file.replace('.html', '');
        // Keep template.html and any non-post HTML files
        if (file === 'template.html') continue;
        if (!validSlugs.has(slug)) {
            fs.unlinkSync(path.join(OUTPUT_DIR, file));
            console.log(`  🗑️ Removed ${file}`);
            cleaned++;
        }
    }
    if (cleaned === 0) console.log('  ✅ No orphaned files');
}

// Main
console.log('🚀 Building blog...\n');

const posts = parsePosts();
console.log(`\n📚 Found ${posts.length} posts\n`);

// Clean orphaned HTML files
const validSlugs = new Set(posts.map(p => p.slug));
cleanOldHtmlFiles(validSlugs);

generatePostHtml(posts);
updateBlogIndex(posts);
updateHomePreview(posts);
generateSitemap(posts);
generateRss(posts);

console.log('\n✨ Blog build complete!');
console.log(`   Posts: ${posts.length}`);
console.log(`   Latest: ${posts[0]?.title || 'none'}`);