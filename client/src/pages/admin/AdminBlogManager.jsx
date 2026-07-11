import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Bookmark, Copy, Edit3, Eye, FileText, MessageSquare, Plus, Search, Trash2, Users } from 'lucide-react';
import { adminApi } from '../../services/adminContentApi';
import { getStoredAdminToken } from '../../services/authService';
import './AdminBlogManager.css';

const emptyPost = {
  title: '',
  slug: '',
  subtitle: '',
  excerpt: '',
  content: '',
  image: '',
  imageAlt: '',
  imageCaption: '',
  category: 'Digital Skills',
  categorySlug: 'digital-skills',
  tags: '',
  relatedCourse: '',
  status: 'Draft',
  readingTime: 5,
  featured: false,
  commentsEnabled: true,
  publishedAt: '',
  scheduledAt: '',
  seoTitle: '',
  metaDescription: '',
  focusKeyword: '',
  canonicalUrl: '',
  noIndex: false,
  noFollow: false,
  author: {
    name: 'Tah Terence',
    role: 'Founder, CEO & Lead Instructor',
    bio: 'Technology professional, creative strategist, and educator at HIKLASS Academy.',
    avatar: '',
  },
};

const emptyCategory = { name: '', slug: '', description: '', icon: 'BookOpen', color: '#1E2F97', status: 'Active', seoTitle: '', metaDescription: '' };
const tabs = ['Dashboard', 'All Posts', 'Editor', 'Categories', 'Comments', 'Newsletter', 'SEO & Settings'];

