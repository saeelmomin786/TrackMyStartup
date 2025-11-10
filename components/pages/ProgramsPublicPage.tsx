import React, { useEffect, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { adminProgramsService, AdminProgramPost } from '../../lib/adminProgramsService';
import { toDirectImageUrl } from '../../lib/imageUrl';
import { Share2, Video } from 'lucide-react';
import { messageService } from '../../lib/messageService';

interface OpportunityItem {
	id: string;
	programName: string;
	description: string;
	deadline: string;
	posterUrl?: string;
	videoUrl?: string;
	facilitatorName?: string;
}

const ProgramsPublicPage: React.FC = () => {
	const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
	const [adminPosts, setAdminPosts] = useState<AdminProgramPost[]>([]);
	const [isImageModalOpen, setIsImageModalOpen] = useState(false);
	const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
	const [selectedImageAlt, setSelectedImageAlt] = useState<string>('');
	const [showLoginPrompt, setShowLoginPrompt] = useState(false);

	useEffect(() => {
		let mounted = true;
		(async () => {
			// Load public opportunities (facilitator posted)
			const { data, error } = await supabase
				.from('incubation_opportunities')
				.select('*')
				.order('created_at', { ascending: false });
			if (!mounted) return;
			if (!error && Array.isArray(data)) {
				const mapped: OpportunityItem[] = data.map((row: any) => ({
					id: row.id,
					programName: row.program_name,
					description: row.description || '',
					deadline: row.deadline || '',
					posterUrl: row.poster_url || undefined,
					videoUrl: row.video_url || undefined,
					facilitatorName: 'Program Facilitator'
				}));
				setOpportunities(mapped);
			}
			// Load admin posted programs
			try {
				const posts = await adminProgramsService.listActive();
				if (mounted) setAdminPosts(posts);
			} catch (e) {
				console.warn('Failed to load admin program posts', e);
				if (mounted) setAdminPosts([]);
			}
		})();
		return () => { mounted = false; };
	}, []);

	const todayStr = new Date().toISOString().split('T')[0];
	const isPast = (dateStr: string) => new Date(dateStr) < new Date(todayStr);
	const isToday = (dateStr: string) => dateStr === todayStr;

	const getYoutubeEmbedUrl = (url?: string): string | null => {
		if (!url) return null;
		try {
			const u = new URL(url);
			if (u.hostname.includes('youtube.com')) {
				const vid = u.searchParams.get('v');
				return vid ? `https://www.youtube.com/embed/${vid}` : null;
			}
			if (u.hostname === 'youtu.be') {
				const id = u.pathname.replace('/', '');
				return id ? `https://www.youtube.com/embed/${id}` : null;
			}
		} catch {}
		return null;
	};

	const openImageModal = (imageUrl: string, altText: string) => {
		setSelectedImageUrl(toDirectImageUrl(imageUrl) || imageUrl);
		setSelectedImageAlt(altText);
		setIsImageModalOpen(true);
	};

	const handleShareOpportunity = async (opp: OpportunityItem) => {
		try {
			const url = new URL(window.location.origin);
			url.searchParams.set('view', 'program');
			url.searchParams.set('opportunityId', opp.id);
			const shareUrl = url.toString();
			const text = `${opp.programName}\nDeadline: ${opp.deadline || '—'}`;
			if (navigator.share) {
				await navigator.share({ title: opp.programName, text, url: shareUrl });
			} else if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(`${text}\n\n${shareUrl}`);
				messageService.success('Copied', 'Shareable link copied to clipboard', 2000);
			} else {
				const ta = document.createElement('textarea');
				ta.value = `${text}\n\n${shareUrl}`;
				document.body.appendChild(ta);
				ta.select();
				document.execCommand('copy');
				document.body.removeChild(ta);
				messageService.success('Copied', 'Shareable link copied to clipboard', 2000);
			}
		} catch {
			messageService.error('Share Failed', 'Unable to share link.');
		}
	};

	const promptLogin = () => setShowLoginPrompt(true);
	const handleLogin = () => {
		const currentUrl = window.location.href;
		const url = new URL(window.location.origin);
		url.searchParams.set('page', 'login');
		url.searchParams.set('returnUrl', currentUrl);
		window.location.href = url.toString();
	};
	const handleRegister = () => {
		const currentUrl = window.location.href;
		const url = new URL(window.location.origin);
		url.searchParams.set('page', 'register');
		url.searchParams.set('returnUrl', currentUrl);
		window.location.href = url.toString();
	};

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
				<div className="text-center space-y-2">
					<h1 className="text-3xl font-bold text-slate-900">Programs</h1>
					<p className="text-slate-600">Explore accelerator and incubation programs. Sign in to apply.</p>
				</div>

				{opportunities.length > 0 ? (
					<div>
						<h2 className="text-xl font-semibold text-slate-800 mb-4">Open Opportunities</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{opportunities.map(opp => {
								const embedUrl = getYoutubeEmbedUrl(opp.videoUrl);
								const canApply = !isPast(opp.deadline);
								return (
									<Card key={opp.id} className="flex flex-col !p-0 overflow-hidden">
										{embedUrl ? (
											<div className="relative w-full aspect-video bg-slate-800">
												<iframe src={embedUrl} title={`Video for ${opp.programName}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute top-0 left-0 w-full h-full"></iframe>
											</div>
										) : opp.posterUrl ? (
											<img
												src={toDirectImageUrl(opp.posterUrl) || opp.posterUrl}
												alt={`${opp.programName} poster`}
												className="w-full h-40 object-contain bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity"
												onClick={() => openImageModal(opp.posterUrl!, `${opp.programName} poster`)}
											/>
										) : (
											<div className="w-full h-40 bg-slate-200 flex items-center justify-center text-slate-500">
												<Video className="h-10 w-10" />
											</div>
										)}
										<div className="p-4 flex flex-col flex-grow">
											<div className="flex-grow">
												<div className="flex items-start justify-between gap-2">
													<div>
														<p className="text-sm font-medium text-brand-primary">{opp.facilitatorName || 'Program Facilitator'}</p>
														<h3 className="text-lg font-semibold text-slate-800 mt-1">{opp.programName}</h3>
													</div>
													<Button type="button" variant="outline" title="Share program" onClick={() => handleShareOpportunity(opp)}>
														<Share2 className="h-4 w-4" />
													</Button>
												</div>
												<p className="text-sm text-slate-500 mt-2 mb-4">{opp.description.substring(0, 100)}...</p>
											</div>
											<div className="border-t pt-4 mt-4">
												<div className="flex items-center justify-between">
													<p className="text-xs text-slate-500">Deadline: <span className="font-semibold">{opp.deadline}</span></p>
													{isToday(opp.deadline) && (
														<span className="ml-2 inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-[10px] font-medium whitespace-nowrap">Applications closing today</span>
													)}
												</div>
												{canApply ? (
													<Button type="button" className="w-full mt-3" onClick={promptLogin}>
														Apply for Program
													</Button>
												) : (
													<Button type="button" className="w-full mt-3" variant="secondary" disabled>
														Application closed
													</Button>
												)}
											</div>
										</div>
									</Card>
								);
							})}
						</div>
					</div>
				) : (
					<Card className="text-center py-12">
						<h3 className="text-xl font-semibold">No Opportunities Available</h3>
						<p className="text-slate-500 mt-2">Please check back later for new programs and offerings.</p>
					</Card>
				)}

				<div className="space-y-3 sm:space-y-4">
					<h2 className="text-xl font-semibold text-slate-800">Other Program</h2>
					{adminPosts.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{adminPosts.map(p => (
								<Card key={p.id} className="flex flex-col !p-0 overflow-hidden">
									{p.posterUrl ? (
										<img
											src={toDirectImageUrl(p.posterUrl) || p.posterUrl}
											alt={`${p.programName} poster`}
											className="w-full h-40 object-contain bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity"
											onClick={() => openImageModal(p.posterUrl!, `${p.programName} poster`)}
										/>
									) : (
										<div className="w-full h-40 bg-slate-200 flex items-center justify-center text-slate-500">
											<Video className="h-10 w-10" />
										</div>
									)}
									<div className="p-4 flex flex-col flex-grow">
										<div className="flex-grow">
											<p className="text-sm font-medium text-brand-primary">{p.incubationCenter}</p>
											<h3 className="text-lg font-semibold text-slate-800 mt-1">{p.programName}</h3>
											<p className="text-xs text-slate-500 mt-2">Deadline: <span className="font-semibold">{p.deadline}</span></p>
										</div>
										<div className="border-t pt-4 mt-4">
											<Button className="w-full" onClick={promptLogin}>
												Apply
											</Button>
										</div>
									</div>
								</Card>
							))}
						</div>
					) : (
						<Card className="text-center py-10">
							<p className="text-slate-500">No programs posted by admin yet.</p>
						</Card>
					)}
				</div>
			</div>

			{/* Image Modal */}
			<Modal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} title={selectedImageAlt} size="4xl">
				<div className="flex justify-center items-center p-4">
					<img
						src={selectedImageUrl}
						alt={selectedImageAlt}
						className="max-w-full max-h-[80vh] object-contain"
					/>
				</div>
			</Modal>

			{/* Login Prompt Modal */}
			<Modal isOpen={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} title="Login Required">
				<div className="text-center space-y-4">
					<p className="text-slate-600">To apply for programs, please login or register.</p>
					<div className="flex gap-3 justify-center">
						<Button onClick={handleLogin} variant="outline">
							Login
						</Button>
						<Button onClick={handleRegister}>
							Register
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
};

export default ProgramsPublicPage;


