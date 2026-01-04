import React, { useEffect, useState, useRef } from 'react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { blogsService, BlogPost } from '../../lib/blogsService';
import { toDirectImageUrl } from '../../lib/imageUrl';
import { storageService } from '../../lib/storage';
import { Calendar, Trash2, Edit, ExternalLink, Upload, X } from 'lucide-react';

const AdminBlogsTab: React.FC = () => {
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    coverImage: '',
    category: '',
    content: '',
    publishDate: ''
  });
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);

  const categories = [
    'Startups',
    'Fundraising & Investors',
    'Mentorship',
    'Compliance & Legal',
    'Growth & Scaling',
    'Ecosystem & Policy',
    'Events & Announcements'
  ];

  const loadPosts = async () => {
    try {
      const data = await blogsService.listAll();
      setPosts(data);
    } catch (e) {
      console.error('Failed to load blog posts', e);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleEdit = (post: BlogPost) => {
    setEditingPostId(post.id);
    setForm({
      title: post.title,
      subtitle: post.subtitle,
      coverImage: post.coverImage || '',
      category: post.category,
      content: post.content,
      publishDate: post.publishDate
    });
    setCoverImageFile(null);
    setCoverImagePreview(post.coverImage || null);
    
    // Scroll to form
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setForm({
      title: '',
      subtitle: '',
      coverImage: '',
      category: '',
      content: '',
      publishDate: ''
    });
    setCoverImageFile(null);
    setCoverImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      setCoverImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setCoverImageFile(null);
    setCoverImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // If editing, keep the existing image URL
    if (!editingPostId) {
      setForm(prev => ({ ...prev, coverImage: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.subtitle || !form.category || !form.content || !form.publishDate) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (form.subtitle.length > 200) {
      alert('Subtitle must be 200 characters or less');
      return;
    }

    setLoading(true);
    try {
      let coverImageUrl = form.coverImage;

      // Upload new image if a file was selected
      if (coverImageFile) {
        setUploadingImage(true);
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const safeFileName = coverImageFile.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
          const fileName = `blog-covers/${timestamp}_${safeFileName}`;
          
          const uploadResult = await storageService.uploadFile(
            coverImageFile,
            'blog-images',
            fileName
          );

          if (!uploadResult.success || !uploadResult.url) {
            throw new Error(uploadResult.error || 'Failed to upload image');
          }

          coverImageUrl = uploadResult.url;
        } catch (uploadError: any) {
          console.error('Error uploading cover image:', uploadError);
          alert(`Failed to upload cover image: ${uploadError.message || 'Unknown error'}`);
          setUploadingImage(false);
          setLoading(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      const postData = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        coverImage: coverImageUrl || undefined,
        category: form.category,
        content: form.content.trim(),
        publishDate: form.publishDate
      };

      if (editingPostId) {
        await blogsService.update(editingPostId, postData);
      } else {
        await blogsService.create(postData);
      }

      setEditingPostId(null);
      setForm({
        title: '',
        subtitle: '',
        coverImage: '',
        category: '',
        content: '',
        publishDate: ''
      });
      setCoverImageFile(null);
      setCoverImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadPosts();
    } catch (e: any) {
      console.error(`Failed to ${editingPostId ? 'update' : 'create'} blog post`, e);
      const msg = e?.message || (e?.error?.message) || 'Unknown error';
      alert(`Failed to ${editingPostId ? 'update' : 'create'} blog. Server error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog post?')) return;
    try {
      await blogsService.delete(id);
      await loadPosts();
    } catch (e: any) {
      console.error('Failed to delete blog post', e);
      const msg = e?.message || (e?.error?.message) || 'Unknown error';
      alert(`Failed to delete blog. Server error: ${msg}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-slate-700 mb-4">
          {editingPostId ? 'Edit Blog Post' : 'Create New Blog Post'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Blog Title *"
            placeholder="e.g., 10 Tips for Startup Success"
            value={form.title}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Short Subtitle / Excerpt * <span className="text-xs text-slate-500">(max 200 characters)</span>
            </label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="A brief preview text that appears on blog cards..."
              value={form.subtitle}
              onChange={e => {
                if (e.target.value.length <= 200) {
                  setForm(prev => ({ ...prev, subtitle: e.target.value }));
                }
              }}
              required
              maxLength={200}
            />
            <p className="text-xs text-slate-500 mt-1">
              {form.subtitle.length} / 200 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
            <select
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.category}
              onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
              required
            >
              <option value="">Select a category...</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Cover Image (optional)
              <span className="text-xs text-slate-500 ml-2">16:9 aspect ratio recommended, max 5MB</span>
            </label>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="cover-image-upload"
                disabled={uploadingImage || loading}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage || loading}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {coverImageFile ? 'Change Image' : 'Upload Image'}
                </Button>
                {coverImageFile && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage || loading}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                )}
                {uploadingImage && (
                  <span className="text-sm text-slate-500">Uploading...</span>
                )}
              </div>
              {(coverImagePreview || form.coverImage) && (
                <div className="mt-2">
                  <img 
                    src={coverImagePreview || toDirectImageUrl(form.coverImage)} 
                    alt="Cover preview" 
                    className="max-w-xs h-32 object-cover rounded border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Blog Content *</label>
            <p className="text-xs text-slate-500 mb-2">
              Write your content normally. Line breaks and paragraphs will be preserved automatically. 
              You can use HTML tags for additional formatting (headings, lists, links, images).
            </p>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed"
              rows={15}
              placeholder="Write your blog content here...

Press Enter for a new line.
Press Enter twice for a new paragraph.

You can use HTML tags like:
- &lt;h2&gt;Heading&lt;/h2&gt;
- &lt;strong&gt;Bold text&lt;/strong&gt;
- &lt;em&gt;Italic text&lt;/em&gt;
- &lt;ul&gt;&lt;li&gt;List items&lt;/li&gt;&lt;/ul&gt;
- &lt;a href=&quot;url&quot;&gt;Links&lt;/a&gt;"
              value={form.content}
              onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Publish Date *</label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <input
                type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.publishDate}
                onChange={e => setForm(prev => ({ ...prev, publishDate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            {editingPostId && (
              <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={loading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? (editingPostId ? 'Updating...' : 'Creating...') : (editingPostId ? 'Update Blog' : 'Create Blog')}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-slate-700 mb-4">All Blog Posts</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cover</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Publish Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {posts.map(p => (
                <tr key={p.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">{p.title}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-1">{p.subtitle}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {p.coverImage ? (
                      <img 
                        src={toDirectImageUrl(p.coverImage)} 
                        alt={p.title} 
                        className="h-16 w-28 object-cover rounded border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{p.publishDate}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex gap-2 justify-end">
                      <a href={`/blogs/${p.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                          <ExternalLink className="h-4 w-4 mr-1" /> View
                        </Button>
                      </a>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        type="button"
                        onClick={() => handleEdit(p)} 
                        className="border-green-300 text-green-600 hover:bg-green-50"
                        disabled={editingPostId === p.id}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDelete(p.id)} 
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        disabled={editingPostId === p.id}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-center text-slate-500" colSpan={5}>No blog posts yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminBlogsTab;

