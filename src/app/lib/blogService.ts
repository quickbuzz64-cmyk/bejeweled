import { getSupabaseClient } from './supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  featuredImage: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostInput {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
  featuredImage?: string;
  status?: 'draft' | 'published';
}

// ── Slug helper ───────────────────────────────────────────────────────────────

export function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): BlogPost {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    slug: String(row.slug ?? ''),
    content: String(row.content ?? ''),
    excerpt: String(row.excerpt ?? ''),
    metaTitle: String(row.meta_title ?? ''),
    metaDescription: String(row.meta_description ?? ''),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    featuredImage: String(row.featured_image ?? ''),
    status: (row.status as 'draft' | 'published') ?? 'draft',
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Fetch all blog posts (admin — all statuses) */
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await getSupabaseClient()
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

/** Fetch only published posts (public blog listing) */
export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await getSupabaseClient()
    .from('blog_posts')
    .select('id, title, slug, excerpt, meta_title, meta_description, tags, featured_image, status, created_at, updated_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

/** Fetch a single published post by slug (public detail page) */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await getSupabaseClient()
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as Record<string, unknown>) : null;
}

/** Create a new blog post */
export async function createBlogPost(input: BlogPostInput): Promise<BlogPost> {
  const { data, error } = await getSupabaseClient()
    .from('blog_posts')
    .insert({
      title: input.title.trim(),
      slug: input.slug.trim() || titleToSlug(input.title),
      content: input.content,
      excerpt: input.excerpt?.trim() ?? '',
      meta_title: input.metaTitle?.trim() ?? '',
      meta_description: input.metaDescription?.trim() ?? '',
      tags: input.tags ?? [],
      featured_image: input.featuredImage?.trim() ?? '',
      status: input.status ?? 'draft',
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

/** Update an existing blog post */
export async function updateBlogPost(id: string, input: Partial<BlogPostInput>): Promise<void> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.slug !== undefined) updates.slug = input.slug.trim();
  if (input.content !== undefined) updates.content = input.content;
  if (input.excerpt !== undefined) updates.excerpt = input.excerpt.trim();
  if (input.metaTitle !== undefined) updates.meta_title = input.metaTitle.trim();
  if (input.metaDescription !== undefined) updates.meta_description = input.metaDescription.trim();
  if (input.tags !== undefined) updates.tags = input.tags;
  if (input.featuredImage !== undefined) updates.featured_image = input.featuredImage.trim();
  if (input.status !== undefined) updates.status = input.status;

  const { error } = await getSupabaseClient().from('blog_posts').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Delete a blog post */
export async function deleteBlogPost(id: string): Promise<void> {
  const { error } = await getSupabaseClient().from('blog_posts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Toggle publish status */
export async function toggleBlogPostStatus(id: string, currentStatus: 'draft' | 'published'): Promise<void> {
  const next = currentStatus === 'published' ? 'draft' : 'published';
  const { error } = await getSupabaseClient()
    .from('blog_posts')
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
