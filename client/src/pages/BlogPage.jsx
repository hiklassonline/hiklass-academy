import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Code2,
  Copy,
  Facebook,
  Heart,
  Linkedin,
  Mail,
  Megaphone,
  MessageSquare,
  PenTool,
  Printer,
  Search,
  Share2,
  Sparkles,
  UserRound,
} from 'lucide-react';
import API_URL from '../utils/apiBaseUrl';
import getAssetUrl from '../utils/getAssetUrl';
import SiteHeader from '../components/SiteHeader.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import aiImage from '../assets/course-images/Artificial-Intelligence-&-Emerging-Technologies.jpg';
import webImage from '../assets/course-images/Web-Design-&-Development.jpg';
import designImage from '../assets/course-images/Graphic-Design.jpg';
import marketingImage from '../assets/course-images/Digital-Marketing.jpg';
import careerImage from '../assets/course-images/Professional-Productivity-Courses.jpg';
import './BlogPage.css';

const imageByCategory = {
  'artificial-intelligence': aiImage,
  'web-development': webImage,
  'graphic-design': designImage,
  'digital-marketing': marketingImage,
  'career-development': careerImage,
};

const categoryIcons = {
  'Artificial Intelligence': Sparkles,
  'Web Development': Code2,
  'Graphic Design': PenTool,
  'Digital Marketing': Megaphone,
  'Career Development': BriefcaseBusiness,
};

function postImage(post) {
  return post?.image || imageByCategory[post?.categorySlug] || aiImage;
}

function formatDate(value) {
  if (!value) return 'Draft';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function avatarInitials(name = 'HA') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'HA';
}

function BlogAvatar({ name, avatar, large }) {
  const src = avatar ? getAssetUrl(avatar) : '';
  return (
    <span className={large ? 'blogAvatar large' : 'blogAvatar'}>
      {src ? <img src={src} alt={name || ''} /> : avatarInitials(name)}
    </span>
  );
}

function extractHeadings(content = '') {
  return content
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => {
      const text = line.replace(/^##\s+/, '').trim();
      return { id: text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), text };
    });
}

function getInitialFilters() {
  if (typeof window === 'undefined') return { query: '', category: '' };
  const params = new URLSearchParams(window.location.search);
  return {
    query: params.get('q') || '',
    category: params.get('category') || '',
  };
}

function syncBlogUrl(nextQuery = '', nextCategory = '') {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  if (nextQuery.trim()) params.set('q', nextQuery.trim());
  if (nextCategory) params.set('category', nextCategory);
  const nextUrl = params.toString() ? `/blog?${params}` : '/blog';
  window.history.replaceState({}, '', nextUrl);
}

