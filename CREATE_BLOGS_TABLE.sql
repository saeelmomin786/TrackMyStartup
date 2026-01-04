-- =====================================================
-- BLOGS TABLE SETUP
-- =====================================================
-- Run this in your Supabase SQL Editor to create the blogs table
-- =====================================================

-- Create blogs table
CREATE TABLE IF NOT EXISTS public.blogs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL, -- Short excerpt (max 200 characters)
    cover_image TEXT, -- URL to cover image (16:9 aspect ratio recommended)
    category TEXT NOT NULL CHECK (category IN (
        'Startups',
        'Fundraising & Investors',
        'Mentorship',
        'Compliance & Legal',
        'Growth & Scaling',
        'Ecosystem & Policy',
        'Events & Announcements'
    )),
    content TEXT NOT NULL, -- Rich text content (HTML)
    publish_date DATE NOT NULL, -- Used for ordering (latest first)
    slug TEXT NOT NULL UNIQUE, -- Auto-generated from title for URL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON public.blogs(slug);

-- Create index on publish_date for sorting
CREATE INDEX IF NOT EXISTS idx_blogs_publish_date ON public.blogs(publish_date DESC);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_blogs_category ON public.blogs(category);

-- Enable Row Level Security (RLS)
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read published blogs
CREATE POLICY "Anyone can read blogs"
    ON public.blogs
    FOR SELECT
    USING (true);

-- Policy: Only admins can insert blogs
-- Using a simpler check to avoid RLS recursion issues
CREATE POLICY "Only admins can insert blogs"
    ON public.blogs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Check users table first
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'Admin'
        )
        OR
        -- Also check user_profiles table (for multi-profile system)
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.auth_user_id = auth.uid()
            AND user_profiles.role = 'Admin'
        )
    );

-- Policy: Only admins can update blogs
CREATE POLICY "Only admins can update blogs"
    ON public.blogs
    FOR UPDATE
    TO authenticated
    USING (
        -- Check users table first
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'Admin'
        )
        OR
        -- Also check user_profiles table (for multi-profile system)
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.auth_user_id = auth.uid()
            AND user_profiles.role = 'Admin'
        )
    );

-- Policy: Only admins can delete blogs
CREATE POLICY "Only admins can delete blogs"
    ON public.blogs
    FOR DELETE
    TO authenticated
    USING (
        -- Check users table first
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'Admin'
        )
        OR
        -- Also check user_profiles table (for multi-profile system)
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.auth_user_id = auth.uid()
            AND user_profiles.role = 'Admin'
        )
    );

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. The slug is auto-generated from the title in the application code
-- 2. If a slug already exists, a number is appended (e.g., "my-blog", "my-blog-1")
-- 3. Blogs are ordered by publish_date DESC (latest first)
-- 4. The content field supports HTML formatting
-- 5. Cover images should be 16:9 aspect ratio for best display
-- =====================================================

