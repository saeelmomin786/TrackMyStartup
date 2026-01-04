import { supabase } from './supabase';

export interface BlogPost {
  id: string;
  title: string;
  subtitle: string; // Short excerpt
  coverImage?: string;
  category: string;
  content: string; // Rich text content
  publishDate: string; // ISO date string (YYYY-MM-DD)
  slug: string; // Auto-generated from title
  createdAt: string;
  createdBy?: string | null;
}

export interface CreateBlogPostInput {
  title: string;
  subtitle: string;
  coverImage?: string;
  category: string;
  content: string;
  publishDate: string; // YYYY-MM-DD
}

// Helper function to create slug from title
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

class BlogsService {
  private table = 'blogs';

  async create(post: CreateBlogPostInput): Promise<BlogPost> {
    const slug = createSlug(post.title);
    
    // Check if slug already exists, append number if needed
    let finalSlug = slug;
    let counter = 1;
    while (true) {
      const { data: existing } = await supabase
        .from(this.table)
        .select('id')
        .eq('slug', finalSlug)
        .single();
      
      if (!existing) break;
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    const insertData: any = {
      title: post.title.trim(),
      subtitle: post.subtitle.trim(),
      category: post.category,
      content: post.content.trim(),
      publish_date: post.publishDate,
      slug: finalSlug
    };

    if (post.coverImage && post.coverImage.trim().length > 0) {
      insertData.cover_image = post.coverImage.trim();
    }

    const { data, error } = await supabase
      .from(this.table)
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return this.mapRow(data);
  }

  async listAll(): Promise<BlogPost[]> {
    const { data, error } = await supabase
      .from(this.table)
      .select('*')
      .order('publish_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapRow);
  }

  async getBySlug(slug: string): Promise<BlogPost | null> {
    const { data, error } = await supabase
      .from(this.table)
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data ? this.mapRow(data) : null;
  }

  async getById(id: string): Promise<BlogPost | null> {
    const { data, error } = await supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data ? this.mapRow(data) : null;
  }

  async update(id: string, post: CreateBlogPostInput): Promise<BlogPost> {
    const slug = createSlug(post.title);
    
    // Check if slug already exists (excluding current post)
    let finalSlug = slug;
    let counter = 1;
    while (true) {
      const { data: existing } = await supabase
        .from(this.table)
        .select('id')
        .eq('slug', finalSlug)
        .neq('id', id)
        .single();
      
      if (!existing) break;
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    const updateData: any = {
      title: post.title.trim(),
      subtitle: post.subtitle.trim(),
      category: post.category,
      content: post.content.trim(),
      publish_date: post.publishDate,
      slug: finalSlug
    };

    if (post.coverImage && post.coverImage.trim().length > 0) {
      updateData.cover_image = post.coverImage.trim();
    } else {
      updateData.cover_image = null;
    }

    const { data, error } = await supabase
      .from(this.table)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return this.mapRow(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  private mapRow = (row: any): BlogPost => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    coverImage: row.cover_image || undefined,
    category: row.category,
    content: row.content,
    publishDate: row.publish_date,
    slug: row.slug,
    createdAt: row.created_at,
    createdBy: row.created_by ?? null
  });
}

export const blogsService = new BlogsService();