function ArticleBody({ content }) {
  const lines = String(content || '').split('\n');
  return (
    <div className="blogArticleBody">
      {lines.map((line, index) => {
        if (!line.trim()) return null;
        if (line.startsWith('## ')) {
          const text = line.replace(/^##\s+/, '').trim();
          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          return <h2 id={id} key={index}>{text}</h2>;
        }
        if (line.startsWith('> ')) return <blockquote key={index}>{line.replace(/^>\s+/, '')}</blockquote>;
        if (line.startsWith('- ')) return <p className="blogBullet" key={index}>{line.replace(/^-\s+/, '')}</p>;
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

export default function BlogPage({ slug = '' }) {
  const initialFilters = useMemo(() => getInitialFilters(), []);
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [comments, setComments] = useState([]);
  const [query, setQuery] = useState(initialFilters.query);
  const [activeCategory, setActiveCategory] = useState(initialFilters.category);
  const [status, setStatus] = useState('');
  const [newsletter, setNewsletter] = useState({ firstName: '', email: '' });
  const [commentForm, setCommentForm] = useState({ name: '', email: '', comment: '' });

  async function loadList(nextQuery = query, category = activeCategory) {
    syncBlogUrl(nextQuery, category);
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set('q', nextQuery.trim());
    if (category) params.set('category', category);
    const [postRes, catRes] = await Promise.all([
      fetch(`${API_URL}/api/blog/posts?${params}`),
      fetch(`${API_URL}/api/blog/categories`),
    ]);
    const postData = await postRes.json();
    const catData = await catRes.json();
    setPosts(postData.posts || []);
    setCategories(catData.categories || []);
  }

  async function loadArticle() {
    const res = await fetch(`${API_URL}/api/blog/posts/${encodeURIComponent(slug)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Article not found.');
    setArticle(data.post);
    setRelated(data.related || []);
    setComments(data.comments || []);
  }

  useEffect(() => {
    setStatus('');
    if (slug) loadArticle().catch((error) => setStatus(error.message));
    else loadList().catch((error) => setStatus(error.message));
  }, [slug]);

  const featured = useMemo(() => posts.find((post) => post.featured) || posts[0], [posts]);
  const latest = useMemo(() => posts.filter((post) => post.id !== featured?.id), [posts, featured]);
  const popular = useMemo(() => [...posts].sort((a, b) => Number(b.views || 0) - Number(a.views || 0)).slice(0, 5), [posts]);
  const headings = useMemo(() => extractHeadings(article?.content), [article]);

  function runSearch(event) {
    event?.preventDefault();
    if (slug) window.location.href = `/blog?q=${encodeURIComponent(query)}`;
    else loadList(query, activeCategory).catch((error) => setStatus(error.message));
  }

  async function subscribe(event) {
    event.preventDefault();
    const res = await fetch(`${API_URL}/api/blog/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newsletter),
    });
    const data = await res.json();
    setStatus(data.message || (res.ok ? 'Subscribed.' : 'Could not subscribe.'));
    if (res.ok) setNewsletter({ firstName: '', email: '' });
  }

  async function submitComment(event) {
    event.preventDefault();
    const res = await fetch(`${API_URL}/api/blog/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...commentForm, postId: article.id }),
    });
    const data = await res.json();
    setStatus(data.message || (res.ok ? 'Comment submitted.' : 'Could not submit comment.'));
    if (res.ok) setCommentForm({ name: '', email: '', comment: '' });
  }

  async function likeArticle() {
    const res = await fetch(`${API_URL}/api/blog/posts/${article.id}/like`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) setArticle((current) => ({ ...current, likes: data.likes }));
  }

  function shareArticle(target) {
    const url = window.location.href;
    const text = article?.title || 'HIKLASS Academy Blog';
    const links = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      email: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
    };
    if (target === 'copy') {
      navigator.clipboard?.writeText(url);
      setStatus('Article link copied.');
      return;
    }
    window.open(links[target], '_blank', 'noopener,noreferrer');
  }

  if (slug) {
    return (
      <div className="blogPage">
        <SiteHeader />
        {status ? <div className="blogNotice">{status}</div> : null}
        {article ? (
          <main className="blogArticleShell">
            <article className="blogArticle">
              <a className="blogBackLink" href="/blog">Back to Blog</a>
              <p className="blogCategoryText">{article.category}</p>
              <h1>{article.title}</h1>
              <p className="blogArticleSubtitle">{article.subtitle || article.excerpt}</p>
              <div className="blogMeta">
                <BlogAvatar name={article.author?.name} avatar={article.author?.avatar} />
                <strong>{article.author?.name}</strong>
                <span>{article.author?.role}</span>
                <span><CalendarDays size={15} /> {formatDate(article.publishedAt)}</span>
                <span><Clock3 size={15} /> {article.readingTime} min read</span>
              </div>
              <img className="blogArticleImage" src={postImage(article)} alt={article.imageAlt || article.title} />
              {article.imageCaption ? <small className="blogCaption">{article.imageCaption}</small> : null}
              <div className="blogArticleGrid">
                <aside className="blogToc">
                  <strong>Table of contents</strong>
                  {headings.map((heading) => <a key={heading.id} href={`#${heading.id}`}>{heading.text}</a>)}
                  <div className="blogActions">
                    <button type="button" onClick={likeArticle}><Heart size={16} /> {article.likes || 0}</button>
                    <button type="button" onClick={() => window.print()}><Printer size={16} /> Print</button>
                    <button type="button" onClick={() => shareArticle('copy')}><Copy size={16} /> Copy</button>
                  </div>
                </aside>
                <div>
                  <ArticleBody content={article.content} />
                  <section className="blogCourseCta">
                    <h2>Ready to build this skill?</h2>
                    <p>{article.relatedCourse ? `Explore ${article.relatedCourse} training at HIKLASS Academy.` : 'Explore practical HIKLASS Academy courses and learning packages.'}</p>
                    <a href="/#courses">Browse Courses</a>
                    <a href="/#enroll">Enroll Now</a>
                  </section>
                  <section className="blogAuthorBox">
                    <BlogAvatar name={article.author?.name} avatar={article.author?.avatar} large />
                    <div>
                      <h2>{article.author?.name}</h2>
                      <strong>{article.author?.role}</strong>
                      <p>{article.author?.bio}</p>
                    </div>
                  </section>
                  <section className="blogShareRow">
                    <button type="button" onClick={() => shareArticle('facebook')}><Facebook size={16} /> Facebook</button>
                    <button type="button" onClick={() => shareArticle('linkedin')}><Linkedin size={16} /> LinkedIn</button>
                    <button type="button" onClick={() => shareArticle('whatsapp')}><Share2 size={16} /> WhatsApp</button>
                    <button type="button" onClick={() => shareArticle('email')}><Mail size={16} /> Email</button>
                  </section>
                  <section className="blogComments">
                    <h2>Comments</h2>
                    {comments.map((comment) => (
                      <div key={comment.id} className="blogComment"><strong>{comment.name}</strong><p>{comment.body}</p></div>
                    ))}
                    <form onSubmit={submitComment}>
                      <input placeholder="Name" value={commentForm.name} onChange={(event) => setCommentForm((v) => ({ ...v, name: event.target.value }))} required />
                      <input placeholder="Email" type="email" value={commentForm.email} onChange={(event) => setCommentForm((v) => ({ ...v, email: event.target.value }))} required />
                      <textarea placeholder="Comment" value={commentForm.comment} onChange={(event) => setCommentForm((v) => ({ ...v, comment: event.target.value }))} required />
                      <button type="submit">Submit Comment</button>
                    </form>
                  </section>
                </div>
              </div>
              <section className="blogRelated">
                <h2>Related Articles</h2>
                <div>{related.map((post) => <BlogCard key={post.id} post={post} />)}</div>
              </section>
            </article>
          </main>
        ) : null}
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="blogPage">
      <SiteHeader />
      {status ? <div className="blogNotice">{status}</div> : null}
      <section className="blogHero">
        <div>
          <h1>Learn. Grow. Lead in the Digital World.</h1>
          <p>Explore practical tutorials, expert insights, career advice, Academy updates, and technology trends designed to help you build valuable digital skills.</p>
          <form onSubmit={runSearch} className="blogHeroSearch">
            <input placeholder="Search articles, courses, careers, or digital skills..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <button type="submit"><Search size={20} /></button>
          </form>
          <div className="blogTopicTags">
            {categories.slice(0, 5).map((category) => (
              <button key={category.id} type="button" onClick={() => { setActiveCategory(category.slug); loadList(query, category.slug); }}>{category.name}</button>
            ))}
          </div>
        </div>
        <img src={webImage} alt="Student learning digital skills" />
      </section>
      <main className="blogMain">
        <section className="blogContent">
          {featured ? <FeaturedArticle post={featured} /> : null}
          <div className="blogCategoryCards">
            {categories.slice(0, 6).map((category) => {
              const Icon = categoryIcons[category.name] || BookMarkIcon;
              return (
                <button key={category.id} type="button" onClick={() => { setActiveCategory(category.slug); loadList(query, category.slug); }}>
                  <Icon size={22} />
                  <strong>{category.name}</strong>
                  <small>{category.articleCount || 0} Articles</small>
                </button>
              );
            })}
          </div>
          <div className="blogSectionHead"><h2>Latest Articles</h2><a href="/blog">View All</a></div>
          <div className="blogCardGrid">{latest.map((post) => <BlogCard key={post.id} post={post} />)}</div>
          <StudentStories />
        </section>
        <aside className="blogSidebar">
          <SidebarSearch query={query} setQuery={setQuery} onSearch={runSearch} />
          <SidebarCategories categories={categories} onSelect={(category) => { setActiveCategory(category.slug); loadList(query, category.slug); }} />
          <PopularPosts posts={popular} />
          <NewsletterForm newsletter={newsletter} setNewsletter={setNewsletter} subscribe={subscribe} />
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}

function BookMarkIcon(props) {
  return <Bookmark {...props} />;
}

function FeaturedArticle({ post }) {
  return (
    <article className="blogFeatured">
      <div className="blogFeaturedImage"><img src={postImage(post)} alt={post.imageAlt || post.title} /><span>Featured</span></div>
      <div>
        <p className="blogCategoryText">{post.category}</p>
        <h2>{post.title}</h2>
        <p>{post.excerpt}</p>
        <div className="blogMeta compact">
          <BlogAvatar name={post.author?.name} avatar={post.author?.avatar} />
          <strong>{post.author?.name}</strong>
          <span>{formatDate(post.publishedAt)}</span>
          <span>{post.readingTime} min read</span>
        </div>
        <a className="blogPrimaryLink" href={`/blog/${post.slug}`}>Read Featured Article</a>
      </div>
    </article>
  );
}

function BlogCard({ post }) {
  return (
    <article className="blogCard">
      <img src={postImage(post)} alt={post.imageAlt || post.title} />
      <div>
        <p className="blogCategoryText">{post.category}</p>
        <h3><a href={`/blog/${post.slug}`}>{post.title}</a></h3>
        <p>{post.excerpt}</p>
        <footer><span>{post.author?.name}</span><span>{formatDate(post.publishedAt)}</span><span>{post.readingTime} min</span><Bookmark size={16} /></footer>
      </div>
    </article>
  );
}

function SidebarSearch({ query, setQuery, onSearch }) {
  return (
    <form className="blogSidePanel blogSideSearch" onSubmit={onSearch}>
      <h3>Search Articles</h3>
      <div><input placeholder="Search..." value={query} onChange={(event) => setQuery(event.target.value)} /><button type="submit"><Search size={17} /></button></div>
    </form>
  );
}

function SidebarCategories({ categories, onSelect }) {
  return (
    <section className="blogSidePanel">
      <h3>Categories</h3>
      {categories.map((category) => (
        <button className="blogCategoryRow" key={category.id} type="button" onClick={() => onSelect(category)}>
          <span>{category.name}</span><em>{category.articleCount || 0}</em>
        </button>
      ))}
    </section>
  );
}

function PopularPosts({ posts }) {
  return (
    <section className="blogSidePanel">
      <h3>Popular Articles</h3>
      {posts.map((post, index) => (
        <a className="blogPopularItem" key={post.id} href={`/blog/${post.slug}`}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <div><strong>{post.title}</strong><small>{post.readingTime} min read</small></div>
        </a>
      ))}
    </section>
  );
}

function NewsletterForm({ newsletter, setNewsletter, subscribe }) {
  return (
    <form className="blogSidePanel blogNewsletter" onSubmit={subscribe}>
      <h3>Newsletter</h3>
      <p>Get digital skills insights, tutorials, and academy updates.</p>
      <input placeholder="First name" value={newsletter.firstName} onChange={(event) => setNewsletter((v) => ({ ...v, firstName: event.target.value }))} />
      <input type="email" placeholder="Enter your email" value={newsletter.email} onChange={(event) => setNewsletter((v) => ({ ...v, email: event.target.value }))} required />
      <button type="submit">Subscribe Now</button>
      <small>By subscribing, you agree to receive educational updates from HIKLASS Academy.</small>
    </form>
  );
}

function StudentStories() {
  const stories = [
    ['Brenda N.', 'UI/UX Design Graduate', 'Now: Product Designer', 'HIKLASS Academy transformed my career. The training is practical and the instructors are amazing.'],
    ['Steve L.', 'Web Development Graduate', 'Now: Full-Stack Developer', 'I went from zero coding knowledge to building real projects.'],
    ['Carine M.', 'Digital Marketing Graduate', 'Now: Marketing Consultant', 'The digital marketing course gave me the skills I needed to grow my business.'],
  ];
  return (
    <section className="blogStories">
      <div className="blogSectionHead"><h2>Student Success Stories</h2><a href="/blog?category=career-development">View All</a></div>
      <div>
        {stories.map(([name, course, now, quote]) => (
          <article key={name}>
            <BlogAvatar name={name} large />
            <p>{quote}</p>
            <strong>{name}</strong>
            <small>{course}</small>
            <em>{now}</em>
          </article>
        ))}
      </div>
    </section>
  );
}
