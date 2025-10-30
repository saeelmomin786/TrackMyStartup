import { supabase } from './supabase';
import { DomainUpdateService } from './domainUpdateService';
import { NewInvestment, InvestmentType, ComplianceStatus } from '../types';

export interface ActiveFundraisingStartup {
  id: number;
  name: string;
  sector: string;
  investmentValue: number;
  equityAllocation: number;
  complianceStatus: ComplianceStatus;
  pitchDeckUrl?: string;
  pitchVideoUrl?: string;
  fundraisingType: InvestmentType;
  description?: string;
  createdAt: string;
  fundraisingId: string; // UUID of the fundraising_details record
  isStartupNationValidated: boolean;
  validationDate?: string;
  currency?: string;
}

class InvestorService {
    // Fetch all active fundraising startups with their pitch data
  async getActiveFundraisingStartups(): Promise<ActiveFundraisingStartup[]> {
    try {
      console.log('🔍 investorService.getActiveFundraisingStartups() called');
      
      const { data, error } = await supabase
        .from('fundraising_details')
        .select(`
          *,
          startups (
            id,
            name,
            sector,
            currency,
            compliance_status,
            startup_nation_validated,
            validation_date,
            created_at
          )
        `)
        .eq('active', true)
        .order('created_at', { ascending: false });

      console.log('🔍 Raw query result:', { data, error });

      if (error) {
        console.error('❌ Error fetching active fundraising startups:', error);
        return [];
      }

      console.log('🔍 Raw data length:', data?.length || 0);
      console.log('🔍 Raw data sample:', data?.[0]);

      const filteredData = (data || []).filter(item => {
        const hasStartup = item.startups !== null;
        console.log('🔍 Filtering item:', { 
          fundraisingId: item.id, 
          startupId: item.startup_id, 
          hasStartup,
          startupData: item.startups 
        });
        return hasStartup;
      });

      console.log('🔍 Filtered data length:', filteredData.length);

      // Get startup IDs for domain lookup
      const startupIds = filteredData?.map(item => item.startups.id) || [];
      let domainMap: { [key: number]: string } = {};
      
      if (startupIds.length > 0) {
        // 1. First, try to get domain data from opportunity_applications (most recent)
        const { data: applicationData, error: applicationError } = await supabase
          .from('opportunity_applications')
          .select('startup_id, domain, sector')
          .in('startup_id', startupIds)
          .eq('status', 'accepted'); // Only get accepted applications

        if (!applicationError && applicationData) {
          applicationData.forEach(app => {
            // Try domain field first, then fallback to sector field
            const domainValue = app.domain || app.sector;
            if (domainValue && !domainMap[app.startup_id]) {
              domainMap[app.startup_id] = domainValue;
            }
          });
        }

        // 2. For startups without application data, check fundraising data
        const startupsWithoutData = startupIds.filter(id => !domainMap[id]);
        if (startupsWithoutData.length > 0) {
          console.log('🔍 Checking fundraising data for startups without application data:', startupsWithoutData);
          
          // Check fundraising_details table for domain information
          const { data: fundraisingData, error: fundraisingError } = await supabase
            .from('fundraising_details')
            .select('startup_id, domain')
            .in('startup_id', startupsWithoutData);

          if (!fundraisingError && fundraisingData) {
            fundraisingData.forEach(fund => {
              if (fund.domain && !domainMap[fund.startup_id]) {
                domainMap[fund.startup_id] = fund.domain;
              }
            });
          }
        }
      }

      // Automatically update startup sectors in background if needed
      DomainUpdateService.updateStartupSectors(startupIds).catch(error => {
        console.error('Background sector update failed:', error);
      });

      // Show ALL active fundraising startups, but mark their validation status
      return filteredData.map(item => {
        // Use domain from applications/fundraising, fallback to startup sector, then to 'Unknown'
        const finalSector = domainMap[item.startups.id] || item.startups.sector || 'Unknown';
        console.log(`🔍 Startup ${item.startups.name} (ID: ${item.startups.id}): original sector=${item.startups.sector}, domain=${domainMap[item.startups.id]}, final sector=${finalSector}`);
        
        return {
          id: item.startups.id,
          name: item.startups.name,
          sector: finalSector, // Use domain from applications/fundraising, fallback to startup sector
          investmentValue: item.value,
          equityAllocation: item.equity,
          complianceStatus: item.startups.compliance_status as ComplianceStatus,
          pitchDeckUrl: item.pitch_deck_url,
          pitchVideoUrl: item.pitch_video_url,
          fundraisingType: item.type as InvestmentType,
          description: item.startups.description || `${item.startups.name} - ${finalSector} startup`,
          createdAt: item.startups.created_at,
          fundraisingId: item.id,
          isStartupNationValidated: item.startups.startup_nation_validated || false,
          validationDate: item.startups.validation_date,
          currency: item.startups.currency || 'USD'
        };
      });
    } catch (error) {
      console.error('Error in getActiveFundraisingStartups:', error);
      return [];
    }
  }

