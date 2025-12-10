import React, { useEffect, useRef, useState } from 'react';
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
import { validationService } from '../../lib/validationService';
import { generalDataService, GeneralDataItem } from '../../lib/generalDataService';
import { getVideoEmbedUrl, VideoSource } from '../../lib/videoUtils';
import { TrendingUp, DollarSign, Percent, Building2, Share2, ExternalLink, Video, FileText, Heart, CheckCircle, Linkedin, Globe } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import FundraisingCRM from './FundraisingCRM';
import OpportunitiesTab from './OpportunitiesTab';

interface FundraisingTabProps {
  startup: Startup;
  userRole?: UserRole;
  user?: AuthUser;
  isViewOnly?: boolean;
  onActivateFundraising?: (details: FundraisingDetails, startup: Startup) => void;
}

type FundraisingSubTab = 'portfolio' | 'programs' | 'investors' | 'crm';

const FundraisingTab: React.FC<FundraisingTabProps> = ({
  startup,
  userRole,
  user,
  isViewOnly = false,
  onActivateFundraising,
}) => {
  const canEdit = (userRole === 'Startup' || userRole === 'Admin') && !isViewOnly;

  const [activeSubTab, setActiveSubTab] = useState<FundraisingSubTab>('portfolio');
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
    logoUrl: '',
    businessPlanUrl: '',
    websiteUrl: '',
    linkedInUrl: '',
  });
  const [pitchDeckFile, setPitchDeckFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [businessPlanFile, setBusinessPlanFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Local state for auto-generated one-pager (questionnaire based)
  const [onePager, setOnePager] = useState({
    date: new Date().toISOString().slice(0, 10),
    oneLiner: '',
    problemStatement: '',
    solution: '',
    growthChallenge: '',
    usp: '',
    competition: '',
    team: '',
    tam: '',
    sam: '',
    som: '',
    traction: '',
    askUtilization: '',
    revenueThisYear: '',
    revenueLastYear: '',
    revenueNextMonth: '',
    grossProfitMargin: '',
    netProfitMargin: '',
    fixedCostLast3Months: '',
  });

  const onePagerRef = useRef<HTMLDivElement | null>(null);
  const onePagerPrintRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingToSupabase, setIsSavingToSupabase] = useState(false);
  const [autoplayVideo, setAutoplayVideo] = useState(false);

  // Simple per-field character limits (kept in one place)
  const ONE_PAGER_LIMITS: Record<keyof typeof onePager, number> = {
    date: 10,
    oneLiner: 160,
    problemStatement: 500,
    solution: 500,
    growthChallenge: 450,
    usp: 450,
    competition: 450,
    team: 450,
    tam: 80,
    sam: 80,
    som: 80,
    traction: 500,
    askUtilization: 450,
    revenueThisYear: 32,
    revenueLastYear: 32,
    revenueNextMonth: 32,
    grossProfitMargin: 32,
    netProfitMargin: 32,
    fixedCostLast3Months: 32,
  };

  const [onePagerErrors, setOnePagerErrors] = useState<Record<string, string>>({});

  // Dropdown options from general_data table
  const [domainOptions, setDomainOptions] = useState<GeneralDataItem[]>([]);
  const [stageOptions, setStageOptions] = useState<GeneralDataItem[]>([]);
  const [roundTypeOptions, setRoundTypeOptions] = useState<GeneralDataItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!startup?.id) return;
      setIsLoading(true);
      setError(null);
      try {
        // Load dropdown options from general_data table
        const [domains, stages, roundTypes] = await Promise.all([
          generalDataService.getItemsByCategory('domain'),
          generalDataService.getItemsByCategory('stage'),
          generalDataService.getItemsByCategory('round_type'),
        ]);
        
        setDomainOptions(domains);
        setStageOptions(stages);
        setRoundTypeOptions(roundTypes);

        const rounds = await capTableService.getFundraisingDetails(startup.id);
        setExistingRounds(rounds);
        if (rounds.length > 0) {
          const latest = rounds[0];
          setFundraising(latest);

          // Hydrate one-pager state from Supabase if available
          setOnePager(prev => ({
            ...prev,
            date: latest.onePagerDate || prev.date,
            oneLiner: latest.onePagerOneLiner || prev.oneLiner,
            problemStatement: latest.problemStatement || prev.problemStatement,
            solution: latest.solutionText || prev.solution,
            growthChallenge: latest.growthChallenge || prev.growthChallenge,
            usp: latest.uspText || prev.usp,
            competition: latest.competitionText || prev.competition,
            team: latest.teamText || prev.team,
            tam: latest.tamText || prev.tam,
            sam: latest.samText || prev.sam,
            som: latest.somText || prev.som,
            traction: latest.tractionText || prev.traction,
            askUtilization: latest.askUtilizationText || prev.askUtilization,
            revenueThisYear: latest.revenueThisYear || prev.revenueThisYear,
            revenueLastYear: latest.revenueLastYear || prev.revenueLastYear,
            revenueNextMonth: latest.revenueNextMonth || prev.revenueNextMonth,
            grossProfitMargin: latest.grossProfitMargin || prev.grossProfitMargin,
            netProfitMargin: latest.netProfitMargin || prev.netProfitMargin,
            fixedCostLast3Months: latest.fixedCostLast3Months || prev.fixedCostLast3Months,
          }));
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

  const handleOnePagerChange = (field: keyof typeof onePager, value: string) => {
    const limit = ONE_PAGER_LIMITS[field];
    if (limit && value.length > limit) {
      // Hard-stop at limit and show error
      setOnePagerErrors(prev => ({
        ...prev,
        [field]: `Maximum ${limit} characters allowed for this section.`,
      }));
      return;
    }

    setOnePager(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when back within limit
    setOnePagerErrors(prev => {
      if (!prev[field as string]) return prev;
      const updated = { ...prev };
      delete updated[field as string];
      return updated;
    });
  };

  const limitText = (value: string, maxChars: number, fallback: string) => {
    const base = (value && value.trim().length > 0 ? value : fallback) || '';
    if (base.length <= maxChars) return base;
    return base.slice(0, Math.max(0, maxChars - 3)) + '...';
  };

  const handleDownloadOnePager = async () => {
    // Always use the print-only version without Tailwind colors to avoid oklch issues
    const target = onePagerPrintRef.current;
    if (!target) {
      console.error('Print ref not found, cannot generate PDF');
      messageService.error('Error', 'One-pager preview not ready. Please try again.', 3000);
      return;
    }

    try {
      setIsDownloading(true);

      // Capture the one-pager preview as canvas
      const canvas = await html2canvas(target, {
        scale: 2, // Higher scale for better quality
        backgroundColor: '#ffffff', // white background
        useCORS: true,
        foreignObjectRendering: false, // Use native rendering to avoid oklch parsing issues
        // html2canvas doesn't support Tailwind's modern oklch() colors yet,
        // so we remove all stylesheets containing oklch and clean all elements
        onclone: (clonedDoc) => {
          // Remove all <style> tags that might contain oklch colors
          const styleTags = clonedDoc.querySelectorAll('style');
          styleTags.forEach(style => {
            const content = style.textContent || '';
            if (content.includes('oklch')) {
              style.remove();
            }
          });

          // Remove all <link> tags pointing to stylesheets (they might contain oklch)
          const linkTags = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
          linkTags.forEach(link => link.remove());

          const root =
            clonedDoc.getElementById('one-pager-print-root') ||
            (onePagerRef.current
              ? clonedDoc.querySelector('[data-one-pager-preview]')
              : null);

          const el = (root as HTMLElement) || clonedDoc.body;

          // Set a safe white background on the root
          el.style.backgroundColor = '#ffffff';

          // Recursively clean all elements - remove classes and set safe inline styles
          const cleanElement = (node: HTMLElement) => {
            // Remove ALL classes to prevent Tailwind from applying oklch colors
            node.removeAttribute('class');
            
            // Remove background images (gradients often use oklch)
            node.style.backgroundImage = 'none';
            
            // If element has no inline background, set a safe default
            if (!node.style.backgroundColor || node.style.backgroundColor === '') {
              // For dark theme elements, use dark background; for others, transparent
              const tagName = node.tagName.toLowerCase();
              if (tagName === 'div' || tagName === 'pre' || tagName === 'p') {
                // Check if it's a content box (has border) - keep transparent
                const hasBorder = node.style.border || node.style.borderWidth;
                if (!hasBorder) {
                  node.style.backgroundColor = '#ffffff'; // white background for containers
                } else {
                  node.style.backgroundColor = 'transparent';
                }
              } else {
                node.style.backgroundColor = 'transparent';
              }
            }
            
            // Ensure text colors are safe (if not already set inline)
            if (!node.style.color || node.style.color === '') {
              node.style.color = '#1f2937'; // dark text for white background
            }
            
            // Ensure border colors are safe
            if (node.style.border && !node.style.borderColor) {
              node.style.borderColor = '#d1d5db'; // light gray border
            }
            
            // Process all children recursively
            Array.from(node.children).forEach(child => {
              cleanElement(child as HTMLElement);
            });
          };

          // Start cleaning from root
          cleanElement(el);
        },
      });

      const imgData = canvas.toDataURL('image/png');

      // Create A4 PDF (single page)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth - 20; // margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const finalImgHeight = imgHeight > pageHeight - 20 ? pageHeight - 20 : imgHeight;
      const yOffset = (pageHeight - finalImgHeight) / 2;

      pdf.addImage(imgData, 'PNG', 10, yOffset, imgWidth, finalImgHeight);
      
      // Add TrackMyStartup watermark (cast to any to access advanced API)
      const pdfAny: any = pdf;
      pdfAny.setGState(pdfAny.GState({ opacity: 0.15 })); // Semi-transparent watermark
      pdf.setTextColor(150, 150, 150); // Medium gray color (visible on white background)
      pdf.setFontSize(40);
      pdf.setFont('helvetica', 'normal');
      
      // Rotate and position watermark diagonally across the page
      const centerX = pageWidth / 2;
      const centerY = pageHeight / 2;
      pdf.text('TrackMyStartup', centerX, centerY, {
        angle: 45,
        align: 'center',
      });
      
      // Reset opacity for any future content
      pdfAny.setGState(pdfAny.GState({ opacity: 1 }));
      
      pdf.save(`${startup.name || 'startup'}-one-pager.pdf`);
    } catch (err) {
      console.error('Error generating one-pager PDF:', err);
      messageService.error('Download Failed', 'Could not generate one-pager PDF. Please try again.', 3000);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveOnePagerToSupabase = async () => {
    if (!startup?.id) {
      messageService.error('Error', 'Startup ID not found. Please try again.', 3000);
      return;
    }

    // Wait a bit for the ref to be ready if it's not immediately available
    let target = onePagerPrintRef.current;
    if (!target) {
      // Try waiting a bit for the DOM to render
      await new Promise(resolve => setTimeout(resolve, 100));
      target = onePagerPrintRef.current;
    }

    if (!target) {
      console.warn('One-pager print ref not found, skipping PDF generation');
      // Don't show error - just skip the one-pager PDF save
      // The fundraising details are still saved successfully
      return;
    }

    try {
      setIsSavingToSupabase(true);

      // Capture the one-pager preview as canvas (same as download function)
      const canvas = await html2canvas(target, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        foreignObjectRendering: false,
        onclone: (clonedDoc) => {
          const styleTags = clonedDoc.querySelectorAll('style');
          styleTags.forEach(style => {
            const content = style.textContent || '';
            if (content.includes('oklch')) {
              style.remove();
            }
          });

          const linkTags = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
          linkTags.forEach(link => link.remove());

          const root =
            clonedDoc.getElementById('one-pager-print-root') ||
            (onePagerRef.current
              ? clonedDoc.querySelector('[data-one-pager-preview]')
              : null);

          const el = (root as HTMLElement) || clonedDoc.body;
          el.style.backgroundColor = '#ffffff';

          const cleanElement = (node: HTMLElement) => {
            node.removeAttribute('class');
            node.style.backgroundImage = 'none';
            
            if (!node.style.backgroundColor || node.style.backgroundColor === '') {
              const tagName = node.tagName.toLowerCase();
              if (tagName === 'div' || tagName === 'pre' || tagName === 'p') {
                const hasBorder = node.style.border || node.style.borderWidth;
                if (!hasBorder) {
                  node.style.backgroundColor = '#ffffff';
                } else {
                  node.style.backgroundColor = 'transparent';
                }
              } else {
                node.style.backgroundColor = 'transparent';
              }
            }
            
            if (!node.style.color || node.style.color === '') {
              node.style.color = '#1f2937';
            }
            
            if (node.style.border && !node.style.borderColor) {
              node.style.borderColor = '#d1d5db';
            }
            
            Array.from(node.children).forEach(child => {
              cleanElement(child as HTMLElement);
            });
          };

          cleanElement(el);
        },
      });

      const imgData = canvas.toDataURL('image/png');

      // Create A4 PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const finalImgHeight = imgHeight > pageHeight - 20 ? pageHeight - 20 : imgHeight;
      const yOffset = (pageHeight - finalImgHeight) / 2;

      pdf.addImage(imgData, 'PNG', 10, yOffset, imgWidth, finalImgHeight);
      
      // Add TrackMyStartup watermark (cast to any to access advanced API)
      const pdfAny2: any = pdf;
      pdfAny2.setGState(pdfAny2.GState({ opacity: 0.15 }));
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(40);
      pdf.setFont('helvetica', 'normal');
      
      const centerX = pageWidth / 2;
      const centerY = pageHeight / 2;
      pdf.text('TrackMyStartup', centerX, centerY, {
        angle: 45,
        align: 'center',
      });
      
      pdfAny2.setGState(pdfAny2.GState({ opacity: 1 }));

      // Convert PDF to Blob
      const pdfBlob = pdf.output('blob');
      const fileName = 'one-pager.pdf';
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Upload to Supabase
      const onePagerUrl = await capTableService.uploadOnePagerPDF(pdfFile, startup.id);

      // Update only the one-pager URL in the existing fundraising record (don't recreate the record)
      await capTableService.updateOnePagerUrl(startup.id, onePagerUrl);
      
      // Update local state
      setFundraising({ ...fundraising, onePagerUrl });
      if (existingRounds.length > 0) {
        const updatedRounds = existingRounds.map(round => 
          round.id === fundraising.id ? { ...round, onePagerUrl } : round
        );
        setExistingRounds(updatedRounds);
      }

      messageService.success('Success', 'One-pager PDF saved successfully!', 3000);
    } catch (err) {
      console.error('Error saving one-pager PDF:', err);
      messageService.error('Save Failed', 'Could not save one-pager PDF. Please try again.', 3000);
    } finally {
      setIsSavingToSupabase(false);
    }
  };

  const validateOnePagerComplete = (): boolean => {
    // All one-pager fields are mandatory before saving
    const requiredFields: (keyof typeof onePager)[] = [
      'date',
      'oneLiner',
      'problemStatement',
      'solution',
      'growthChallenge',
      'usp',
      'competition',
      'team',
      'tam',
      'sam',
      'som',
      'traction',
      'askUtilization',
      'revenueThisYear',
      'revenueLastYear',
      'revenueNextMonth',
      'grossProfitMargin',
      'netProfitMargin',
      'fixedCostLast3Months',
    ];

    const missing = requiredFields.filter(field => {
      const value = onePager[field];
      return !value || String(value).trim().length === 0;
    });

    if (missing.length > 0) {
      // Mark missing fields with an error
      setOnePagerErrors(prev => {
        const updated = { ...prev };
        missing.forEach(field => {
          updated[field] = 'This field is required.';
        });
        return updated;
      });

      messageService.error(
        'Fundraising One‑Pager Incomplete',
        'Please fill all fields in the Fundraising One‑Pager section before saving.',
        4000
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!startup?.id) return;
    setIsSaving(true);
    setError(null);

    try {
      let pitchDeckUrl = fundraising.pitchDeckUrl;
      let businessPlanUrl = fundraising.businessPlanUrl;

      if (pitchDeckFile) {
        try {
          pitchDeckUrl = await capTableService.uploadPitchDeck(pitchDeckFile, startup.id);
        } catch (e) {
          console.warn('Pitch deck upload failed (non‑blocking):', e);
        }
      }

      let logoUrl = fundraising.logoUrl;
      if (logoFile) {
        try {
          // This will replace existing logo file in storage
          logoUrl = await capTableService.uploadLogo(logoFile, startup.id);
        } catch (e) {
          console.warn('Logo upload failed (non‑blocking):', e);
        }
      }

      if (businessPlanFile) {
        try {
          businessPlanUrl = await capTableService.uploadBusinessPlan(businessPlanFile, startup.id);
        } catch (e) {
          console.warn('Business plan upload failed (non‑blocking):', e);
        }
      }

      const toSave: FundraisingDetails = {
        ...fundraising,
        value: Number(fundraising.value) || 0,
        equity: Number(fundraising.equity) || 0,
        pitchDeckUrl,
        logoUrl,
        businessPlanUrl,
        // Map one-pager answers into fundraising details so they are stored in Supabase
        onePagerDate: onePager.date,
        onePagerOneLiner: onePager.oneLiner,
        problemStatement: onePager.problemStatement,
        solutionText: onePager.solution,
        growthChallenge: onePager.growthChallenge,
        uspText: onePager.usp,
        competitionText: onePager.competition,
        teamText: onePager.team,
        tamText: onePager.tam,
        samText: onePager.sam,
        somText: onePager.som,
        tractionText: onePager.traction,
        askUtilizationText: onePager.askUtilization,
        revenueThisYear: onePager.revenueThisYear,
        revenueLastYear: onePager.revenueLastYear,
        revenueNextMonth: onePager.revenueNextMonth,
        grossProfitMargin: onePager.grossProfitMargin,
        netProfitMargin: onePager.netProfitMargin,
        fixedCostLast3Months: onePager.fixedCostLast3Months,
      };

      const saved = await capTableService.updateFundraisingDetails(startup.id, toSave);
      
      // Reload all fundraising details to ensure we have the latest data
      const refreshedRounds = await capTableService.getFundraisingDetails(startup.id);
      setExistingRounds(refreshedRounds);
      
      // Find the updated record (by ID if available, or use the first/active one)
      const updatedRecord = saved.id 
        ? refreshedRounds.find(r => r.id === saved.id) || saved
        : refreshedRounds.find(r => r.active) || refreshedRounds[0] || saved;
      
      setFundraising(updatedRecord);
      
      // Update one-pager state from saved data
      setOnePager(prev => ({
        ...prev,
        date: updatedRecord.onePagerDate || prev.date,
        oneLiner: updatedRecord.onePagerOneLiner || prev.oneLiner,
        problemStatement: updatedRecord.problemStatement || prev.problemStatement,
        solution: updatedRecord.solutionText || prev.solution,
        growthChallenge: updatedRecord.growthChallenge || prev.growthChallenge,
        usp: updatedRecord.uspText || prev.usp,
        competition: updatedRecord.competitionText || prev.competition,
        team: updatedRecord.teamText || prev.team,
        tam: updatedRecord.tamText || prev.tam,
        sam: updatedRecord.samText || prev.sam,
        som: updatedRecord.somText || prev.som,
        traction: updatedRecord.tractionText || prev.traction,
        askUtilization: updatedRecord.askUtilizationText || prev.askUtilization,
        revenueThisYear: updatedRecord.revenueThisYear || prev.revenueThisYear,
        revenueLastYear: updatedRecord.revenueLastYear || prev.revenueLastYear,
        revenueNextMonth: updatedRecord.revenueNextMonth || prev.revenueNextMonth,
        grossProfitMargin: updatedRecord.grossProfitMargin || prev.grossProfitMargin,
        netProfitMargin: updatedRecord.netProfitMargin || prev.netProfitMargin,
        fixedCostLast3Months: updatedRecord.fixedCostLast3Months || prev.fixedCostLast3Months,
      }));
      
            setPitchDeckFile(null);
            setLogoFile(null);
            setBusinessPlanFile(null);

      if (onActivateFundraising) {
        onActivateFundraising(saved, startup);
      }

      // Handle validation request logic
      if (saved.validationRequested) {
        try {
          console.log('🔄 Creating/updating validation request for startup:', startup.name);
          const validationRequest = await validationService.createValidationRequest(startup.id, startup.name);
          console.log('✅ Validation request processed:', validationRequest);
          
          // Show success message with validation info
          messageService.success(
            'Fundraising Updated',
            'Your fundraising round has been saved! A Startup Nation validation request has been submitted and is pending admin approval.',
            5000
          );
        } catch (validationError) {
          console.error('❌ Error processing validation request:', validationError);
          messageService.warning(
            'Fundraising Updated with Issue',
            'Your fundraising round has been saved! However, there was an issue submitting the validation request. Please contact support.',
            5000
          );
        }
      } else {
        // If validation was unchecked, remove any existing validation request
        try {
          await validationService.removeValidationRequest(startup.id);
          console.log('✅ Validation request removed');
        } catch (removeError) {
          console.warn('⚠️ Error removing validation request (non-blocking):', removeError);
      }

      messageService.success('Fundraising updated', 'Your fundraising round has been saved.', 3000);
      }
    } catch (e: any) {
      console.error('Error saving fundraising details:', e);
      setError(e?.message || 'Failed to save fundraising details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    // Require complete one‑pager before saving
    const isComplete = validateOnePagerComplete();
    if (!isComplete) return;

    // Save fundraising details first, then one‑pager PDF
    await handleSave();
    // Try to save one-pager PDF, but don't fail if it's not ready
    try {
      await handleSaveOnePagerToSupabase();
    } catch (err) {
      console.warn('One-pager PDF save failed (non-blocking):', err);
      // Don't show error to user - fundraising details are already saved
    }
  };

  // Separate function to save just fundraising details without one-pager validation
  const handleSaveFundraisingOnly = async () => {
    await handleSave();
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
      {/* Top-level sub-tabs inside Fundraising */}
      <div className="border-b border-slate-200">
        <nav
          className="-mb-px flex flex-wrap justify-center gap-2 sm:gap-4 px-2"
          aria-label="Fundraising sub tabs"
        >
          <button
            type="button"
            onClick={() => setActiveSubTab('portfolio')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'portfolio'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Portfolio
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('programs')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'programs'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Grant / Incubation Programs
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('investors')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'investors'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Investor List
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('crm')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === 'crm'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            CRM
          </button>
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2 rounded">
          {error}
        </div>
      )}

      {/* Portfolio sub-tab = existing Fundraising UI */}
      {activeSubTab === 'portfolio' && !isLoading && (
      <>
      {/* Current Fundraising + Preview side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6 items-stretch">
        {/* Left: Current Fundraising Round */}
        <Card className="p-4 sm:p-6 h-full">
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
                <span className="font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-md border border-green-200">
                  Fundraising Active
                </span>
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Basic Fundraising Info */}
            <div className="space-y-4">
              <Select
                label="Round Type"
                id="fr-type"
                value={fundraising.type || ''}
                onChange={e => handleChange('type', (e.target as HTMLSelectElement).value as InvestmentType)}
                disabled={!canEdit}
              >
                <option value="">Select round type</option>
                {roundTypeOptions.map(option => (
                  <option key={option.id} value={option.name}>
                    {option.name}
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
                <option value="">Select stage</option>
                {stageOptions.map(option => (
                  <option key={option.id} value={option.name}>
                    {option.name}
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
                {domainOptions.map(option => (
                  <option key={option.id} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Website URL"
                value={fundraising.websiteUrl || ''}
                onChange={e => handleChange('websiteUrl', e.target.value)}
                disabled={!canEdit}
                placeholder="https://..."
              />
              <Input
                label="LinkedIn URL"
                value={fundraising.linkedInUrl || ''}
                onChange={e => handleChange('linkedInUrl', e.target.value)}
                disabled={!canEdit}
                placeholder="https://linkedin.com/company/..."
              />
            </div>

            {/* Right Column: Documents & Links */}
            <div className="space-y-4">
              <div>
                <CloudDriveInput
                  label="Pitch Deck"
                  value={fundraising.pitchDeckUrl || ''}
                  onChange={url => {
                    setPitchDeckFile(null);
                    handleChange('pitchDeckUrl', url);
                  }}
                  onFileSelect={file => {
                    if (file) {
                      setPitchDeckFile(file);
                      handleChange('pitchDeckUrl', '');
                    } else {
                      setPitchDeckFile(null);
                    }
                  }}
                  disabled={!canEdit}
                  accept=".pdf"
                  maxSize={10}
                  documentType="pitch deck"
                  showPrivacyMessage={false}
                />
              </div>
              <Input
                label="Pitch Video URL"
                value={fundraising.pitchVideoUrl || ''}
                onChange={e => handleChange('pitchVideoUrl', e.target.value)}
                disabled={!canEdit}
                placeholder="https://..."
              />
              <div>
                <CloudDriveInput
                  label="Company Logo"
                  value={fundraising.logoUrl || ''}
                  onChange={url => {
                    setLogoFile(null);
                    handleChange('logoUrl', url);
                  }}
                  onFileSelect={file => {
                    if (file) {
                      setLogoFile(file);
                      handleChange('logoUrl', '');
                    } else {
                      setLogoFile(null);
                    }
                  }}
                  disabled={!canEdit}
                  accept=".jpg,.jpeg,.png,.svg,.webp"
                  maxSize={5}
                  documentType="company logo"
                  showPrivacyMessage={false}
                />
              </div>
              <div>
                <CloudDriveInput
                  label="Business Plan"
                  value={fundraising.businessPlanUrl || ''}
                  onChange={url => {
                    setBusinessPlanFile(null);
                    handleChange('businessPlanUrl', url);
                  }}
                  onFileSelect={file => {
                    if (file) {
                      setBusinessPlanFile(file);
                      handleChange('businessPlanUrl', '');
                    } else {
                      setBusinessPlanFile(null);
                    }
                  }}
                  disabled={!canEdit}
                  accept=".pdf,.doc,.docx"
                  maxSize={10}
                  documentType="business plan"
                  showPrivacyMessage={false}
                />
              </div>
              <div className="pt-2 space-y-2">
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={!!fundraising.validationRequested}
                    onChange={e => handleChange('validationRequested', e.target.checked)}
                    disabled={!canEdit}
                  />
                  <span className="font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200">
                    TMS validation
                  </span>
                </label>
                <p className="text-xs text-slate-600 pl-7">
                  We verify your profile and due diligence by TMS team. You will be shown to investors in the verified profile section.
                </p>
              </div>
            </div>
          </div>

          {/* Save button for basic fundraising fields */}
          {canEdit && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              <Button
                variant="primary"
                onClick={handleSaveFundraisingOnly}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving ? 'Saving...' : 'Save Fundraising Details'}
              </Button>
              <p className="text-xs text-slate-500 mt-2">
                Save your fundraising round details. Use "Save Fundraising & One‑Pager" below to also save the one-pager PDF.
              </p>
            </div>
          )}
        </Card>

        {/* Right: Fundraising Card Display - Same design as Discover page */}
        <div className="flex flex-col h-full max-w-xl w-full mx-auto xl:mx-0">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-slate-900">Your Fundraising Card</h3>
            <p className="text-xs text-slate-500">
              This is how investors will see your fundraising details on the Discover page
            </p>
          </div>

          {fundraising && (fundraising.active || fundraising.value > 0 || fundraising.equity > 0) ? (
          <Card className="flex-1 !p-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white">
            {/* Video Section */}
            <div className="relative w-full aspect-[16/7] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
              {(() => {
                const videoEmbedInfo = fundraising.pitchVideoUrl
                  ? getVideoEmbedUrl(fundraising.pitchVideoUrl, autoplayVideo)
                  : null;
                
                const embedUrl = videoEmbedInfo?.embedUrl || null;
                const videoSource = videoEmbedInfo?.source || null;

                return embedUrl ? (
                  <div className="relative w-full h-full">
                    {videoSource === 'direct' ? (
                      // Direct video URL - use HTML5 video player
                      <video
                        src={embedUrl}
                        controls
                        autoPlay={autoplayVideo}
                        muted={autoplayVideo}
                        playsInline
                        className="absolute top-0 left-0 w-full h-full object-cover"
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      // Embedded video (YouTube, Vimeo, Google Drive, OneDrive, etc.)
                      <iframe
                        src={embedUrl}
                        title={`Pitch video for ${startup.name}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full"
                      />
                    )}
                    {/* Autoplay toggle button */}
                    <div className="absolute top-2 right-2 z-10">
                      <button
                        onClick={() => setAutoplayVideo(!autoplayVideo)}
                        className="bg-black/70 hover:bg-black/90 text-white px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors"
                        title={autoplayVideo ? 'Disable autoplay' : 'Enable autoplay'}
                      >
                        {autoplayVideo ? '⏸️ Autoplay ON' : '▶️ Autoplay OFF'}
                      </button>
                    </div>
                  </div>
                ) : fundraising.logoUrl && fundraising.logoUrl !== '#' ? (
                  // Show logo if video is not available - auto-fit to card
                  <div className="relative w-full h-full flex items-center justify-center bg-white overflow-hidden">
                    <img
                      src={fundraising.logoUrl}
                      alt={`${startup.name} logo`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Fallback if image fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  // No video or logo - show placeholder
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Video className="h-16 w-16 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No video or logo available</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Content Section */}
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">{startup.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {fundraising.domain && (
                      <span className="text-slate-500">
                        <span className="font-medium text-slate-700">Domain:</span> {fundraising.domain}
                      </span>
                    )}
                    {fundraising.type && (
                      <>
                        {fundraising.domain && <span className="text-slate-300">•</span>}
                        <span className="text-slate-500">
                          <span className="font-medium text-slate-700">Round:</span> {fundraising.type}
                        </span>
                      </>
                    )}
                    {fundraising.stage && (
                      <>
                        {(fundraising.domain || fundraising.type) && <span className="text-slate-300">•</span>}
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
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mt-6">
                {/* Primary Action Buttons Row */}
                <div className="flex items-center gap-2 flex-wrap">

                  {fundraising.pitchDeckUrl && fundraising.pitchDeckUrl !== '#' && (
                    <a href={fundraising.pitchDeckUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px]">
                      <Button size="sm" variant="secondary" className="w-full hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border border-slate-200">
                        <FileText className="h-4 w-4 mr-2" /> View Deck
                      </Button>
                    </a>
                  )}

                  {fundraising.businessPlanUrl && fundraising.businessPlanUrl !== '#' && (
                    <a href={fundraising.businessPlanUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[140px]">
                      <Button size="sm" variant="secondary" className="w-full hover:bg-purple-50 hover:text-purple-600 transition-all duration-200 border border-slate-200">
                        <FileText className="h-4 w-4 mr-2" /> Business Plan
                      </Button>
                    </a>
                  )}

                  {fundraising.onePagerUrl && fundraising.onePagerUrl !== '#' && (
                    <a href={fundraising.onePagerUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[120px]">
                      <Button size="sm" variant="secondary" className="w-full hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-200 border border-slate-200">
                        <FileText className="h-4 w-4 mr-2" /> One-Pager
                      </Button>
                    </a>
                  )}
                </div>

              </div>
            </div>

            {/* Investment Details Footer */}
            <div className="bg-gradient-to-r from-slate-50 to-purple-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 border-t border-slate-200">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-sm sm:text-base">
                  <span className="font-semibold text-slate-800">Ask:</span> {formatCurrency(fundraising.value || 0, startup.currency || 'INR')} for <span className="font-semibold text-purple-600">{fundraising.equity || 0}%</span> equity
                </div>
                {(fundraising.websiteUrl || fundraising.linkedInUrl) && (
                  <div className="flex items-center gap-4">
                    {fundraising.websiteUrl && fundraising.websiteUrl !== '#' && (
                      <a 
                        href={fundraising.websiteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors"
                        title={fundraising.websiteUrl}
                      >
                        <Globe className="h-4 w-4" />
                        <span className="truncate max-w-[200px]">Website</span>
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      </a>
                    )}
                    {fundraising.linkedInUrl && fundraising.linkedInUrl !== '#' && (
                      <a 
                        href={fundraising.linkedInUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors"
                        title={fundraising.linkedInUrl}
                      >
                        <Linkedin className="h-4 w-4" />
                        <span className="truncate max-w-[200px]">LinkedIn</span>
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      </a>
                    )}
                  </div>
                )}
              </div>
              {startup.compliance_status === 'Compliant' && (
                <div className="flex items-center gap-1 text-green-600" title="This startup has been verified">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs font-semibold">Verified</span>
                </div>
              )}
            </div>
          </Card>
          ) : (
            <Card className="flex-1 flex items-center justify-center border-dashed border-slate-200 bg-slate-50/60">
              <p className="text-xs sm:text-sm text-slate-500 text-center px-4">
                Once you add your fundraising amount, equity and save, a live preview of your investor card will appear here.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Auto-generated One-Pager (Questionnaire based) */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Questionnaire */}
          <div className="w-full lg:w-1/2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Fundraising One‑Pager</h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Answer these questions and we&apos;ll auto‑create a concise one‑pager for investors inside the Fundraising section.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleDownloadOnePager}
                  disabled={isDownloading}
                  className="whitespace-nowrap"
                >
                  {isDownloading ? 'Preparing PDF...' : 'Download PDF / Print'}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSaveAll}
                  disabled={isSaving || isSavingToSupabase || isDownloading}
                  className="whitespace-nowrap"
                >
                  {isSaving || isSavingToSupabase ? 'Saving...' : 'Save Fundraising & One‑Pager'}
                </Button>
                {fundraising.onePagerUrl && fundraising.onePagerUrl !== '#' && (
                  <a href={fundraising.onePagerUrl} target="_blank" rel="noopener noreferrer">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="whitespace-nowrap hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border border-slate-200"
                    >
                      <FileText className="h-4 w-4 mr-2" /> View
                    </Button>
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Date</label>
                <input
                  type="date"
                  value={onePager.date}
                  onChange={e => handleOnePagerChange('date', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Startup Name</label>
                <input
                  type="text"
                  value={startup?.name || ''}
                  disabled
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs sm:text-sm bg-slate-50 text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">One Liner</label>
              <input
                type="text"
                placeholder="Crisp one line about your startup"
                value={onePager.oneLiner}
                onChange={e => handleOnePagerChange('oneLiner', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
              />
              {onePagerErrors.oneLiner && (
                <p className="text-[12px] text-red-500 mt-0.5">{onePagerErrors.oneLiner}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Problem Statement (bullets)</label>
                <textarea
                  rows={3}
                  placeholder="• What problem are you solving?&#10;• Who faces this problem today?"
                  value={onePager.problemStatement}
                  onChange={e => handleOnePagerChange('problemStatement', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm resize-y focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                />
                {onePagerErrors.problemStatement && (
                  <p className="text-[12px] text-red-500 mt-0.5">{onePagerErrors.problemStatement}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Solution (bullets)</label>
                <textarea
                  rows={3}
                  placeholder="• How do you solve the problem?&#10;• Why is this better than current options?"
                  value={onePager.solution}
                  onChange={e => handleOnePagerChange('solution', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm resize-y focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                />
                {onePagerErrors.solution && (
                  <p className="text-[12px] text-red-500 mt-0.5">{onePagerErrors.solution}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Growth Challenge</label>
                <textarea
                  rows={3}
                  placeholder="• What is blocking faster growth today?&#10;• What are the key risks?"
                  value={onePager.growthChallenge}
                  onChange={e => handleOnePagerChange('growthChallenge', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm resize-y focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                />
                {onePagerErrors.growthChallenge && (
                  <p className="text-[12px] text-red-500 mt-0.5">{onePagerErrors.growthChallenge}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Unique Selling Point (USP)</label>
                <textarea
                  rows={3}
                  placeholder="• Why are you different?&#10;• What is hard to copy?"
                  value={onePager.usp}
                  onChange={e => handleOnePagerChange('usp', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm resize-y focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                />
                {onePagerErrors.usp && (
                  <p className="text-[12px] text-red-500 mt-0.5">{onePagerErrors.usp}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Competition</label>
                <textarea
                  rows={3}
                  placeholder="• Who else is solving this?&#10;• How do you compare?"
                  value={onePager.competition}
                  onChange={e => handleOnePagerChange('competition', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm resize-y focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                />
                {onePagerErrors.competition && (
                  <p className="text-[12px] text-red-500 mt-0.5">{onePagerErrors.competition}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Team (relevant background)</label>
                <textarea
                  rows={3}
                  placeholder="Founders, relevant experience, prior startups, domain expertise..."
                  value={onePager.team}
                  onChange={e => handleOnePagerChange('team', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm resize-y focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                />
                {onePagerErrors.team && (
                  <p className="text-[12px] text-red-500 mt-0.5">{onePagerErrors.team}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">TAM</label>
                <input
                  type="text"
                  placeholder="Total addressable market"
                  value={onePager.tam}
                  onChange={e => handleOnePagerChange('tam', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">SAM</label>
                <input
                  type="text"
                  placeholder="Serviceable market"
                  value={onePager.sam}
                  onChange={e => handleOnePagerChange('sam', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">SOM</label>
                <input
                  type="text"
                  placeholder="Target market you will win"
                  value={onePager.som}
                  onChange={e => handleOnePagerChange('som', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Traction (summary)</label>
              <textarea
                rows={3}
                placeholder="Key metrics / growth graph notes (MRR, users, retention, etc.)"
                value={onePager.traction}
                onChange={e => handleOnePagerChange('traction', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm resize-y focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
              />
              {onePagerErrors.traction && (
                <p className="text-[12px] text-red-500 mt-0.5">{onePagerErrors.traction}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Revenue (This Year)</label>
                <input
                  type="text"
                  placeholder="e.g. ₹50L"
                  value={onePager.revenueThisYear}
                  onChange={e => handleOnePagerChange('revenueThisYear', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Revenue (Last Year)</label>
                <input
                  type="text"
                  placeholder="e.g. ₹30L"
                  value={onePager.revenueLastYear}
                  onChange={e => handleOnePagerChange('revenueLastYear', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Run‑rate / Next Month</label>
                <input
                  type="text"
                  placeholder="e.g. ₹6L / month"
                  value={onePager.revenueNextMonth}
                  onChange={e => handleOnePagerChange('revenueNextMonth', e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Ask & Utilization</label>
              <textarea
                rows={3}
                placeholder="How much are you raising and how will you use it (product, team, GTM, runway, etc.)?"
                value={onePager.askUtilization}
                onChange={e => handleOnePagerChange('askUtilization', e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm resize-y focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
              />
              {onePagerErrors.askUtilization && (
                <p className="text-[12px] text-red-500 mt-0.5">{onePagerErrors.askUtilization}</p>
              )}
              <p className="mt-1 text-[12px] text-slate-400">
                Tip: We will also show your current fundraising ask and equity from the section above.
              </p>
            </div>

            {/* Competition metrics row – bottom right of template */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Gross Profit Margin</label>
                <input
                  type="text"
                  placeholder="e.g. 55%"
                  value={onePager.grossProfitMargin}
                  onChange={e => handleOnePagerChange('grossProfitMargin', e.target.value)}
                  maxLength={32}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Net Profit Margin</label>
                <input
                  type="text"
                  placeholder="e.g. 18%"
                  value={onePager.netProfitMargin}
                  onChange={e => handleOnePagerChange('netProfitMargin', e.target.value)}
                  maxLength={32}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Fixed Cost (Last 3 Months)</label>
                <input
                  type="text"
                  placeholder="e.g. ₹12L"
                  value={onePager.fixedCostLast3Months}
                  onChange={e => handleOnePagerChange('fixedCostLast3Months', e.target.value)}
                  maxLength={32}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-white"
                />
              </div>
            </div>
          </div>

          {/* Right: One‑pager preview (A4 size - fixed, no overflow) */}
          <div className="w-full lg:w-1/2 flex justify-center lg:justify-start">
            <div
              ref={onePagerRef}
              data-one-pager-preview
              className="bg-white text-slate-900 rounded-lg border border-slate-300 shadow-lg"
              style={{
                width: '794px',
                height: '1123px',
                maxWidth: '100%',
                padding: '16px',
                fontSize: '11px',
                lineHeight: 1.4,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-300 pb-1.5 mb-1.5 flex-shrink-0">
                <div className="space-y-0.5">
                  <p className="text-[11px] text-slate-600">
                    Date: <span className="font-semibold text-slate-900">{onePager.date}</span>
                  </p>
                  <p className="text-[14px] font-bold tracking-wide text-slate-900">
                    {startup.name || 'Name of Startup'}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide font-bold text-blue-700">
                    {limitText(onePager.oneLiner, 80, 'ONE LINER GOES HERE')}
                  </p>
                </div>
                <div className="text-right space-y-0.5">
                  <p className="text-[11px] text-slate-600">
                    Ask:{' '}
                    <span className="font-bold text-emerald-700 text-[12px]">
                      {fundraising.value
                        ? `${formatCurrency(fundraising.value, startup.currency || 'INR')} for ${fundraising.equity || 0}%`
                        : 'Set in fundraising section'}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-600 font-semibold">
                    Utilization
                  </p>
                  <p className="text-[11px] text-slate-900 line-clamp-2">
                    {limitText(
                      onePager.askUtilization,
                      160,
                      'Brief breakdown of how the funds will be used.',
                    )}
                  </p>
                </div>
              </div>

              {/* Middle grid */}
              <div className="grid grid-cols-2 gap-1.5 flex-grow overflow-hidden" style={{ minHeight: 0 }}>
                {/* Left column blocks */}
                <div className="space-y-1 flex flex-col" style={{ minHeight: 0 }}>
                  <div className="border border-slate-300 rounded-[3px] p-1 flex-shrink-0" style={{ minHeight: 0 }}>
                    <p className="font-bold text-[11px] text-blue-800 mb-0.5">PROBLEM STATEMENT</p>
                    <pre className="whitespace-pre-wrap text-[11px] text-slate-900 leading-tight" style={{ margin: 0 }}>
                      {limitText(
                        onePager.problemStatement,
                        360,
                        '• What problem are you solving?\n• Who has this problem today?',
                      )}
                    </pre>
                  </div>
                  <div className="border border-slate-300 rounded-[3px] p-1.5">
                    <p className="font-bold text-[12px] text-blue-800 mb-1">SOLUTION</p>
                    <pre className="whitespace-pre-wrap text-[12px] text-slate-900 leading-relaxed">
                      {limitText(
                        onePager.solution,
                        360,
                        '• Your product / service\n• Why it works better than existing options',
                      )}
                    </pre>
                  </div>
                  <div className="border border-slate-300 rounded-[3px] p-1.5">
                    <p className="font-bold text-[12px] text-blue-800 mb-0.5">GROWTH CHALLENGE</p>
                    <pre className="whitespace-pre-wrap text-[12px] text-slate-900">
                      {limitText(
                        onePager.growthChallenge,
                        320,
                        '• What is limiting faster growth today?\n• Key risks you are solving for',
                      )}
                    </pre>
                  </div>
                  <div className="border border-slate-300 rounded-[3px] p-1 flex-shrink-0" style={{ minHeight: 0 }}>
                    <p className="font-bold text-[11px] text-blue-800 mb-0.5">UNIQUE SELLING POINT</p>
                    <pre className="whitespace-pre-wrap text-[11px] text-slate-900 leading-tight" style={{ margin: 0 }}>
                      {limitText(
                        onePager.usp,
                        320,
                        '• Why you will win\n• Moats and unfair advantages',
                      )}
                    </pre>
                  </div>
                  <div className="border border-slate-300 rounded-[3px] p-1.5">
                    <p className="font-bold text-[12px] text-blue-800 mb-0.5">COMPETITION</p>
                    <pre className="whitespace-pre-wrap text-[12px] text-slate-900">
                      {limitText(
                        onePager.competition,
                        320,
                        '• Main competitors\n• How you are different',
                      )}
                    </pre>
                  </div>
                  <div className="border border-slate-300 rounded-[3px] p-1.5">
                    <p className="font-bold text-[12px] text-blue-800 mb-0.5">TEAM</p>
                    <pre className="whitespace-pre-wrap text-[12px] text-slate-900">
                      {limitText(
                        onePager.team,
                        320,
                        'Founders and key team members with relevant background.',
                      )}
                    </pre>
                  </div>
                </div>

                {/* Right column blocks */}
                <div className="space-y-1 flex flex-col" style={{ minHeight: 0 }}>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="border border-slate-300 rounded-[3px] p-1 text-center">
                      <p className="font-semibold text-[9px] text-blue-800 mb-0.5">TAM</p>
                      <p className="text-[9px] text-slate-900 break-words">
                        {limitText(onePager.tam, 80, 'Total market size')}
                      </p>
                    </div>
                    <div className="border border-slate-300 rounded-[3px] p-1 text-center">
                      <p className="font-semibold text-[9px] text-blue-800 mb-0.5">SAM</p>
                      <p className="text-[9px] text-slate-900 break-words">
                        {limitText(onePager.sam, 80, 'Serviceable market')}
                      </p>
                    </div>
                    <div className="border border-slate-300 rounded-[3px] p-1 text-center">
                      <p className="font-semibold text-[9px] text-blue-800 mb-0.5">SOM</p>
                      <p className="text-[9px] text-slate-900 break-words">
                        {limitText(onePager.som, 80, 'Market you will win')}
                      </p>
                    </div>
                  </div>

                  <div className="border border-slate-300 rounded-[3px] p-1 flex-shrink-0" style={{ minHeight: 0 }}>
                    <p className="font-bold text-[11px] text-blue-800 mb-0.5">TRACTION (GRAPH)</p>
                    <p className="text-[10px] text-slate-600 mb-0.5">
                      Summarise your key metrics and growth trend.
                    </p>
                    <pre className="whitespace-pre-wrap text-[10px] text-slate-900 leading-tight" style={{ margin: 0, marginBottom: '4px' }}>
                      {limitText(
                        onePager.traction,
                        420,
                        'Revenue / users / GMV over last 12–24 months.\n(E.g., simple month-on-month growth summary)',
                      )}
                    </pre>
                    <div className="mt-2 grid grid-cols-3 gap-1.5 text-[9px]">
                      <div className="border border-slate-300 rounded-[3px] p-1 text-center">
                        <p className="font-semibold text-[8px] text-blue-800 mb-0.5">REVENUE (TILL DATE)</p>
                        <p className="text-[9px] text-slate-900">
                          {limitText(onePager.revenueThisYear, 24, '-')}
                        </p>
                      </div>
                      <div className="border border-slate-300 rounded-[3px] p-1 text-center">
                        <p className="font-semibold text-[8px] text-blue-800 mb-0.5">REVENUE (LAST YEAR)</p>
                        <p className="text-[9px] text-slate-900">
                          {limitText(onePager.revenueLastYear, 24, '-')}
                        </p>
                      </div>
                      <div className="border border-slate-300 rounded-[3px] p-1 text-center">
                        <p className="font-semibold text-[8px] text-blue-800 mb-0.5">MRR (LAST 3 MONTH)</p>
                        <p className="text-[9px] text-slate-900">
                          {limitText(onePager.revenueNextMonth, 24, '-')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-300 rounded-[3px] p-1 flex-shrink-0" style={{ minHeight: 0 }}>
                    <p className="font-bold text-[11px] text-blue-800 mb-0.5">MARGINS & COSTS</p>
                    <div className="grid grid-cols-3 gap-1.5 text-[9px]">
                      <div className="border border-slate-300 rounded-[3px] p-1 text-center">
                        <p className="font-semibold text-[8px] text-blue-800 mb-0.5">GROSS PROFIT MARGIN</p>
                        <p className="text-[9px] text-slate-900">
                          {limitText(onePager.grossProfitMargin, 24, '-')}
                        </p>
                      </div>
                      <div className="border border-slate-300 rounded-[3px] p-1 text-center">
                        <p className="font-semibold text-[8px] text-blue-800 mb-0.5">NET PROFIT MARGIN</p>
                        <p className="text-[9px] text-slate-900">
                          {limitText(onePager.netProfitMargin, 24, '-')}
                        </p>
                      </div>
                      <div className="border border-slate-300 rounded-[3px] p-1 text-center">
                        <p className="font-semibold text-[8px] text-blue-800 mb-0.5">FIXED COST (LAST 3 MONTH)</p>
                        <p className="text-[9px] text-slate-900">
                          {limitText(onePager.fixedCostLast3Months, 24, '-')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden print-only one-pager (no Tailwind colors, hex only) */}
        <div
          ref={onePagerPrintRef}
          id="one-pager-print-root"
          style={{
            position: 'fixed',
            top: -3000,
            left: 0,
            width: '794px', // approx A4 width at 96dpi
            height: '1123px', // approx A4 height at 96dpi
            backgroundColor: '#ffffff',
            color: '#1f2937',
            padding: '16px',
            zIndex: -1,
            fontSize: '12px',
            lineHeight: 1.5,
            border: '1px solid #d1d5db',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px solid #d1d5db',
              paddingBottom: 8,
              marginBottom: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                Date:{' '}
                <span style={{ color: '#111827', fontWeight: 600 }}>
                  {onePager.date}
                </span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
                {startup.name || 'Name of Startup'}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: '#2563eb',
                  marginTop: 3,
                }}
              >
                {limitText(onePager.oneLiner, 80, 'ONE LINER GOES HERE')}
              </div>
            </div>
            <div style={{ textAlign: 'right', maxWidth: 280 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 3 }}>
                Ask:{' '}
                <span style={{ fontWeight: 700, color: '#059669', fontSize: 13 }}>
                  {fundraising.value
                    ? `${formatCurrency(
                        fundraising.value || 0,
                        startup.currency || 'INR',
                      )} for ${fundraising.equity || 0}%`
                    : 'Set in fundraising section'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2, fontWeight: 600 }}>Utilization</div>
              <div
                style={{
                  fontSize: 12,
                  color: '#1f2937',
                  marginTop: 2,
                  lineHeight: 1.4,
                }}
              >
                {limitText(
                  onePager.askUtilization,
                  260,
                  'Brief breakdown of how the funds will be used.',
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {/* Left column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                {
                  title: 'PROBLEM STATEMENT',
                  value: limitText(
                    onePager.problemStatement,
                    360,
                    '• What problem are you solving?\n• Who has this problem today?',
                  ),
                },
                {
                  title: 'SOLUTION',
                  value: limitText(
                    onePager.solution,
                    360,
                    '• Your product / service\n• Why it works better than existing options',
                  ),
                },
                {
                  title: 'GROWTH CHALLENGE',
                  value: limitText(
                    onePager.growthChallenge,
                    320,
                    '• What is limiting faster growth today?\n• Key risks you are solving for',
                  ),
                },
                {
                  title: 'UNIQUE SELLING POINT',
                  value: limitText(
                    onePager.usp,
                    320,
                    '• Why you will win\n• Moats and unfair advantages',
                  ),
                },
                {
                  title: 'COMPETITION',
                  value: limitText(
                    onePager.competition,
                    320,
                    '• Main competitors\n• How you are different',
                  ),
                },
                {
                  title: 'TEAM',
                  value: limitText(
                    onePager.team,
                    320,
                    'Founders and key team members with relevant background.',
                  ),
                },
              ].map(section => (
                <div
                  key={section.title}
                  style={{
                    border: '1px solid #d1d5db',
                    borderRadius: 4,
                    padding: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#1e40af',
                      marginBottom: 4,
                    }}
                  >
                    {section.title}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#1f2937', lineHeight: 1.5 }}>
                    {section.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Right column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  {
                    label: 'TAM',
                    value: limitText(onePager.tam, 80, 'Total market size'),
                  },
                  {
                    label: 'SAM',
                    value: limitText(onePager.sam, 80, 'Serviceable market'),
                  },
                  {
                    label: 'SOM',
                    value: limitText(onePager.som, 80, 'Market you will win'),
                  },
                ].map(box => (
                  <div
                    key={box.label}
                    style={{
                      flex: 1,
                      border: '1px solid #d1d5db',
                      borderRadius: 4,
                      padding: 5,
                      textAlign: 'center',
                    }}
                  >
                    <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#1e40af',
                      marginBottom: 3,
                    }}
                    >
                      {box.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#1f2937' }}>{box.value}</div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  padding: 6,
                  minHeight: 80,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#1e40af',
                    marginBottom: 4,
                  }}
                >
                  TRACTION (GRAPH)
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: '#6b7280',
                    marginBottom: 4,
                  }}
                >
                  Summarise your key metrics and growth trend.
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#1f2937', marginBottom: 4, lineHeight: 1.5 }}>
                  {limitText(
                    onePager.traction,
                    420,
                    'Revenue / users / GMV over last 12–24 months.\n(E.g., simple month-on-month growth summary)',
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {[
                    {
                      label: 'REVENUE (TILL DATE)',
                      value: limitText(onePager.revenueThisYear, 24, '-'),
                    },
                    {
                      label: 'REVENUE (LAST YEAR)',
                      value: limitText(onePager.revenueLastYear, 24, '-'),
                    },
                    {
                      label: 'MRR (LAST 3 MONTH)',
                      value: limitText(onePager.revenueNextMonth, 24, '-'),
                    },
                  ].map(box => (
                    <div
                      key={box.label}
                      style={{
                        flex: 1,
                        border: '1px solid #d1d5db',
                        borderRadius: 4,
                        padding: 4,
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#1e40af',
                          marginBottom: 3,
                        }}
                      >
                        {box.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#1f2937' }}>{box.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  padding: 6,
                  minHeight: 60,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#1e40af',
                    marginBottom: 4,
                  }}
                >
                  MARGINS & COSTS
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    {
                      label: 'GROSS PROFIT MARGIN',
                      value: limitText(onePager.grossProfitMargin, 24, '-'),
                    },
                    {
                      label: 'NET PROFIT MARGIN',
                      value: limitText(onePager.netProfitMargin, 24, '-'),
                    },
                    {
                      label: 'FIXED COST (LAST 3 MONTH)',
                      value: limitText(onePager.fixedCostLast3Months, 24, '-'),
                    },
                  ].map(box => (
                    <div
                      key={box.label}
                      style={{
                        flex: 1,
                        border: '1px solid #d1d5db',
                        borderRadius: 4,
                        padding: 4,
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#1e40af',
                          marginBottom: 3,
                        }}
                      >
                        {box.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#1f2937' }}>{box.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

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
      </>
      )}

      {/* Grant / Incubation Programs: reuse existing Programs/Opportunities UI */}
      {activeSubTab === 'programs' && !isLoading && (
        <div className="space-y-4">
          <OpportunitiesTab startup={{ id: startup.id, name: startup.name }} />
        </div>
      )}

      {/* Investor List placeholder */}
      {activeSubTab === 'investors' && !isLoading && (
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Investor List
          </h2>
          <p className="text-sm text-slate-600">
            English: This section will track angels, VCs and other investors you are in touch with for this round.
          </p>
          <p className="text-sm text-slate-600 mt-1">
            हिन्दी: यहाँ आप इस round के लिए जुड़े angels, VCs और बाकी investors की list और status track कर पाएँगे।
          </p>
          <p className="text-sm text-slate-600 mt-1">
            मराठी: इथे या फेरीसाठी संपर्कात असलेल्या angels, VCs आणि इतर investors ची यादी आणि status तुम्ही track करू शकता.
          </p>
        </Card>
      )}

      {/* CRM - Full Kanban Board */}
      {activeSubTab === 'crm' && !isLoading && (
        <FundraisingCRM startupId={startup.id} />
      )}
    </div>
  );
};

export default FundraisingTab;


