-- Create storage bucket for mentor assets (logos, videos)
-- Similar to investor-assets bucket

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('mentor-assets', 'mentor-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for mentor-assets bucket
-- Allow authenticated users to upload their own files
CREATE POLICY "Mentors can upload their own assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mentor-assets' AND
  (storage.foldername(name))[1] = 'mentor-logos' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow public read access
CREATE POLICY "Public can view mentor assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'mentor-assets');

-- Allow mentors to update their own files
CREATE POLICY "Mentors can update their own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'mentor-assets' AND
  (storage.foldername(name))[1] = 'mentor-logos' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow mentors to delete their own files
CREATE POLICY "Mentors can delete their own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'mentor-assets' AND
  (storage.foldername(name))[1] = 'mentor-logos' AND
  auth.uid()::text = (storage.foldername(name))[2]
);