  // Fetch startup details for a specific startup
  async getStartupDetails(startupId: number): Promise<ActiveFundraisingStartup | null> {
    try {
      const { data, error } = await supabase
        .from('fundraising_details')
        .select(`
          *,
          startups (
            id,
            name,
            sector,
            currency,
            compliance_status,
            created_at
          )
        `)
        .eq('startup_id', startupId)
        .eq('active', true)
        .single();

      if (error || !data) {
        console.error('Error fetching startup details:', error);
        return null;
      }

      // Get domain information for this specific startup
      let finalSector = data.startups.sector || 'Unknown';
      
      // Try to get domain from opportunity_applications first
      const { data: applicationData, error: applicationError } = await supabase
        .from('opportunity_applications')
        .select('domain, sector')
        .eq('startup_id', startupId)
        .eq('status', 'accepted')
        .single();

      if (!applicationError && applicationData?.domain) {
        finalSector = applicationData.domain;
      } else if (data.domain) {
        // Fallback to fundraising_details domain
        finalSector = data.domain;
      }

      console.log(`🔍 Startup Details ${data.startups.name} (ID: ${startupId}): original sector=${data.startups.sector}, domain=${applicationData?.domain || data.domain}, final sector=${finalSector}`);

      return {
        id: data.startups.id,
        name: data.startups.name,
        sector: finalSector, // Use domain from applications/fundraising, fallback to startup sector
        investmentValue: data.value,
        equityAllocation: data.equity,
        complianceStatus: data.startups.compliance_status as ComplianceStatus,
        pitchDeckUrl: data.pitch_deck_url,
        pitchVideoUrl: data.pitch_video_url,
        fundraisingType: data.type as InvestmentType,
        description: data.startups.description || `${data.startups.name} - ${finalSector} startup`,
        createdAt: data.startups.created_at,
        fundraisingId: data.id,
        isStartupNationValidated: data.startups.startup_nation_validated || false,
        validationDate: data.startups.validation_date,
        currency: data.startups.currency || 'USD'
      };
    } catch (error) {
      console.error('Error in getStartupDetails:', error);
      return null;
    }
  }

  // Get YouTube embed URL from various YouTube URL formats
  getYoutubeEmbedUrl(url?: string): string | null {
    if (!url) return null;
    
    // Handle various YouTube URL formats
    const patterns = [
      // YouTube watch URLs: youtube.com/watch?v=VIDEO_ID
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
      // YouTube watch URLs with additional parameters: youtube.com/watch?param=value&v=VIDEO_ID
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]+)/,
      // YouTube Shorts URLs: youtube.com/shorts/VIDEO_ID
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }
    
    return null;
  }

  // Format currency for display
  formatCurrency(amount: number, currency: string = 'INR'): string {
    const symbol = this.getCurrencySymbol(currency);
    return `${symbol}${amount.toLocaleString()}`;
  }

  // Get currency symbol
  getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'INR': '₹',
      'CAD': 'C$',
      'AUD': 'A$',
      'JPY': '¥',
      'CHF': 'CHF',
      'SGD': 'S$',
      'CNY': '¥',
      'BTN': 'Nu.',
      'AMD': '֏',
      'BYN': 'Br',
      'GEL': '₾',
      'ILS': '₪',
      'JOD': 'د.ا',
      'NGN': '₦',
      'PHP': '₱',
      'RUB': '₽',
      'LKR': '₨',
      'BRL': 'R$',
      'VND': '₫',
      'MMK': 'K',
      'AZN': '₼',
      'RSD': 'дин.',
      'HKD': 'HK$',
      'PKR': '₨',
      'MCO': '€',
    };
    
    return symbols[currency] || currency;
  }
}

export const investorService = new InvestorService();
