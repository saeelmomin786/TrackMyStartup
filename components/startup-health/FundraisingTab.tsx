import React, { useEffect, useState } from 'react';
import { FundraisingDetails, InvestmentType, Startup, StartupDomain, StartupStage, UserRole } from '../../types';
import { capTableService } from '../../lib/capTableService';
import { AuthUser } from '../../lib/auth';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import CloudDriveInput from '../ui/CloudDriveInput';
import { formatCurrency } from '../../lib/utils';
import { messageService } from '../../lib/messageService';
import { TrendingUp, DollarSign, Percent, Building2, Share2, ExternalLink, Video, FileText, Heart, CheckCircle } from 'lucide-react';

interface FundraisingTabProps {
  startup: Startup;
  userRole?: UserRole;
  user?: AuthUser;
  isViewOnly?: boolean;
  onActivateFundraising?: (details: FundraisingDetails, startup: Startup) => void;
}

const FundraisingTab: React.FC<FundraisingTabProps> = ({
  startup,
  userRole,
  user,
  isViewOnly = false,
  onActivateFundraising,
}) => {
  const canEdit = (userRole === 'Startup' || userRole === 'Admin') && !isViewOnly;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingRounds, setExistingRounds] = useState<FundraisingDetails[]>([]);
  const [fundraising, setFundraising] = useState<FundraisingDetails>({
    active: false,
    type: InvestmentType.Seed,
    value: 0,
    equity: 0,
    validationRequested: false,
    pitchDeckUrl: '',
    pitchVideoUrl: '',
  });
  const [pitchDeckFile, setPitchDeckFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!startup?.id) return;
      setIsLoading(true);
      setError(null);
      try {
        const rounds = await capTableService.getFundraisingDetails(startup.id);
        setExistingRounds(rounds);
        if (rounds.length > 0) {
          setFundraising(rounds[0]);
        }
      } catch (e: any) {
        console.error('Error loading fundraising details:', e);
        setError('Failed to load fundraising details');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [startup?.id]);

  const handleChange = (field: keyof FundraisingDetails, value: any) => {
    setFundraising(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!startup?.id) return;
    setIsSaving(true);
    setError(null);

    try {
      let pitchDeckUrl = fundraising.pitchDeckUrl;

      if (pitchDeckFile) {
        try {
          pitchDeckUrl = await capTableService.uploadPitchDeck(pitchDeckFile, startup.id);
        } catch (e) {
          console.warn('Pitch deck upload failed (non‑blocking):', e);
        }
      }

      const toSave: FundraisingDetails = {
        ...fundraising,
        value: Number(fundraising.value) || 0,
        equity: Number(fundraising.equity) || 0,
        pitchDeckUrl,
      };

      const saved = await capTableService.updateFundraisingDetails(startup.id, toSave);
      setExistingRounds([saved, ...existingRounds]);
      setFundraising(saved);

      if (onActivateFundraising) {
        onActivateFundraising(saved, startup);
      }

      messageService.success('Fundraising updated', 'Your fundraising round has been saved.', 3000);
    } catch (e: any) {
      console.error('Error saving fundraising details:', e);
      setError(e?.message || 'Failed to save fundraising details');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <span className="inline-block h-4 w-4 border-2 border-b-transparent border-slate-400 rounded-full animate-spin" />
          Loading fundraising details...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2 rounded">
          {error}
        </div>
      )}

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Current Fundraising Round</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Manage your active fundraising round separately from equity allocation.
            </p>
          </div>
          {canEdit && (
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={fundraising.active}
                onChange={e => handleChange('active', e.target.checked)}
              />
              <span className="text-slate-700">Fundraising Active</span>
            </label>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Select
              label="Round Type"
              id="fr-type"
              value={fundraising.type || ''}
              onChange={e => handleChange('type', (e.target as HTMLSelectElement).value as InvestmentType)}
              disabled={!canEdit}
            >
              {Object.values(InvestmentType).map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Input
              label="Amount Raising"
              type="number"
              value={fundraising.value || ''}
              onChange={e => handleChange('value', Number(e.target.value))}
              disabled={!canEdit}
              placeholder="5000000"
            />
            <Input
              label="Equity Offered (%)"
              type="number"
              value={fundraising.equity || ''}
              onChange={e => handleChange('equity', Number(e.target.value))}
              disabled={!canEdit}
              placeholder="15"
            />
            <Select
              label="Stage"
              id="fr-stage"
              value={fundraising.stage || ''}
              onChange={e => handleChange('stage', (e.target as HTMLSelectElement).value as StartupStage)}
              disabled={!canEdit}
            >
              {Object.values(StartupStage).map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select
              label="Domain"
              id="fr-domain"
              value={fundraising.domain || ''}
              onChange={e => handleChange('domain', (e.target as HTMLSelectElement).value as StartupDomain)}
              disabled={!canEdit}
            >
              <option value="">Select your startup sector</option>
              {Object.values(StartupDomain).map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-3">
            <CloudDriveInput
              label="Pitch Deck"
              value={fundraising.pitchDeckUrl || ''}
              onChange={url => {
                // When user pastes/changes URL, clear file and keep URL
                setPitchDeckFile(null);
                handleChange('pitchDeckUrl', url);
              }}
              onFileSelect={file => {
                if (file) {
                  setPitchDeckFile(file);
                  // Clear URL when a new file is selected
                  handleChange('pitchDeckUrl', '');
                } else {
                  setPitchDeckFile(null);
                }
              }}
              disabled={!canEdit}
              helperText="Upload updated pitch deck for this round"
              accept=".pdf"
              maxSize={10}
              documentType="pitch deck"
              showPrivacyMessage={false}
            />
            <Input
              label="Pitch Video URL"
              value={fundraising.pitchVideoUrl || ''}
              onChange={e => handleChange('pitchVideoUrl', e.target.value)}
              disabled={!canEdit}
              placeholder="https://..."
            />
            <label className="inline-flex items-center gap-2 text-sm mt-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={!!fundraising.validationRequested}
                onChange={e => handleChange('validationRequested', e.target.checked)}
                disabled={!canEdit}
              />
              <span className="text-slate-700">Request valuation / diligence support</span>
            </label>
          </div>
        </div>

        {canEdit && (
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving ? 'Saving...' : 'Save Fundraising'}
            </Button>
          </div>
        )}
      </Card>

      {/* Fundraising Card Display - Same design as Discover page */}
      {fundraising && (fundraising.active || fundraising.value > 0 || fundraising.equity > 0) && (
        <div className="mb-6">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-slate-900">Your Fundraising Card</h3>
            <p className="text-xs text-slate-500">This is how investors will see your fundraising details on the Discover page</p>
          </div>
          <Card className="!p-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white">
            {/* Video Section */}
            <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
              {(() => {
                const getYoutubeEmbedUrl = (url?: string): string | null => {
                  if (!url) return null;
                  try {
                    const urlObj = new URL(url);
                    if (urlObj.hostname.includes('youtube.com')) {
                      const videoId = urlObj.searchParams.get('v');
                      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
                    } else if (urlObj.hostname.includes('youtu.be')) {
                      const videoId = urlObj.pathname.slice(1);
                      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
                    }
                  } catch {
                    return null;
                  }
                  return null;
                };
                const embedUrl = getYoutubeEmbedUrl(fundraising.pitchVideoUrl);
                return embedUrl ? (
                  <div className="relative w-full h-full">
                    <iframe
                      src={embedUrl}
                      title={`Pitch video for ${startup.name}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute top-0 left-0 w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Video className="h-16 w-16 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No video available</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Content Section */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">{startup.name}</h3>
                  <p className="text-slate-600 font-medium mb-2">{startup.sector || fundraising.domain || 'Not specified'}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {fundraising.type && (
                      <span className="text-slate-500">
                        <span className="font-medium text-slate-700">Round:</span> {fundraising.type}
                      </span>
                    )}
                    {fundraising.stage && (
                      <>
                        {fundraising.type && <span className="text-slate-300">•</span>}
                        <span className="text-slate-500">
                          <span className="font-medium text-slate-700">Stage:</span> {fundraising.stage}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {fundraising.active && (
                    <div className="flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                      <CheckCircle className="h-3 w-3" />
                      Active
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 mt-6">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    // Create clean public shareable link
                    const url = new URL(window.location.origin + window.location.pathname);
                    url.searchParams.set('view', 'startup');
                    url.searchParams.set('startupId', String(startup.id));
                    const shareUrl = url.toString();
                    
                    try {
                      if (navigator.share) {
                        await navigator.share({
                          title: `${startup.name} - Fundraising`,
                          text: `Check out ${startup.name}'s fundraising round`,
                          url: shareUrl,
                        });
                      } else if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(shareUrl);
                        messageService.success('Link Copied', 'Public startup link copied to clipboard!', 2000);
                      } else {
                        // Fallback
                        const textarea = document.createElement('textarea');
                        textarea.value = shareUrl;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        messageService.success('Link Copied', 'Public startup link copied to clipboard!', 2000);
                      }
                    } catch (err) {
                      console.error('Share failed', err);
                    }
                  }}
                  className="!rounded-full !p-3 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-200 border border-slate-200"
                >
                  <Share2 className="h-5 w-5" />
                </Button>

                {fundraising.pitchDeckUrl && fundraising.pitchDeckUrl !== '#' && (
                  <a href={fundraising.pitchDeckUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button size="sm" variant="secondary" className="w-full hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border border-slate-200">
                      <FileText className="h-4 w-4 mr-2" /> View Deck
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Investment Details Footer */}
            <div className="bg-gradient-to-r from-slate-50 to-purple-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 border-t border-slate-200">
              <div className="text-sm sm:text-base">
                <span className="font-semibold text-slate-800">Ask:</span> {formatCurrency(fundraising.value || 0, startup.currency || 'INR')} for <span className="font-semibold text-purple-600">{fundraising.equity || 0}%</span> equity
              </div>
              {startup.compliance_status === 'Compliant' && (
                <div className="flex items-center gap-1 text-green-600" title="This startup has been verified">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs font-semibold">Verified</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {existingRounds.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Previous Rounds</h3>
          <div className="space-y-2 text-xs sm:text-sm text-slate-600">
            {existingRounds.map((round, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center justify-between border border-slate-200 rounded-md px-3 py-2"
              >
                <div className="space-x-2">
                  <span className="font-medium">{round.type}</span>
                  <span>• {formatCurrency(round.value, startup.currency || 'INR')}</span>
                  <span>• {round.equity}% equity</span>
                  {round.stage && <span>• {round.stage}</span>}
                </div>
                {round.active && (
                  <span className="text-emerald-700 text-xs font-semibold">Active</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default FundraisingTab;