function slugify(value) {
  return String(value || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function toTagString(tags) {
  return Array.isArray(tags) ? tags.join(', ') : tags || '';
}

function toFormPost(post = emptyPost) {
  return {
    ...emptyPost,
    ...post,
    tags: toTagString(post.tags),
    author: { ...emptyPost.author, ...(post.author || {}) },
  };
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '-';
}

export default function AdminBlogManager() {
  const token = getStoredAdminToken();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [comments, setComments] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [postForm, setPostForm] = useState(emptyPost);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [editingPostId, setEditingPostId] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadBlog() {
    setLoading(true);
    try {
      const [p, c, cm, s, a] = await Promise.all([
        adminApi(token, 'GET', '/api/admin/blog/posts'),
        adminApi(token, 'GET', '/api/admin/blog/categories'),
        adminApi(token, 'GET', '/api/admin/blog/comments'),
        adminApi(token, 'GET', '/api/admin/blog/newsletter-subscribers'),
        adminApi(token, 'GET', '/api/admin/blog/analytics'),
      ]);
      setPosts(p.posts || []);
      setCategories(c.categories || []);
      setComments(cm.comments || []);
      setSubscribers(s.subscribers || []);
      setAnalytics(a.analytics || null);
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (token) loadBlog(); }, [token]);

  const filteredPosts = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return posts;
    return posts.filter((post) => [post.title, post.category, post.status, post.author?.name, ...(post.tags || [])].join(' ').toLowerCase().includes(search));
  }, [posts, query]);

  function updatePostField(key, value) {
    setPostForm((current) => ({ ...current, [key]: value, slug: key === 'title' && !editingPostId ? slugify(value) : current.slug }));
  }

  function updateAuthorField(key, value) {
    setPostForm((current) => ({ ...current, author: { ...current.author, [key]: value } }));
  }

  function editPost(post) {
    setEditingPostId(post.id);
    setPostForm(toFormPost(post));
    setActiveTab('Editor');
    setStatus(null);
  }

  function resetPostForm() {
    setEditingPostId('');
    setPostForm(emptyPost);
  }

  async function savePost(event) {
    event.preventDefault();
    const payload = {
      ...postForm,
      tags: String(postForm.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      categorySlug: slugify(postForm.categorySlug || postForm.category),
    };
    try {
      if (editingPostId) await adminApi(token, 'PUT', `/api/admin/blog/posts/${editingPostId}`, payload);
      else await adminApi(token, 'POST', '/api/admin/blog/posts', payload);
      setStatus({ type: 'success', text: editingPostId ? 'Blog post updated.' : 'Blog post created.' });
      resetPostForm();
      await loadBlog();
      setActiveTab('All Posts');
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  }

  async function updatePostStatus(post, nextStatus) {
    try {
      await adminApi(token, 'PATCH', `/api/admin/blog/posts/${post.id}/status`, { status: nextStatus });
      setStatus({ type: 'success', text: `Post moved to ${nextStatus}.` });
      await loadBlog();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  }

  async function duplicatePost(post) {
    try {
      await adminApi(token, 'POST', `/api/admin/blog/posts/${post.id}/duplicate`);
      setStatus({ type: 'success', text: 'Post duplicated as a draft.' });
      await loadBlog();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  }

  async function deletePost(post) {
    if (!window.confirm(`Delete "${post.title}"?`)) return;
    try {
      await adminApi(token, 'DELETE', `/api/admin/blog/posts/${post.id}`);
      setStatus({ type: 'success', text: 'Post deleted.' });
      await loadBlog();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  }

  function editCategory(category) {
    setEditingCategoryId(category.id);
    setCategoryForm({ ...emptyCategory, ...category });
  }

  async function saveCategory(event) {
    event.preventDefault();
    const payload = { ...categoryForm, slug: categoryForm.slug || slugify(categoryForm.name) };
    try {
      if (editingCategoryId) await adminApi(token, 'PUT', `/api/admin/blog/categories/${editingCategoryId}`, payload);
      else await adminApi(token, 'POST', '/api/admin/blog/categories', payload);
      setStatus({ type: 'success', text: editingCategoryId ? 'Category updated.' : 'Category created.' });
      setCategoryForm(emptyCategory);
      setEditingCategoryId('');
      await loadBlog();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  }

  async function deleteCategory(category) {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    try {
      await adminApi(token, 'DELETE', `/api/admin/blog/categories/${category.id}`);
      setStatus({ type: 'success', text: 'Category deleted.' });
      await loadBlog();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  }

  async function updateComment(comment, nextStatus) {
    try {
      await adminApi(token, 'PATCH', `/api/admin/blog/comments/${comment.id}/status`, { status: nextStatus });
      await loadBlog();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  }

  async function deleteComment(comment) {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await adminApi(token, 'DELETE', `/api/admin/blog/comments/${comment.id}`);
      await loadBlog();
    } catch (error) {
      setStatus({ type: 'error', text: error.message });
    }
  }

  if (!token) return <section className="adminBlogManager"><p>Sign in to manage the blog.</p></section>;

  return (
    <section className="adminBlogManager">
      <div className="adminBlogHead">
        <div>
          <h1>Blog Management</h1>
          <p>Create articles, manage categories, moderate comments, track subscribers, and tune SEO.</p>
        </div>
        <a href="/blog" target="_blank" rel="noreferrer"><Eye size={16} /> View Blog</a>
      </div>

      {status ? <div className={`adminContentStatus ${status.type}`}>{status.text}</div> : null}
      {loading ? <p className="adminContentHint">Loading blog workspace...</p> : null}

      <div className="adminBlogTabs">
        {tabs.map((tab) => <button type="button" className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)} key={tab}>{tab}</button>)}
      </div>

      {activeTab === 'Dashboard' ? (
        <div className="adminBlogStatsGrid">
          <Stat icon={FileText} label="Total Posts" value={analytics?.totalPosts || 0} />
          <Stat icon={Bookmark} label="Published" value={analytics?.publishedPosts || 0} />
          <Stat icon={Edit3} label="Drafts" value={analytics?.draftPosts || 0} />
          <Stat icon={BarChart3} label="Total Views" value={analytics?.totalViews || 0} />
          <Stat icon={MessageSquare} label="Comments" value={analytics?.totalComments || 0} />
          <Stat icon={Users} label="Subscribers" value={analytics?.newsletterSubscribers || 0} />
          <article className="adminBlogPanel adminBlogWide">
            <h2>Top-performing posts</h2>
            {(analytics?.topPosts || []).map((post) => <p key={post.id}><strong>{post.title}</strong><span>{post.views || 0} views</span></p>)}
          </article>
        </div>
      ) : null}

      {activeTab === 'All Posts' ? (
        <article className="adminBlogPanel">
          <div className="adminBlogToolbar">
            <div><Search size={16} /><input placeholder="Search posts..." value={query} onChange={(event) => setQuery(event.target.value)} /></div>
            <button type="button" onClick={() => { resetPostForm(); setActiveTab('Editor'); }}><Plus size={16} /> Add New Post</button>
          </div>
          <div className="adminBlogTableWrap">
            <table className="adminBlogTable">
              <thead><tr><th>Title</th><th>Author</th><th>Category</th><th>Status</th><th>Views</th><th>Comments</th><th>Published</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredPosts.map((post) => (
                  <tr key={post.id}>
                    <td><strong>{post.title}</strong><small>{post.slug}</small></td>
                    <td>{post.author?.name}</td>
                    <td>{post.category}</td>
                    <td><span className={`adminBlogStatus ${post.status.toLowerCase().replace(/\s+/g, '-')}`}>{post.status}</span></td>
                    <td>{post.views || 0}</td>
                    <td>{post.commentCount || 0}</td>
                    <td>{formatDate(post.publishedAt)}</td>
                    <td className="adminBlogActions">
                      <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer"><Eye size={15} /></a>
                      <button type="button" onClick={() => editPost(post)}><Edit3 size={15} /></button>
                      <button type="button" onClick={() => duplicatePost(post)}><Copy size={15} /></button>
                      <select value={post.status} onChange={(event) => updatePostStatus(post, event.target.value)}>
                        {['Draft', 'Pending Review', 'Scheduled', 'Published', 'Unpublished', 'Archived'].map((status) => <option key={status}>{status}</option>)}
                      </select>
                      <button type="button" className="danger" onClick={() => deletePost(post)}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      {activeTab === 'Editor' ? (
        <PostEditor
          postForm={postForm}
          setPostForm={setPostForm}
          updatePostField={updatePostField}
          updateAuthorField={updateAuthorField}
          savePost={savePost}
          resetPostForm={resetPostForm}
          categories={categories}
          editingPostId={editingPostId}
        />
      ) : null}

      {activeTab === 'Categories' ? (
        <article className="adminBlogPanel">
          <form className="adminBlogCategoryForm" onSubmit={saveCategory}>
            <input placeholder="Category name" value={categoryForm.name} onChange={(event) => setCategoryForm((v) => ({ ...v, name: event.target.value, slug: editingCategoryId ? v.slug : slugify(event.target.value) }))} required />
            <input placeholder="Slug" value={categoryForm.slug} onChange={(event) => setCategoryForm((v) => ({ ...v, slug: event.target.value }))} />
            <input placeholder="Icon name" value={categoryForm.icon} onChange={(event) => setCategoryForm((v) => ({ ...v, icon: event.target.value }))} />
            <input placeholder="#1E2F97" value={categoryForm.color} onChange={(event) => setCategoryForm((v) => ({ ...v, color: event.target.value }))} />
            <textarea placeholder="Description" value={categoryForm.description} onChange={(event) => setCategoryForm((v) => ({ ...v, description: event.target.value }))} />
            <button type="submit">{editingCategoryId ? 'Update Category' : 'Add Category'}</button>
          </form>
          <div className="adminBlogCategoryList">
            {categories.map((category) => (
              <div key={category.id}><strong>{category.name}</strong><span>{category.slug}</span><button type="button" onClick={() => editCategory(category)}>Edit</button><button type="button" onClick={() => deleteCategory(category)}>Delete</button></div>
            ))}
          </div>
        </article>
      ) : null}

      {activeTab === 'Comments' ? (
        <article className="adminBlogPanel">
          {comments.map((comment) => (
            <div className="adminBlogComment" key={comment.id}>
              <strong>{comment.name} on {comment.postTitle}</strong>
              <p>{comment.body}</p>
              <span>{comment.status} - {formatDate(comment.createdAt)}</span>
              <div><button type="button" onClick={() => updateComment(comment, 'Approved')}>Approve</button><button type="button" onClick={() => updateComment(comment, 'Spam')}>Spam</button><button type="button" onClick={() => deleteComment(comment)}>Delete</button></div>
            </div>
          ))}
          {!comments.length ? <p className="adminContentEmpty">No comments yet.</p> : null}
        </article>
      ) : null}

      {activeTab === 'Newsletter' ? (
        <article className="adminBlogPanel">
          <div className="adminBlogTableWrap">
            <table className="adminBlogTable"><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Source</th><th>Subscribed</th></tr></thead><tbody>
              {subscribers.map((subscriber) => <tr key={subscriber.id}><td>{subscriber.firstName || '-'}</td><td>{subscriber.email}</td><td>{subscriber.status}</td><td>{subscriber.source}</td><td>{formatDate(subscriber.createdAt)}</td></tr>)}
            </tbody></table>
          </div>
        </article>
      ) : null}

      {activeTab === 'SEO & Settings' ? (
        <article className="adminBlogPanel">
          <h2>SEO, media, scheduling, and sharing</h2>
          <p className="adminContentHint">Per-article SEO title, meta description, focus keyword, canonical URL, Open Graph image URL, schedule date, comments toggle, sharing buttons, and media URL are managed in the Editor tab for each post.</p>
          <div className="adminBlogSettingsGrid">
            <span>Comments approval: Enabled</span>
            <span>Social sharing: Facebook, LinkedIn, WhatsApp, Email, Copy Link</span>
            <span>Reading time: Manual per post</span>
            <span>Media library: Image URLs attached per post</span>
            <span>Roles: Super Admin controls all blog content</span>
          </div>
        </article>
      ) : null}
    </section>
  );
}

function Stat({ icon: Icon, label, value }) {
  return <article className="adminBlogStat"><Icon size={20} /><span>{label}</span><strong>{Number(value || 0).toLocaleString()}</strong></article>;
}

function PostEditor({ postForm, setPostForm, updatePostField, updateAuthorField, savePost, resetPostForm, categories, editingPostId }) {
  return (
    <form className="adminBlogEditor" onSubmit={savePost}>
      <section className="adminBlogPanel">
        <h2>{editingPostId ? 'Edit Blog Post' : 'Add New Blog Post'}</h2>
        <div className="adminBlogFormGrid">
          <label>Post title<input value={postForm.title} onChange={(event) => updatePostField('title', event.target.value)} required /></label>
          <label>Slug<input value={postForm.slug} onChange={(event) => updatePostField('slug', event.target.value)} /></label>
          <label>Subtitle<input value={postForm.subtitle} onChange={(event) => updatePostField('subtitle', event.target.value)} /></label>
          <label>Short excerpt<textarea value={postForm.excerpt} onChange={(event) => updatePostField('excerpt', event.target.value)} required /></label>
        </div>
        <label>Main article content<textarea className="adminBlogContentInput" value={postForm.content} onChange={(event) => updatePostField('content', event.target.value)} required /></label>
      </section>
      <section className="adminBlogPanel">
        <h2>Publishing</h2>
        <div className="adminBlogFormGrid">
          <label>Category<select value={postForm.category} onChange={(event) => { const category = categories.find((item) => item.name === event.target.value); setPostForm((v) => ({ ...v, category: event.target.value, categorySlug: category?.slug || slugify(event.target.value) })); }}>{categories.map((category) => <option key={category.id}>{category.name}</option>)}</select></label>
          <label>Status<select value={postForm.status} onChange={(event) => updatePostField('status', event.target.value)}>{['Draft', 'Pending Review', 'Scheduled', 'Published', 'Unpublished', 'Archived'].map((status) => <option key={status}>{status}</option>)}</select></label>
          <label>Publish date<input type="datetime-local" value={postForm.publishedAt ? postForm.publishedAt.slice(0, 16) : ''} onChange={(event) => updatePostField('publishedAt', event.target.value ? new Date(event.target.value).toISOString() : '')} /></label>
          <label>Schedule date<input type="datetime-local" value={postForm.scheduledAt ? postForm.scheduledAt.slice(0, 16) : ''} onChange={(event) => updatePostField('scheduledAt', event.target.value ? new Date(event.target.value).toISOString() : '')} /></label>
          <label>Reading time<input type="number" min="1" value={postForm.readingTime} onChange={(event) => updatePostField('readingTime', event.target.value)} /></label>
          <label>Tags<input value={postForm.tags} onChange={(event) => updatePostField('tags', event.target.value)} placeholder="AI, Career, Student Tips" /></label>
          <label>Related course<input value={postForm.relatedCourse} onChange={(event) => updatePostField('relatedCourse', event.target.value)} /></label>
          <label>Featured image URL<input value={postForm.image} onChange={(event) => updatePostField('image', event.target.value)} /></label>
          <label>Image alt text<input value={postForm.imageAlt} onChange={(event) => updatePostField('imageAlt', event.target.value)} /></label>
          <label>Image caption<input value={postForm.imageCaption} onChange={(event) => updatePostField('imageCaption', event.target.value)} /></label>
          <label><input type="checkbox" checked={postForm.featured} onChange={(event) => updatePostField('featured', event.target.checked)} /> Featured article</label>
          <label><input type="checkbox" checked={postForm.commentsEnabled} onChange={(event) => updatePostField('commentsEnabled', event.target.checked)} /> Enable comments</label>
        </div>
      </section>
      <section className="adminBlogPanel">
        <h2>Author & SEO</h2>
        <div className="adminBlogFormGrid">
          <label>Author name<input value={postForm.author.name} onChange={(event) => updateAuthorField('name', event.target.value)} /></label>
          <label>Author role<input value={postForm.author.role} onChange={(event) => updateAuthorField('role', event.target.value)} /></label>
          <label>Author avatar URL<input value={postForm.author.avatar} onChange={(event) => updateAuthorField('avatar', event.target.value)} /></label>
          <label>Author bio<textarea value={postForm.author.bio} onChange={(event) => updateAuthorField('bio', event.target.value)} /></label>
          <label>SEO title<input value={postForm.seoTitle} onChange={(event) => updatePostField('seoTitle', event.target.value)} /></label>
          <label>Meta description<textarea value={postForm.metaDescription} onChange={(event) => updatePostField('metaDescription', event.target.value)} /></label>
          <label>Focus keyword<input value={postForm.focusKeyword} onChange={(event) => updatePostField('focusKeyword', event.target.value)} /></label>
          <label>Canonical URL<input value={postForm.canonicalUrl} onChange={(event) => updatePostField('canonicalUrl', event.target.value)} /></label>
          <label><input type="checkbox" checked={postForm.noIndex} onChange={(event) => updatePostField('noIndex', event.target.checked)} /> No index</label>
          <label><input type="checkbox" checked={postForm.noFollow} onChange={(event) => updatePostField('noFollow', event.target.checked)} /> No follow</label>
        </div>
        <div className="adminBlogEditorActions"><button type="submit">{editingPostId ? 'Update Post' : 'Create Post'}</button><button type="button" onClick={resetPostForm}>Clear</button></div>
      </section>
    </form>
  );
}
