// Best-effort normalization of common share links into direct image URLs
// - Google Drive: converts file share links to uc?export=view&id=...
// - OneDrive: converts Live/OneDrive links to download URLs when possible
// Unknown providers are returned as-is

export function toDirectImageUrl(rawUrl: string | undefined | null): string | undefined {
	if (!rawUrl) return undefined;
	const url = rawUrl.trim();
	if (url.length === 0) return undefined;

	try {
		const u = new URL(url);

		// Google Drive patterns
		// Examples:
		// https://drive.google.com/file/d/FILE_ID/view?usp=sharing
		// https://drive.google.com/open?id=FILE_ID
		// https://drive.google.com/uc?id=FILE_ID
		if (u.hostname.includes('drive.google.com')) {
			let fileId = '';
			const parts = u.pathname.split('/');
			const dIdx = parts.indexOf('d');
			if (dIdx >= 0 && parts[dIdx + 1]) {
				fileId = parts[dIdx + 1];
			}
			if (!fileId) {
				const idParam = u.searchParams.get('id');
				if (idParam) fileId = idParam;
			}
			if (fileId) {
				return `https://drive.google.com/uc?export=view&id=${fileId}`;
			}
		}

		// OneDrive / Live
		// Common forms:
		// https://onedrive.live.com/?cid=...&resid=...&authkey=...
		// https://onedrive.live.com/redir?resid=...&authkey=...
		// https://onedrive.live.com/embed?resid=...&authkey=...
		// https://1drv.ms/i/s!...  (short links)
		if (u.hostname.includes('onedrive.live.com')) {
			const resid = u.searchParams.get('resid');
			const authkey = u.searchParams.get('authkey');
			if (resid) {
				const auth = authkey ? `&authkey=${encodeURIComponent(authkey)}` : '';
				return `https://onedrive.live.com/download?resid=${encodeURIComponent(resid)}${auth}`;
			}
		}
		if (u.hostname === '1drv.ms') {
			// Best effort: append download=1 to encourage direct file response
			u.searchParams.set('download', '1');
			return u.toString();
		}

		// SharePoint (OneDrive for Business) links
		// Example host: <tenant>-my.sharepoint.com
		// Approach: preserve existing query (often includes access token) and add download=1
		if (u.hostname.endsWith('sharepoint.com')) {
			u.searchParams.set('download', '1');
			return u.toString();
		}

		// LinkedIn: often not hotlinkable unless it's already a CDN asset; return as-is
		if (u.hostname.includes('linkedin.com') || u.hostname.includes('licdn.com')) {
			return url;
		}

		return url;
	} catch {
		// If not a valid URL, return as-is
		return url;
	}
}


