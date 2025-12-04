import React, { useEffect, useState } from 'react';
import { ArrowLeft, Share2, Calendar, Building2 } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { supabase } from '../lib/supabase';
import { messageService } from '../lib/messageService';
import { toDirectImageUrl } from '../lib/imageUrl';
import { getQueryParam } from '../lib/urlState';

interface AdminProgram {
  id: string;
  programName: string;
  incubationCenter: string;
  deadline: string;
  applicationLink: string;
  description?: string;
  posterUrl?: string;
}

const PublicAdminProgramView: React.FC = () => {
  const [program, setProgram] = useState<AdminProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [selectedImageAlt, setSelectedImageAlt] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const programId = getQueryParam('programId');
  const todayStr = new Date().toISOString().split('T')[0];
  const isPast = (dateStr: string) => new Date(dateStr) < new Date(todayStr);
  const isToday = (dateStr: string) => dateStr === todayStr;

  useEffect(() => {
    // Check current auth status so we can allow direct apply for logged-in users
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setIsLoggedIn(!!data.user);
      } catch {
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!programId) {
      window.location.href = '/';
      return;
    }

    const loadProgram = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_program_posts')
          .select('id, program_name, incubation_center, deadline, application_link, description, poster_url')
          .eq('id', programId)
          .maybeSingle();

        if (error || !data) {
          throw error || new Error('Program not found');
        }

        setProgram({
          id: data.id,
          programName: data.program_name,
          incubationCenter: data.incubation_center,
          deadline: data.deadline,
          applicationLink: data.application_link,
          description: data.description || undefined,
          posterUrl: data.poster_url || undefined
        });
      } catch (err) {
        console.error('Failed to load admin program', err);
        messageService.error('Program Not Found', 'This program may have been removed or is no longer available.');
        setTimeout(() => { window.location.href = '/'; }, 2500);
      } finally {
        setLoading(false);
      }
    };

    loadProgram();
  }, [programId]);

  const handleShare = async () => {
    if (!program) return;
    try {
      const url = new URL(window.location.origin);
      url.searchParams.set('view', 'admin-program');
      url.searchParams.set('programId', program.id);

      const shareUrl = url.toString();
      const text = `${program.programName}\nDeadline: ${program.deadline || '—'}`;

      if (navigator.share) {
        await navigator.share({ title: program.programName, text, url: shareUrl });
      } else if (navigator.clipboard?.writeText) {
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
    } catch (error) {
      console.error('Failed to share admin program', error);
      messageService.error('Share Failed', 'Unable to share link.');
    }
  };

  const handleApplyClick = () => {
    if (isLoggedIn) {
      if (program?.applicationLink) {
        try {
          window.open(program.applicationLink, '_blank', 'noopener,noreferrer');
        } catch {
          window.location.href = program.applicationLink;
        }
      }
      return;
    }
    setShowLoginPrompt(true);
  };

  const redirectToAuth = (page: 'login' | 'register') => {
    const currentUrl = window.location.href;
    const url = new URL(window.location.origin);
    url.searchParams.set('page', page);
    url.searchParams.set('returnUrl', currentUrl);
    window.location.href = url.toString();
  };

  const openImageModal = (imageUrl: string, alt: string) => {
    setSelectedImageUrl(toDirectImageUrl(imageUrl) || imageUrl);
    setSelectedImageAlt(alt);
    setIsImageModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading program...</p>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">Program Not Found</h1>
          <p className="text-slate-600">This program may have been removed or is no longer available.</p>
          <Button onClick={() => { window.location.href = '/'; }}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
          <Button onClick={() => { window.location.href = '/'; }} variant="outline" className="w-full sm:w-auto justify-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <Button onClick={handleShare} variant="outline" className="w-full sm:w-auto justify-center">
            <Share2 className="h-4 w-4 mr-2" />
            Share Program
          </Button>
        </div>

        <Card className="!p-0 overflow-hidden">
          {program.posterUrl && (
            <img
              src={toDirectImageUrl(program.posterUrl) || program.posterUrl}
              alt={`${program.programName} poster`}
              className="w-full h-52 sm:h-64 object-contain bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => openImageModal(program.posterUrl!, `${program.programName} poster`)}
            />
          )}

          <div className="p-4 sm:p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                <p className="text-sm font-semibold text-brand-primary flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {program.incubationCenter}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{program.programName}</h1>
                {program.description && (
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {program.description}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <Card className="bg-slate-50/80 border rounded-xl shadow-sm p-4 space-y-4 h-full flex flex-col justify-between">
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-slate-800 flex items-center justify-between">
                      <span>Program Overview</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          !isPast(program.deadline)
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {!isPast(program.deadline) ? 'Open for applications' : 'Applications closed'}
                      </span>
                    </h3>
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4 text-slate-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-700">Application Deadline</p>
                        <p>{program.deadline}</p>
                      </div>
                    </div>
                    {isToday(program.deadline) && (
                      <div className="inline-block px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium">
                        Applications closing today
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    {!isPast(program.deadline) ? (
                      <Button className="w-full" onClick={handleApplyClick}>
                        Apply for Program
                      </Button>
                    ) : (
                      <Button className="w-full" variant="secondary" disabled>
                        Application closed
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Modal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} title={selectedImageAlt}>
        <div className="text-center">
          <img
            src={selectedImageUrl}
            alt={selectedImageAlt}
            className="max-w-full max-h-96 mx-auto rounded-lg"
          />
        </div>
      </Modal>

      <Modal isOpen={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} title="Login Required">
        <div className="text-center space-y-4">
          <p className="text-slate-600">To apply for this program, please login or register.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => redirectToAuth('login')} variant="outline">
              Login
            </Button>
            <Button onClick={() => redirectToAuth('register')}>
              Register
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PublicAdminProgramView;

