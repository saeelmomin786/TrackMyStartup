/**
 * Video URL Utilities
 * Supports multiple video platforms: YouTube, Vimeo, Google Drive, OneDrive, and direct video URLs
 */

export type VideoSource = 'youtube' | 'vimeo' | 'google_drive' | 'onedrive' | 'direct' | 'unknown';

export interface VideoEmbedInfo {
  embedUrl: string;
  source: VideoSource;
  videoId?: string;
}

/**
 * Converts various video URLs to embeddable format
 * Supports: YouTube, Vimeo, Google Drive, OneDrive, and direct video URLs
 */
export function getVideoEmbedUrl(url?: string | null, autoplay: boolean = false): VideoEmbedInfo | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url.trim());

    // YouTube URLs
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      let videoId: string | null = null;

      // youtube.com/watch?v=VIDEO_ID
      if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v');
        
        // youtube.com/embed/VIDEO_ID
        if (!videoId && urlObj.pathname.includes('/embed/')) {
          videoId = urlObj.pathname.split('/embed/')[1]?.split('?')[0];
        }
        
        // youtube.com/shorts/VIDEO_ID
        if (!videoId && urlObj.pathname.includes('/shorts/')) {
          videoId = urlObj.pathname.split('/shorts/')[1]?.split('?')[0];
        }
      }
      
      // youtu.be/VIDEO_ID
      if (!videoId && urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1).split('?')[0];
      }

      if (videoId) {
        const autoplayParam = autoplay ? '&autoplay=1&mute=1' : '';
        return {
          embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0${autoplayParam}`,
          source: 'youtube',
          videoId
        };
      }
    }

    // Vimeo URLs
    if (urlObj.hostname.includes('vimeo.com')) {
      // Extract video ID from path: vimeo.com/VIDEO_ID or vimeo.com/channels/.../VIDEO_ID
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      const videoId = pathParts[pathParts.length - 1];
      
      if (videoId && /^\d+$/.test(videoId)) {
        const autoplayParam = autoplay ? '&autoplay=1&muted=1' : '';
        return {
          embedUrl: `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0${autoplayParam}`,
          source: 'vimeo',
          videoId
        };
      }
    }

    // Google Drive URLs
    if (urlObj.hostname.includes('drive.google.com')) {
      let fileId: string | null = null;
      
      // If URL already contains /preview, it might already be an embed URL
      // Check if it's already in the correct format
      if (urlObj.pathname.includes('/preview')) {
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        const dIndex = pathParts.indexOf('d');
        if (dIndex >= 0 && dIndex + 1 < pathParts.length) {
          fileId = pathParts[dIndex + 1].split('?')[0].split('#')[0].trim();
        }
        // If we found a fileId and URL already has preview, return as-is (with autoplay if needed)
        if (fileId) {
          const autoplayParam = autoplay ? (url.includes('?') ? '&autoplay=1' : '?autoplay=1') : '';
          const embedUrl = url + autoplayParam;
          return {
            embedUrl,
            source: 'google_drive',
            videoId: fileId
          };
        }
      }
      
      // Pattern: drive.google.com/file/d/FILE_ID/view
      // Pattern: drive.google.com/file/d/FILE_ID/view?usp=sharing
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      const dIndex = pathParts.indexOf('d');
      if (dIndex >= 0 && dIndex + 1 < pathParts.length) {
        fileId = pathParts[dIndex + 1];
        // Remove any query parameters or fragments from fileId
        if (fileId) {
          fileId = fileId.split('?')[0].split('#')[0].trim();
        }
      }
      
      // Pattern: drive.google.com/open?id=FILE_ID
      if (!fileId) {
        fileId = urlObj.searchParams.get('id');
        if (fileId) {
          fileId = fileId.split('?')[0].split('#')[0].trim();
        }
      }
      
      // Pattern: drive.google.com/uc?id=FILE_ID
      if (!fileId && urlObj.pathname.includes('/uc')) {
        fileId = urlObj.searchParams.get('id');
        if (fileId) {
          fileId = fileId.split('?')[0].split('#')[0].trim();
        }
      }
      
      if (fileId && fileId.length > 0) {
        // Google Drive video embed URL - use preview endpoint
        const autoplayParam = autoplay ? '&autoplay=1' : '';
        const embedUrl = `https://drive.google.com/file/d/${fileId}/preview?usp=sharing${autoplayParam}`;
        return {
          embedUrl,
          source: 'google_drive',
          videoId: fileId
        };
      }
    }

    // OneDrive URLs
    if (urlObj.hostname.includes('onedrive.live.com') || urlObj.hostname === '1drv.ms') {
      // OneDrive embed format
      let embedUrl = url;
      
      // Convert 1drv.ms short links to embed format
      if (urlObj.hostname === '1drv.ms') {
        // Try to get the full URL (may need to follow redirect)
        embedUrl = url;
      }
      
      // Convert onedrive.live.com links to embed format
      if (urlObj.hostname.includes('onedrive.live.com')) {
        const resid = urlObj.searchParams.get('resid');
        const authkey = urlObj.searchParams.get('authkey');
        
        if (resid) {
          const authParam = authkey ? `&authkey=${encodeURIComponent(authkey)}` : '';
          const autoplayParam = autoplay ? '&autoplay=1' : '';
          embedUrl = `https://onedrive.live.com/embed?resid=${encodeURIComponent(resid)}${authParam}${autoplayParam}`;
        }
      }
      
      return {
        embedUrl,
        source: 'onedrive',
        videoId: urlObj.searchParams.get('resid') || undefined
      };
    }

    // Direct video URLs (MP4, WebM, MOV, etc.)
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
    const isDirectVideo = videoExtensions.some(ext => urlObj.pathname.toLowerCase().endsWith(ext));
    
    if (isDirectVideo) {
      return {
        embedUrl: url,
        source: 'direct',
        videoId: undefined
      };
    }

    // If URL already contains 'embed', assume it's already an embed URL
    if (url.includes('embed') || url.includes('player')) {
      const autoplayParam = autoplay ? (url.includes('?') ? '&autoplay=1' : '?autoplay=1') : '';
      return {
        embedUrl: url + autoplayParam,
        source: 'unknown',
        videoId: undefined
      };
    }

    // Unknown format - return as is
    return {
      embedUrl: url,
      source: 'unknown',
      videoId: undefined
    };

  } catch (error) {
    console.error('Error parsing video URL:', error);
    return null;
  }
}

/**
 * Check if a URL is a valid video URL
 */
export function isValidVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  
  const videoInfo = getVideoEmbedUrl(url);
  return videoInfo !== null && videoInfo.source !== 'unknown';
}

/**
 * Get video source type from URL
 */
export function getVideoSource(url?: string | null): VideoSource {
  if (!url) return 'unknown';
  
  const videoInfo = getVideoEmbedUrl(url);
  return videoInfo?.source || 'unknown';
}

