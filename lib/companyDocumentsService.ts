import { supabase } from './supabase';
import { CompanyDocument, CreateCompanyDocumentData, UpdateCompanyDocumentData } from '../types';
import { storageService } from './storage';

class CompanyDocumentsService {
  // Get all company documents for a startup
  async getCompanyDocuments(startupId: number): Promise<CompanyDocument[]> {
    try {
      const { data, error } = await supabase
        .from('company_documents')
        .select('*')
        .eq('startup_id', startupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Fetched company documents:', data);
      
      // Map database fields to TypeScript interface
      const mappedData = (data || []).map((doc: any) => ({
        id: doc.id,
        startupId: doc.startup_id,
        documentName: doc.document_name,
        description: doc.description,
        documentUrl: doc.document_url,
        documentType: doc.document_type,
        createdBy: doc.created_by,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at
      }));
      
      console.log('Mapped company documents:', mappedData);
      return mappedData;
    } catch (error) {
      console.error('Error fetching company documents:', error);
      throw error;
    }
  }

  // Get a single company document
  async getCompanyDocument(id: string): Promise<CompanyDocument | null> {
    try {
      const { data, error } = await supabase
        .from('company_documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Map database fields to TypeScript interface
      const mappedData = {
        id: data.id,
        startupId: data.startup_id,
        documentName: data.document_name,
        description: data.description,
        documentUrl: data.document_url,
        documentType: data.document_type,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      return mappedData;
    } catch (error) {
      console.error('Error fetching company document:', error);
      throw error;
    }
  }

  // Create a new company document
  async createCompanyDocument(startupId: number, documentData: CreateCompanyDocumentData): Promise<CompanyDocument> {
    try {
      const { data, error } = await supabase
        .from('company_documents')
        .insert({
          startup_id: startupId,
          document_name: documentData.documentName,
          description: documentData.description,
          document_url: documentData.documentUrl,
          document_type: documentData.documentType,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      
      // Map database fields to TypeScript interface
      const mappedData = {
        id: data.id,
        startupId: data.startup_id,
        documentName: data.document_name,
        description: data.description,
        documentUrl: data.document_url,
        documentType: data.document_type,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      return mappedData;
    } catch (error) {
      console.error('Error creating company document:', error);
      throw error;
    }
  }

  // Update a company document
  async updateCompanyDocument(id: string, documentData: UpdateCompanyDocumentData): Promise<CompanyDocument> {
    try {
      const { data, error } = await supabase
        .from('company_documents')
        .update({
          document_name: documentData.documentName,
          description: documentData.description,
          document_url: documentData.documentUrl,
          document_type: documentData.documentType,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Map database fields to TypeScript interface
      const mappedData = {
        id: data.id,
        startupId: data.startup_id,
        documentName: data.document_name,
        description: data.description,
        documentUrl: data.document_url,
        documentType: data.document_type,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      return mappedData;
    } catch (error) {
      console.error('Error updating company document:', error);
      throw error;
    }
  }

  // Delete a company document
  async deleteCompanyDocument(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('company_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting company document:', error);
      throw error;
    }
  }

  // Upload a file to the company-documents storage bucket
  async uploadFile(file: File, startupId: number): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const path = `${startupId}/company-documents/${timestamp}_${uniqueId}_${file.name}`;

      const uploadResult = await storageService.uploadFile(file, 'company-documents', path);

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || 'Failed to upload company document');
      }

      return uploadResult.url;
    } catch (error) {
      console.error('Error uploading company document file:', error);
      throw error;
    }
  }

  // Get document type from URL
  getDocumentType(url: string): string {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('google.com') || urlLower.includes('docs.google.com')) {
      return 'Google Docs';
    } else if (urlLower.includes('drive.google.com')) {
      return 'Google Drive';
    } else if (urlLower.includes('dropbox.com')) {
      return 'Dropbox';
    } else if (urlLower.includes('onedrive.com') || urlLower.includes('sharepoint.com')) {
      return 'OneDrive';
    } else if (urlLower.includes('notion.so')) {
      return 'Notion';
    } else if (urlLower.includes('airtable.com')) {
      return 'Airtable';
    } else if (urlLower.includes('figma.com')) {
      return 'Figma';
    } else if (urlLower.includes('miro.com')) {
      return 'Miro';
    } else if (urlLower.includes('canva.com')) {
      return 'Canva';
    } else if (urlLower.includes('github.com')) {
      return 'GitHub';
    } else if (urlLower.includes('gitlab.com')) {
      return 'GitLab';
    } else if (urlLower.includes('bitbucket.org')) {
      return 'Bitbucket';
    } else if (urlLower.includes('trello.com')) {
      return 'Trello';
    } else if (urlLower.includes('asana.com')) {
      return 'Asana';
    } else if (urlLower.includes('slack.com')) {
      return 'Slack';
    } else if (urlLower.includes('zoom.us')) {
      return 'Zoom';
    } else if (urlLower.includes('teams.microsoft.com')) {
      return 'Microsoft Teams';
    } else if (urlLower.includes('webex.com')) {
      return 'Webex';
    } else if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      return 'YouTube';
    } else if (urlLower.includes('vimeo.com')) {
      return 'Vimeo';
    } else if (urlLower.includes('linkedin.com')) {
      return 'LinkedIn';
    } else if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
      return 'Twitter/X';
    } else if (urlLower.includes('facebook.com')) {
      return 'Facebook';
    } else if (urlLower.includes('instagram.com')) {
      return 'Instagram';
    } else if (urlLower.includes('tiktok.com')) {
      return 'TikTok';
    } else if (urlLower.includes('medium.com')) {
      return 'Medium';
    } else if (urlLower.includes('substack.com')) {
      return 'Substack';
    } else if (urlLower.includes('wordpress.com')) {
      return 'WordPress';
    } else if (urlLower.includes('wix.com')) {
      return 'Wix';
    } else if (urlLower.includes('squarespace.com')) {
      return 'Squarespace';
    } else if (urlLower.includes('shopify.com')) {
      return 'Shopify';
    } else if (urlLower.includes('amazon.com')) {
      return 'Amazon';
    } else if (urlLower.includes('apple.com')) {
      return 'Apple';
    } else if (urlLower.includes('microsoft.com')) {
      return 'Microsoft';
    } else if (urlLower.includes('adobe.com')) {
      return 'Adobe';
    } else if (urlLower.includes('salesforce.com')) {
      return 'Salesforce';
    } else if (urlLower.includes('hubspot.com')) {
      return 'HubSpot';
    } else if (urlLower.includes('mailchimp.com')) {
      return 'Mailchimp';
    } else if (urlLower.includes('stripe.com')) {
      return 'Stripe';
    } else if (urlLower.includes('paypal.com')) {
      return 'PayPal';
    } else if (urlLower.includes('squareup.com')) {
      return 'Square';
    } else if (urlLower.includes('quickbooks.com')) {
      return 'QuickBooks';
    } else if (urlLower.includes('xero.com')) {
      return 'Xero';
    } else if (urlLower.includes('freshbooks.com')) {
      return 'FreshBooks';
    } else if (urlLower.includes('waveapps.com')) {
      return 'Wave';
    } else if (urlLower.includes('mint.com')) {
      return 'Mint';
    } else if (urlLower.includes('personalcapital.com')) {
      return 'Personal Capital';
    } else if (urlLower.includes('robinhood.com')) {
      return 'Robinhood';
    } else if (urlLower.includes('etrade.com')) {
      return 'E*TRADE';
    } else if (urlLower.includes('fidelity.com')) {
      return 'Fidelity';
    } else if (urlLower.includes('schwab.com')) {
      return 'Charles Schwab';
    } else if (urlLower.includes('vanguard.com')) {
      return 'Vanguard';
    } else if (urlLower.includes('blackrock.com')) {
      return 'BlackRock';
    } else if (urlLower.includes('goldmansachs.com')) {
      return 'Goldman Sachs';
    } else if (urlLower.includes('morganstanley.com')) {
      return 'Morgan Stanley';
    } else if (urlLower.includes('jpmorgan.com')) {
      return 'JPMorgan Chase';
    } else if (urlLower.includes('wellsfargo.com')) {
      return 'Wells Fargo';
    } else if (urlLower.includes('bankofamerica.com')) {
      return 'Bank of America';
    } else if (urlLower.includes('citibank.com')) {
      return 'Citi';
    } else if (urlLower.includes('chase.com')) {
      return 'Chase';
    } else if (urlLower.includes('capitalone.com')) {
      return 'Capital One';
    } else if (urlLower.includes('discover.com')) {
      return 'Discover';
    } else if (urlLower.includes('americanexpress.com')) {
      return 'American Express';
    } else if (urlLower.includes('visa.com')) {
      return 'Visa';
    } else if (urlLower.includes('mastercard.com')) {
      return 'Mastercard';
    } else if (urlLower.includes('amex.com')) {
      return 'American Express';
    } else if (urlLower.includes('discover.com')) {
      return 'Discover';
    } else if (urlLower.includes('capitalone.com')) {
      return 'Capital One';
    } else if (urlLower.includes('chase.com')) {
      return 'Chase';
    } else if (urlLower.includes('citibank.com')) {
      return 'Citi';
    } else if (urlLower.includes('wellsfargo.com')) {
      return 'Wells Fargo';
    } else if (urlLower.includes('bankofamerica.com')) {
      return 'Bank of America';
    } else if (urlLower.includes('jpmorgan.com')) {
      return 'JPMorgan Chase';
    } else if (urlLower.includes('morganstanley.com')) {
      return 'Morgan Stanley';
    } else if (urlLower.includes('goldmansachs.com')) {
      return 'Goldman Sachs';
    } else if (urlLower.includes('blackrock.com')) {
      return 'BlackRock';
    } else if (urlLower.includes('vanguard.com')) {
      return 'Vanguard';
    } else if (urlLower.includes('schwab.com')) {
      return 'Charles Schwab';
    } else if (urlLower.includes('fidelity.com')) {
      return 'Fidelity';
    } else if (urlLower.includes('etrade.com')) {
      return 'E*TRADE';
    } else if (urlLower.includes('robinhood.com')) {
      return 'Robinhood';
    } else if (urlLower.includes('personalcapital.com')) {
      return 'Personal Capital';
    } else if (urlLower.includes('mint.com')) {
      return 'Mint';
    } else if (urlLower.includes('waveapps.com')) {
      return 'Wave';
    } else if (urlLower.includes('freshbooks.com')) {
      return 'FreshBooks';
    } else if (urlLower.includes('xero.com')) {
      return 'Xero';
    } else if (urlLower.includes('quickbooks.com')) {
      return 'QuickBooks';
    } else if (urlLower.includes('squareup.com')) {
      return 'Square';
    } else if (urlLower.includes('paypal.com')) {
      return 'PayPal';
    } else if (urlLower.includes('stripe.com')) {
      return 'Stripe';
    } else if (urlLower.includes('mailchimp.com')) {
      return 'Mailchimp';
    } else if (urlLower.includes('hubspot.com')) {
      return 'HubSpot';
    } else if (urlLower.includes('salesforce.com')) {
      return 'Salesforce';
    } else if (urlLower.includes('adobe.com')) {
      return 'Adobe';
    } else if (urlLower.includes('microsoft.com')) {
      return 'Microsoft';
    } else if (urlLower.includes('apple.com')) {
      return 'Apple';
    } else if (urlLower.includes('amazon.com')) {
      return 'Amazon';
    } else if (urlLower.includes('shopify.com')) {
      return 'Shopify';
    } else if (urlLower.includes('squarespace.com')) {
      return 'Squarespace';
    } else if (urlLower.includes('wix.com')) {
      return 'Wix';
    } else if (urlLower.includes('wordpress.com')) {
      return 'WordPress';
    } else if (urlLower.includes('substack.com')) {
      return 'Substack';
    } else if (urlLower.includes('medium.com')) {
      return 'Medium';
    } else if (urlLower.includes('tiktok.com')) {
      return 'TikTok';
    } else if (urlLower.includes('instagram.com')) {
      return 'Instagram';
    } else if (urlLower.includes('facebook.com')) {
      return 'Facebook';
    } else if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
      return 'Twitter/X';
    } else if (urlLower.includes('linkedin.com')) {
      return 'LinkedIn';
    } else if (urlLower.includes('vimeo.com')) {
      return 'Vimeo';
    } else if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      return 'YouTube';
    } else if (urlLower.includes('webex.com')) {
      return 'Webex';
    } else if (urlLower.includes('teams.microsoft.com')) {
      return 'Microsoft Teams';
    } else if (urlLower.includes('zoom.us')) {
      return 'Zoom';
    } else if (urlLower.includes('slack.com')) {
      return 'Slack';
    } else if (urlLower.includes('asana.com')) {
      return 'Asana';
    } else if (urlLower.includes('trello.com')) {
      return 'Trello';
    } else if (urlLower.includes('bitbucket.org')) {
      return 'Bitbucket';
    } else if (urlLower.includes('gitlab.com')) {
      return 'GitLab';
    } else if (urlLower.includes('github.com')) {
      return 'GitHub';
    } else if (urlLower.includes('canva.com')) {
      return 'Canva';
    } else if (urlLower.includes('miro.com')) {
      return 'Miro';
    } else if (urlLower.includes('figma.com')) {
      return 'Figma';
    } else if (urlLower.includes('airtable.com')) {
      return 'Airtable';
    } else if (urlLower.includes('notion.so')) {
      return 'Notion';
    } else if (urlLower.includes('onedrive.com') || urlLower.includes('sharepoint.com')) {
      return 'OneDrive';
    } else if (urlLower.includes('dropbox.com')) {
      return 'Dropbox';
    } else if (urlLower.includes('drive.google.com')) {
      return 'Google Drive';
    } else if (urlLower.includes('google.com') || urlLower.includes('docs.google.com')) {
      return 'Google Docs';
    } else {
      return 'External Link';
    }
  }

  // Get document icon based on type
  getDocumentIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'Google Docs': '📄',
      'Google Drive': '💾',
      'Dropbox': '📦',
      'OneDrive': '☁️',
      'Notion': '📝',
      'Airtable': '🗃️',
      'Figma': '🎨',
      'Miro': '🖼️',
      'Canva': '🎨',
      'GitHub': '🐙',
      'GitLab': '🦊',
      'Bitbucket': '🪣',
      'Trello': '📋',
      'Asana': '✅',
      'Slack': '💬',
      'Zoom': '📹',
      'Microsoft Teams': '👥',
      'Webex': '📞',
      'YouTube': '📺',
      'Vimeo': '🎬',
      'LinkedIn': '💼',
      'Twitter/X': '🐦',
      'Facebook': '👤',
      'Instagram': '📸',
      'TikTok': '🎵',
      'Medium': '📰',
      'Substack': '📧',
      'WordPress': '🌐',
      'Wix': '🏗️',
      'Squarespace': '⬜',
      'Shopify': '🛒',
      'Amazon': '📦',
      'Apple': '🍎',
      'Microsoft': '🪟',
      'Adobe': '🎨',
      'Salesforce': '☁️',
      'HubSpot': '🎯',
      'Mailchimp': '🐵',
      'Stripe': '💳',
      'PayPal': '💰',
      'Square': '⬜',
      'QuickBooks': '📊',
      'Xero': '📈',
      'FreshBooks': '📋',
      'Wave': '🌊',
      'Mint': '🌿',
      'Personal Capital': '💎',
      'Robinhood': '🦅',
      'E*TRADE': '📈',
      'Fidelity': '🔒',
      'Charles Schwab': '📊',
      'Vanguard': '🚀',
      'BlackRock': '⚫',
      'Goldman Sachs': '🏦',
      'Morgan Stanley': '🏛️',
      'JPMorgan Chase': '🏦',
      'Wells Fargo': '🏦',
      'Bank of America': '🏦',
      'Citi': '🏦',
      'Chase': '🏦',
      'Capital One': '🏦',
      'Discover': '💳',
      'American Express': '💳',
      'Visa': '💳',
      'Mastercard': '💳',
      'External Link': '🔗'
    };
    return iconMap[type] || '🔗';
  }
}

export const companyDocumentsService = new CompanyDocumentsService();
