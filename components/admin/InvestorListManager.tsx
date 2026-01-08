import React, { useState, useEffect, useRef } from 'react';
import { investorListService, InvestorListItem, CreateInvestorListItem } from '../../lib/investorListService';
import { generalDataService, GeneralDataItem } from '../../lib/generalDataService';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Plus, Edit, Trash2, Save, X, Upload, Download, Search, ExternalLink, Linkedin, Globe, Building2, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuthUser } from '../../lib/auth';

const InvestorListManager: React.FC = () => {
  const [investors, setInvestors] = useState<InvestorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<InvestorListItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ isUploading: boolean; success: number; errors: Array<{ row: number; error: string; data: any }> }>({
    isUploading: false,
    success: 0,
    errors: []
  });
  const [uploadResults, setUploadResults] = useState<{
    successRows: Array<{ row: number; data: any; investor: any }>;
    errorRows: Array<{ row: number; error: string; data: any }>;
    totalProcessed: number;
  } | null>(null);
  // Removed validationResult - now we upload directly
  const [originalCSVData, setOriginalCSVData] = useState<any[]>([]);

  // Multi-select dropdown states
  const [showFundTypeDropdown, setShowFundTypeDropdown] = useState(false);
  const [showDomainDropdown, setShowDomainDropdown] = useState(false);
  const [showRoundTypeDropdown, setShowRoundTypeDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  
  // Refs for closing dropdowns on outside click
  const fundTypeRef = useRef<HTMLDivElement>(null);
  const domainRef = useRef<HTMLDivElement>(null);
  const roundTypeRef = useRef<HTMLDivElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<CreateInvestorListItem>({
    name: '',
    fund_type: [],
    website: '',
    domain: [],
    round_type: [],
    country: [],
    linkedin: '',
    image_url: '',
    is_active: true
  });

  // Dropdown options from general_data table
  const [firmTypeOptions, setFirmTypeOptions] = useState<GeneralDataItem[]>([]);
  const [domainOptions, setDomainOptions] = useState<GeneralDataItem[]>([]);
  const [roundTypeOptions, setRoundTypeOptions] = useState<GeneralDataItem[]>([]);
  const [countryOptions, setCountryOptions] = useState<GeneralDataItem[]>([]);

  useEffect(() => {
    loadInvestors();
    loadDropdownOptions();
  }, [showInactive]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fundTypeRef.current && !fundTypeRef.current.contains(event.target as Node)) {
        setShowFundTypeDropdown(false);
      }
      if (domainRef.current && !domainRef.current.contains(event.target as Node)) {
        setShowDomainDropdown(false);
      }
      if (roundTypeRef.current && !roundTypeRef.current.contains(event.target as Node)) {
        setShowRoundTypeDropdown(false);
      }
      if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Helper function to handle multi-select toggle
  const handleMultiSelectToggle = (field: 'fund_type' | 'domain' | 'round_type' | 'country', value: string) => {
    const currentValues = formData[field] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    setFormData({ ...formData, [field]: newValues });
  };

  const loadDropdownOptions = async () => {
    try {
      const [firmTypes, domains, roundTypes, countries] = await Promise.all([
        generalDataService.getItemsByCategory('firm_type'),
        generalDataService.getItemsByCategory('domain'),
        generalDataService.getItemsByCategory('round_type'),
        generalDataService.getItemsByCategory('country'),
      ]);
      setFirmTypeOptions(firmTypes);
      setDomainOptions(domains);
      setRoundTypeOptions(roundTypes);
      setCountryOptions(countries);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    }
  };

  const loadInvestors = async () => {
    setLoading(true);
    try {
      const data = await investorListService.getAll(showInactive);
      setInvestors(data);
    } catch (error) {
      console.error('Error loading investors:', error);
      alert('Failed to load investors');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      name: '',
      fund_type: [],
      website: '',
      domain: [],
      round_type: [],
      country: [],
      linkedin: '',
      image_url: '',
      is_active: true
    });
    setEditingInvestor(null);
    setShowAddForm(true);
  };

  const handleEdit = (investor: InvestorListItem) => {
    setFormData({
      name: investor.name,
      fund_type: investor.fund_type || [],
      website: investor.website || '',
      domain: investor.domain || [],
      round_type: investor.round_type || [],
      country: investor.country || [],
      linkedin: investor.linkedin || '',
      image_url: investor.image_url || '',
      is_active: investor.is_active
    });
    setEditingInvestor(investor);
    setShowAddForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter investor name');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (editingInvestor) {
        const result = await investorListService.update(editingInvestor.id, formData, userId);
        if (result) {
          alert('Investor updated successfully!');
          setShowAddForm(false);
          setEditingInvestor(null);
          loadInvestors();
        } else {
          alert('Failed to update investor');
        }
      } else {
        const result = await investorListService.create(formData, userId);
        if (result) {
          alert('Investor created successfully!');
          setShowAddForm(false);
          loadInvestors();
        } else {
          alert('Failed to create investor');
        }
      }
    } catch (error) {
      console.error('Error saving investor:', error);
      alert('Failed to save investor');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this investor?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const success = await investorListService.delete(id, userId);
      if (success) {
        alert('Investor deleted successfully!');
        loadInvestors();
      } else {
        alert('Failed to delete investor');
      }
    } catch (error) {
      console.error('Error deleting investor:', error);
      alert('Failed to delete investor');
    }
  };

  const filteredInvestors = investors.filter(investor => {
    if (!showInactive && !investor.is_active) return false;
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      investor.name.toLowerCase().includes(searchLower) ||
      investor.fund_type?.some(ft => ft.toLowerCase().includes(searchLower)) ||
      investor.domain?.some(d => d.toLowerCase().includes(searchLower)) ||
      investor.country?.some(c => c.toLowerCase().includes(searchLower)) ||
      investor.round_type?.some(rt => rt.toLowerCase().includes(searchLower))
    );
  });

  // Parse CSV content properly
  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    // Parse headers
    const headers = parseCSVLine(lines[0]);
    
    // Parse data rows
    const data = lines.slice(1).map(line => {
      const values = parseCSVLine(line);
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
    
    return data;
  };

  // Parse a single CSV line handling quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    
    return result;
  };

  // Read CSV file
  const readCSVFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const data = parseCSV(text);
          console.log('Parsed CSV data:', data);
          resolve(data);
        } catch (error) {
          console.error('Error parsing file:', error);
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file, 'UTF-8');
    });
  };

  // Calculate Levenshtein distance between two strings (for fuzzy matching)
  const levenshteinDistance = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    const matrix: number[][] = [];

    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[s2.length][s1.length];
  };

  // Common words to remove when extracting core terms (suffixes/prefixes)
  const COMMON_SUFFIXES = [
    'software', 'platform', 'service', 'services', 'solutions', 'solution',
    'technology', 'technologies', 'tech', 'systems', 'system', 'tools', 'tool',
    'applications', 'application', 'apps', 'app', 'products', 'product',
    'industry', 'industries', 'sector', 'sectors', 'market', 'markets',
    'company', 'companies', 'firm', 'firms', 'business', 'businesses'
  ];

  // Extract core term from a phrase (removes common suffixes/prefixes)
  const extractCoreTerm = (str: string): string[] => {
    const normalized = str.toLowerCase().trim();
    const terms: string[] = [normalized]; // Always include the full term
    
    // Split by spaces and common separators
    const words = normalized.split(/[\s,\-]+/).filter(w => w.length > 0);
    
    // Try to find core terms by removing common suffixes
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      // Check if this word is not a common suffix
      if (!COMMON_SUFFIXES.includes(word) && word.length >= 2) {
        // Try combinations: single word, word + next word, etc.
        for (let j = i + 1; j <= Math.min(i + 2, words.length); j++) {
          const combination = words.slice(i, j).join(' ');
          if (combination.length >= 2 && !COMMON_SUFFIXES.includes(combination)) {
            terms.push(combination);
          }
        }
      }
    }
    
    // Also try removing common suffixes from the end
    const wordsArray = normalized.split(/\s+/);
    if (wordsArray.length > 1) {
      const lastWord = wordsArray[wordsArray.length - 1];
      if (COMMON_SUFFIXES.includes(lastWord)) {
        const withoutSuffix = wordsArray.slice(0, -1).join(' ');
        if (withoutSuffix.length >= 2) {
          terms.push(withoutSuffix);
        }
      }
    }
    
    return [...new Set(terms)]; // Remove duplicates
  };

  // Normalize string for better matching (remove extra spaces, handle common variations)
  const normalizeString = (str: string): string => {
    return str
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[.,;:!?]/g, '') // Remove punctuation
      .replace(/\s*-\s*/g, '-'); // Normalize hyphens
  };

  // Calculate similarity ratio (0-1, where 1 is identical)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    const distance = levenshteinDistance(str1, str2);
    return 1 - (distance / maxLen);
  };

  // Find the closest match using fuzzy matching with stricter rules
  const findClosestMatch = (
    value: string,
    validOptions: GeneralDataItem[],
    maxDistance: number = 2 // Maximum allowed edit distance
  ): { match: string; distance: number } | null => {
    const normalizedValue = normalizeString(value);
    
    // Skip matching for very short values (less than 2 characters)
    if (normalizedValue.length < 2) {
      return null;
    }
    
    // First try exact case-insensitive match
    const exactMatch = validOptions.find(opt => normalizeString(opt.name) === normalizedValue);
    if (exactMatch) {
      return { match: exactMatch.name, distance: 0 };
    }

    // Extract core terms from the input value (handles "PaaS software" -> "PaaS")
    const coreTerms = extractCoreTerm(value);
    
    // Try fuzzy matching with core terms
    let bestMatch: { match: string; distance: number } | null = null;
    let minDistance = Infinity;
    let bestSimilarity = 0;

    for (const option of validOptions) {
      const optionName = normalizeString(option.name);
      let bestDistanceForOption = Infinity;
      let bestSimilarityForOption = 0;

      // Check each core term against the option
      for (const coreTerm of coreTerms) {
        // Skip if core term is too short (less than 2 chars) unless it matches exactly
        if (coreTerm.length < 2 && coreTerm !== optionName) {
          continue;
        }

        // 1. Direct exact match with core term
        if (coreTerm === optionName) {
          bestDistanceForOption = 0;
          bestSimilarityForOption = 1;
          break;
        }

        // 2. Check if option is contained in the value as a whole word
        // e.g., "PaaS" in "PaaS software" should match
        const wordBoundaryRegex = new RegExp(`\\b${optionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (wordBoundaryRegex.test(normalizedValue)) {
          bestDistanceForOption = 0;
          bestSimilarityForOption = 1;
          break;
        }

        // 3. Check if core term is contained in option or vice versa (with length requirements)
        // Only match if the shorter string is at least 3 characters or is a significant portion of the longer
        const longer = normalizedValue.length > optionName.length ? normalizedValue : optionName;
        const shorter = normalizedValue.length > optionName.length ? optionName : normalizedValue;
        
        if (longer.includes(shorter)) {
          // Require at least 3 chars for substring matching, or if shorter is >50% of longer
          const minLength = Math.max(3, Math.floor(longer.length * 0.5));
          if (shorter.length >= minLength) {
            const distance = optionName === coreTerm ? 0 : 1;
            const similarity = shorter.length / longer.length;
            if (similarity > bestSimilarityForOption) {
              bestDistanceForOption = Math.min(bestDistanceForOption, distance);
              bestSimilarityForOption = similarity;
            }
          }
        }

        // 4. Calculate Levenshtein distance and similarity
        const distance = levenshteinDistance(coreTerm, optionName);
        const similarity = calculateSimilarity(coreTerm, optionName);
        
        // Use relative distance: for short strings, be more strict
        const maxLen = Math.max(coreTerm.length, optionName.length);
        const relativeDistance = maxLen > 0 ? distance / maxLen : 1;
        
        // For very short strings (< 4 chars), require high similarity (> 0.75)
        // For longer strings, allow lower similarity (> 0.6)
        const minSimilarity = maxLen < 4 ? 0.75 : 0.6;
        
        if (similarity >= minSimilarity && relativeDistance <= 0.3) {
          if (distance < bestDistanceForOption || (distance === bestDistanceForOption && similarity > bestSimilarityForOption)) {
            bestDistanceForOption = distance;
            bestSimilarityForOption = similarity;
          }
        }
      }

      // 5. Also check full value against option (for partial matches)
      const fullDistance = levenshteinDistance(normalizedValue, optionName);
      const fullSimilarity = calculateSimilarity(normalizedValue, optionName);
      const maxLen = Math.max(normalizedValue.length, optionName.length);
      const relativeFullDistance = maxLen > 0 ? fullDistance / maxLen : 1;
      const minSimilarity = maxLen < 4 ? 0.75 : 0.6;
      
      if (fullSimilarity >= minSimilarity && relativeFullDistance <= 0.3) {
        if (fullDistance < bestDistanceForOption || (fullDistance === bestDistanceForOption && fullSimilarity > bestSimilarityForOption)) {
          bestDistanceForOption = fullDistance;
          bestSimilarityForOption = fullSimilarity;
        }
      }

      // Only consider matches that meet our criteria
      // Calculate the max length for similarity threshold
      const optionMaxLen = Math.max(normalizedValue.length, optionName.length);
      const minSimilarityThreshold = optionMaxLen < 4 ? 0.75 : 0.6;
      
      if (bestDistanceForOption <= maxDistance && bestSimilarityForOption >= minSimilarityThreshold) {
        if (bestDistanceForOption < minDistance || (bestDistanceForOption === minDistance && bestSimilarityForOption > bestSimilarity)) {
          minDistance = bestDistanceForOption;
          bestSimilarity = bestSimilarityForOption;
          bestMatch = { match: option.name, distance: bestDistanceForOption };
        }
      }
    }

    return bestMatch;
  };

  // Simple spelling/typo matching - only 1-2 character differences
  const findSimpleMatch = (value: string, validOptions: GeneralDataItem[]): string | null => {
    const normalizedValue = normalizeString(value);
    
    // Exact match
    const exactMatch = validOptions.find(opt => normalizeString(opt.name) === normalizedValue);
    if (exactMatch) {
      return exactMatch.name;
    }

    // Simple typo matching - only 1-2 character difference for similar length strings
    let bestMatch: string | null = null;
    let minDistance = Infinity;

    for (const option of validOptions) {
      const optionName = normalizeString(option.name);
      
      // Only match if lengths are similar (within 2 characters)
      if (Math.abs(normalizedValue.length - optionName.length) > 2) {
        continue;
      }

      const distance = levenshteinDistance(normalizedValue, optionName);
      
      // Only accept if distance is 1-2 and strings are similar length
      if (distance <= 2 && distance < minDistance) {
        minDistance = distance;
        bestMatch = option.name;
      }
    }

    return bestMatch;
  };

  // Validate values against general_data table - simple matching
  const validateValues = (
    values: string[],
    validOptions: GeneralDataItem[],
    fieldName: string
  ): { 
    valid: string[]; 
    invalid: string[]; 
  } => {
    const validOptionsSet = new Set(validOptions.map(opt => normalizeString(opt.name)));
    const valid: string[] = [];
    const invalid: string[] = [];

    values.forEach(value => {
      const trimmedValue = value.trim();
      if (!trimmedValue) return; // Skip empty values

      // Try exact match first
      const normalizedValue = normalizeString(trimmedValue);
      if (validOptionsSet.has(normalizedValue)) {
        const exactMatch = validOptions.find(opt => normalizeString(opt.name) === normalizedValue);
        if (exactMatch) {
          valid.push(exactMatch.name);
          return;
        }
      }

      // Try simple spelling match (1-2 char difference)
      const match = findSimpleMatch(trimmedValue, validOptions);
      if (match) {
        valid.push(match);
      } else {
        invalid.push(trimmedValue);
      }
    });

    return { valid, invalid };
  };

  // Process CSV data and prepare for upload (with error collection)
  const processCSVData = async (data: any[]): Promise<{
    validInvestors: CreateInvestorListItem[];
    errors: Array<{ row: number; error: string; data: any; invalidFields: { field: string; invalidValues: string[]; validOptions: string[] }[] }>;
  }> => {
      // Ensure dropdown options are loaded
      if (firmTypeOptions.length === 0 || domainOptions.length === 0 || 
          roundTypeOptions.length === 0 || countryOptions.length === 0) {
        await loadDropdownOptions();
      }

    const errors: Array<{ row: number; error: string; data: any; invalidFields: { field: string; invalidValues: string[]; validOptions: string[]; suggestions: Map<string, string> }[] }> = [];
    const validInvestors: CreateInvestorListItem[] = [];

    data.forEach((row: any, index: number) => {
      const parseArrayField = (value: string): string[] => {
        if (!value || value.trim() === '') return [];
        // Split by comma, forward slash, or hyphen (with optional spaces around them)
        // Handles: "A, B", "A / B", "A - B", "A,B/C-D", etc.
        // Use positive lookahead/lookbehind to split on separators while preserving content
        return value
          .split(/\s*[,/\-]\s*/) // Split by comma, forward slash, or hyphen with optional spaces
          .map(v => v.trim().replace(/^[()]+|[()]+$/g, '')) // Remove leading/trailing parentheses
          .filter(v => v.length > 0 && v !== ')'); // Filter out empty strings and standalone closing parens
      };

      const name = (row['Name'] || row['name'] || row['Investor Name'] || row['Investor'] || '').toString().trim();
      
      // Check required field
      if (!name) {
        errors.push({
          row: index + 2,
          error: 'Name is required',
          data: row,
          invalidFields: []
        });
        return;
      }

        // Parse raw values from CSV
        const rawFundType = parseArrayField((row['Fund Type'] || row['fund_type'] || row['Fund'] || row['Type'] || '').toString());
        const rawDomain = parseArrayField((row['Domain'] || row['domain'] || row['Sector'] || row['sector'] || '').toString());
        const rawRoundType = parseArrayField((row['Round Type'] || row['round_type'] || row['Stage'] || row['stage'] || row['Investment Stage'] || '').toString());
        const rawCountry = parseArrayField((row['Country'] || row['country'] || row['Location'] || row['location'] || '').toString());

        // Validate against general_data with fuzzy matching
        const fundTypeValidation = validateValues(rawFundType, firmTypeOptions, 'Fund Type');
        const domainValidation = validateValues(rawDomain, domainOptions, 'Domain');
        const roundTypeValidation = validateValues(rawRoundType, roundTypeOptions, 'Round Type');
        const countryValidation = validateValues(rawCountry, countryOptions, 'Country');

      // Collect invalid fields (simple - no suggestions)
      const invalidFields: { field: string; invalidValues: string[]; validOptions: string[] }[] = [];
      
      if (fundTypeValidation.invalid.length > 0) {
        invalidFields.push({
          field: 'Fund Type',
          invalidValues: fundTypeValidation.invalid,
          validOptions: firmTypeOptions.map(o => o.name)
        });
      }
      if (domainValidation.invalid.length > 0) {
        invalidFields.push({
          field: 'Domain',
          invalidValues: domainValidation.invalid,
          validOptions: domainOptions.map(o => o.name)
        });
      }
        if (roundTypeValidation.invalid.length > 0) {
          invalidFields.push({
            field: 'Round Type',
            invalidValues: roundTypeValidation.invalid,
            validOptions: roundTypeOptions.map(o => o.name)
          });
        }
      if (countryValidation.invalid.length > 0) {
        invalidFields.push({
          field: 'Country',
          invalidValues: countryValidation.invalid,
          validOptions: countryOptions.map(o => o.name)
        });
      }

      if (invalidFields.length > 0) {
        const errorMessages = invalidFields.map(f => 
          `Invalid ${f.field}(s): ${f.invalidValues.join(', ')}`
        );
        errors.push({
          row: index + 2,
          error: errorMessages.join(' | '),
          data: row,
          invalidFields
        });
      }

      // Create valid investor data (with only valid values)
      const investor: CreateInvestorListItem = {
        name,
          // Use validated values (which may include auto-corrected fuzzy matches)
          fund_type: fundTypeValidation.valid.length > 0 ? fundTypeValidation.valid : undefined,
          website: (row['Website'] || row['website'] || row['Web'] || '').toString().trim() || undefined,
          domain: domainValidation.valid.length > 0 ? domainValidation.valid : undefined,
          round_type: roundTypeValidation.valid.length > 0 ? roundTypeValidation.valid : undefined,
          country: countryValidation.valid.length > 0 ? countryValidation.valid : undefined,
        linkedin: (row['LinkedIn'] || row['linkedin'] || row['Linked In'] || row['LinkedIn URL'] || '').toString().trim() || undefined,
        image_url: (row['Image URL'] || row['image_url'] || row['Image'] || row['Logo'] || row['logo'] || '').toString().trim() || undefined,
        is_active: true
      };

      validInvestors.push(investor);
    });

    return {
      validInvestors,
      errors
    };
  };

  // Download error log as CSV (after upload)
  const downloadErrorLog = () => {
    if (!uploadResults || uploadResults.errorRows.length === 0) return;

    const errorData = uploadResults.errorRows.map(error => ({
      'Row Number': error.row,
      'Investor Name': (error.data['Name'] || error.data['name'] || error.data['Investor Name'] || error.data['Investor'] || error.data?.name || '').toString().trim(),
      'Error': error.error,
      'Fund Type': error.data['Fund Type'] || error.data['fund_type'] || error.data?.fund_type?.join(', ') || '',
      'Domain': error.data['Domain'] || error.data['domain'] || error.data?.domain?.join(', ') || '',
      'Round Type': error.data['Round Type'] || error.data['round_type'] || error.data['Stage'] || error.data['stage'] || error.data?.round_type?.join(', ') || '',
      'Country': error.data['Country'] || error.data['country'] || error.data?.country?.join(', ') || '',
      'Website': error.data['Website'] || error.data['website'] || error.data?.website || '',
      'LinkedIn': error.data['LinkedIn'] || error.data['linkedin'] || error.data?.linkedin || '',
      'Image URL': error.data['Image URL'] || error.data['image_url'] || error.data?.image_url || ''
    }));

    const headers = Object.keys(errorData[0]);
    const csvContent = [
      headers.join(','),
      ...errorData.map(row =>
        headers.map(header => {
          const value = row[header as keyof typeof row];
          return typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `investor_upload_errors_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle bulk upload directly (no validation step)
  const handleBulkUpload = async () => {
    if (!uploadFile) {
      alert('Please select a CSV file first.');
      return;
    }

    setUploadProgress({ isUploading: true, success: 0, errors: [] });

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      // Read CSV file
      const csvData = await readCSVFile(uploadFile);
      setOriginalCSVData(csvData);

      // Ensure dropdown options are loaded
      if (firmTypeOptions.length === 0 || domainOptions.length === 0 || 
          roundTypeOptions.length === 0 || countryOptions.length === 0) {
        await loadDropdownOptions();
      }

      // Process CSV data (validate against general_data)
      const processed = await processCSVData(csvData);
      
      // Upload valid investors to database
      const uploadResult = await investorListService.bulkImport(processed.validInvestors, userId);
      
      // Combine validation errors with upload errors
      const allErrors: Array<{ row: number; error: string; data: any }> = [];
      
      // Add validation errors
      processed.errors.forEach(err => {
        allErrors.push({
          row: err.row,
          error: err.error,
          data: err.data
        });
      });
      
      // Add upload errors
      uploadResult.errors.forEach(err => {
        allErrors.push({
          row: err.row,
          error: err.error,
          data: err.data
        });
      });

      // Map results back to original CSV rows
      const successRows: Array<{ row: number; data: any; investor: any }> = [];
      const errorRows: Array<{ row: number; error: string; data: any }> = [];
      
      // Track successful uploads
      processed.validInvestors.forEach((investor, index) => {
        const originalRow = index + 2; // +2 because CSV has header and 0-indexed
        const originalData = csvData.find((row: any) => {
          const rowName = (row['Name'] || row['name'] || row['Investor Name'] || row['Investor'] || '').toString().trim();
          return rowName.toLowerCase() === investor.name.toLowerCase();
        }) || {};
        
        // Check if this investor had upload errors
        const uploadError = uploadResult.errors.find(e => {
          const errorName = e.data?.name?.toLowerCase();
          return errorName === investor.name.toLowerCase();
        });
        
        if (!uploadError) {
          successRows.push({ row: originalRow, data: originalData, investor });
        } else {
          errorRows.push({ row: originalRow, error: uploadError.error, data: originalData });
        }
      });
      
      // Add validation errors
      processed.errors.forEach(err => {
        errorRows.push({ row: err.row, error: err.error, data: err.data });
      });
      
      // Store results
      setUploadResults({
        successRows,
        errorRows,
        totalProcessed: csvData.length
      });
      
      setUploadProgress({
        isUploading: false,
        success: uploadResult.success,
        errors: allErrors
      });

      // Reload data
      await loadInvestors();
      
      // Show results
      if (allErrors.length === 0) {
        alert(`Successfully uploaded ${uploadResult.success} investors!`);
      } else {
        alert(`Uploaded ${uploadResult.success} investors successfully. ${allErrors.length} error(s) occurred. Download the error log for details.`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setUploadProgress({
        isUploading: false,
        success: 0,
        errors: [{ row: 0, error: errorMessage, data: null }]
      });
      setUploadResults({
        successRows: [],
        errorRows: [{ row: 0, error: errorMessage, data: null }],
        totalProcessed: 0
      });
      alert(`Error uploading file: ${errorMessage}`);
    }
  };

  // Download upload results
  const downloadUploadResults = () => {
    if (!uploadResults) return;

    const resultsData: any[] = [];

    // Add successful rows
    uploadResults.successRows.forEach(({ row, data, investor }) => {
      resultsData.push({
        'Row Number': row,
        'Status': 'Success',
        'Name': data['Name'] || data['name'] || data['Investor Name'] || data['Investor'] || investor.name || '',
        'Fund Type': data['Fund Type'] || data['fund_type'] || investor.fund_type?.join(', ') || '',
        'Website': data['Website'] || data['website'] || investor.website || '',
        'Domain': data['Domain'] || data['domain'] || investor.domain?.join(', ') || '',
        'Round Type': data['Round Type'] || data['round_type'] || data['Stage'] || data['stage'] || investor.round_type?.join(', ') || '',
        'Country': data['Country'] || data['country'] || investor.country?.join(', ') || '',
        'LinkedIn': data['LinkedIn'] || data['linkedin'] || investor.linkedin || '',
        'Image URL': data['Image URL'] || data['image_url'] || investor.image_url || '',
        'Message': 'Successfully imported',
        'Error': ''
      });
    });

    // Add error rows
    uploadResults.errorRows.forEach(({ row, error, data }) => {
      resultsData.push({
        'Row Number': row,
        'Status': 'Error',
        'Name': data['Name'] || data['name'] || data['Investor Name'] || data['Investor'] || data?.name || '',
        'Fund Type': data['Fund Type'] || data['fund_type'] || data?.fund_type?.join(', ') || '',
        'Website': data['Website'] || data['website'] || data?.website || '',
        'Domain': data['Domain'] || data['domain'] || data?.domain?.join(', ') || '',
        'Round Type': data['Round Type'] || data['round_type'] || data['Stage'] || data['stage'] || data?.round_type?.join(', ') || '',
        'Country': data['Country'] || data['country'] || data?.country?.join(', ') || '',
        'LinkedIn': data['LinkedIn'] || data['linkedin'] || data?.linkedin || '',
        'Image URL': data['Image URL'] || data['image_url'] || data?.image_url || '',
        'Message': 'Failed to import',
        'Error': error
      });
    });

    // Sort by row number
    resultsData.sort((a, b) => a['Row Number'] - b['Row Number']);

    // Convert to CSV
    const headers = Object.keys(resultsData[0] || {});
    const csvContent = [
      headers.join(','),
      ...resultsData.map(row =>
        headers.map(header => {
          const value = row[header as keyof typeof row];
          return typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `investor_upload_results_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download sample CSV file
  const downloadSampleFile = () => {
    const sampleData = [
      {
        'Name': 'Sequoia Capital',
        'Fund Type': 'VC,Corporate VC',
        'Website': 'https://www.sequoiacap.com',
        'Domain': 'Technology,AI,SaaS',
        'Round Type': 'Series A,Series B,Series C',
        'Country': 'United States,India,Singapore',
        'LinkedIn': 'https://www.linkedin.com/company/sequoia-capital',
        'Image URL': 'https://example.com/sequoia-logo.png'
      },
      {
        'Name': 'Accel Partners',
        'Fund Type': 'VC',
        'Website': 'https://www.accel.com',
        'Domain': 'SaaS / FinTech',
        'Round Type': 'Seed / Series A',
        'Country': 'United States / United Kingdom',
        'LinkedIn': 'https://www.linkedin.com/company/accel',
        'Image URL': 'https://example.com/accel-logo.png'
      },
      {
        'Name': 'Y Combinator',
        'Fund Type': 'Accelerator',
        'Website': 'https://www.ycombinator.com',
        'Domain': 'Technology - AI',
        'Round Type': 'Pre-Seed - Seed',
        'Country': 'United States',
        'LinkedIn': 'https://www.linkedin.com/company/y-combinator',
        'Image URL': 'https://example.com/yc-logo.png'
      }
    ];

    // Convert to CSV
    const headers = Object.keys(sampleData[0]);
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escape commas and quotes in CSV
          return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'investor_list_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p>Loading investors...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Investor List Management</h2>
          <p className="text-sm text-slate-600 mt-1">Manage investors that appear in the startup dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAdd} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Investor
          </Button>
          <Button onClick={() => setShowBulkUpload(true)} variant="secondary" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Bulk Upload
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
                  placeholder="Search by name, fund type, domain, country, or round type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-slate-600">Show inactive</span>
          </label>
        </div>
      </Card>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {editingInvestor ? 'Edit Investor' : 'Add New Investor'}
            </h3>
            <Button variant="ghost" onClick={() => {
              setShowAddForm(false);
              setEditingInvestor(null);
            }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Investor/VC Firm Name"
              />
            </div>
            <div className="relative" ref={fundTypeRef}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fund Type</label>
              <button
                type="button"
                onClick={() => setShowFundTypeDropdown(!showFundTypeDropdown)}
                className="w-full px-3 py-2 text-left border border-slate-300 rounded-md bg-white flex items-center justify-between hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="text-sm text-slate-700">
                  {formData.fund_type && formData.fund_type.length > 0
                    ? `${formData.fund_type.length} selected`
                    : 'Select Fund Type(s)'}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {showFundTypeDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="p-2">
                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setFormData({ ...formData, fund_type: firmTypeOptions.map(opt => opt.name) })}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setFormData({ ...formData, fund_type: [] })}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {firmTypeOptions.map((option) => (
                        <label
                          key={option.id}
                          className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer rounded"
                        >
                          <input
                            type="checkbox"
                            checked={formData.fund_type?.includes(option.name) || false}
                            onChange={() => handleMultiSelectToggle('fund_type', option.name)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2"
                          />
                          <span className="text-sm text-slate-700">{option.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {formData.fund_type && formData.fund_type.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.fund_type.map((type) => (
                    <span key={type} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                      {type}
                      <button
                        type="button"
                        onClick={() => handleMultiSelectToggle('fund_type', type)}
                        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://..."
                type="url"
              />
            </div>
            <div className="relative" ref={domainRef}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Domain</label>
              <button
                type="button"
                onClick={() => setShowDomainDropdown(!showDomainDropdown)}
                className="w-full px-3 py-2 text-left border border-slate-300 rounded-md bg-white flex items-center justify-between hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="text-sm text-slate-700">
                  {formData.domain && formData.domain.length > 0
                    ? `${formData.domain.length} selected`
                    : 'Select Domain(s)'}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {showDomainDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="p-2">
                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setFormData({ ...formData, domain: domainOptions.map(opt => opt.name) })}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setFormData({ ...formData, domain: [] })}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {domainOptions.map((option) => (
                        <label
                          key={option.id}
                          className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer rounded"
                        >
                          <input
                            type="checkbox"
                            checked={formData.domain?.includes(option.name) || false}
                            onChange={() => handleMultiSelectToggle('domain', option.name)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2"
                          />
                          <span className="text-sm text-slate-700">{option.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {formData.domain && formData.domain.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.domain.map((domain) => (
                    <span key={domain} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                      {domain}
                      <button
                        type="button"
                        onClick={() => handleMultiSelectToggle('domain', domain)}
                        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={roundTypeRef}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Round Type</label>
              <button
                type="button"
                onClick={() => setShowRoundTypeDropdown(!showRoundTypeDropdown)}
                className="w-full px-3 py-2 text-left border border-slate-300 rounded-md bg-white flex items-center justify-between hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="text-sm text-slate-700">
                  {formData.round_type && formData.round_type.length > 0
                    ? `${formData.round_type.length} selected`
                    : 'Select Round Type(s)'}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {showRoundTypeDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="p-2">
                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setFormData({ ...formData, round_type: roundTypeOptions.map(opt => opt.name) })}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setFormData({ ...formData, round_type: [] })}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {roundTypeOptions.map((option) => (
                        <label
                          key={option.id}
                          className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer rounded"
                        >
                          <input
                            type="checkbox"
                            checked={formData.round_type?.includes(option.name) || false}
                            onChange={() => handleMultiSelectToggle('round_type', option.name)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2"
                          />
                          <span className="text-sm text-slate-700">{option.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {formData.round_type && formData.round_type.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.round_type.map((roundType) => (
                    <span key={roundType} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                      {roundType}
                      <button
                        type="button"
                        onClick={() => handleMultiSelectToggle('round_type', roundType)}
                        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-purple-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" ref={countryRef}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
              <button
                type="button"
                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                className="w-full px-3 py-2 text-left border border-slate-300 rounded-md bg-white flex items-center justify-between hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="text-sm text-slate-700">
                  {formData.country && formData.country.length > 0
                    ? `${formData.country.length} selected`
                    : 'Select Country(ies)'}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {showCountryDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="p-2">
                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setFormData({ ...formData, country: countryOptions.map(opt => opt.name) })}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setFormData({ ...formData, country: [] })}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {countryOptions.map((option) => (
                        <label
                          key={option.id}
                          className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer rounded"
                        >
                          <input
                            type="checkbox"
                            checked={formData.country?.includes(option.name) || false}
                            onChange={() => handleMultiSelectToggle('country', option.name)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2"
                          />
                          <span className="text-sm text-slate-700">{option.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {formData.country && formData.country.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.country.map((country) => (
                    <span key={country} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                      {country}
                      <button
                        type="button"
                        onClick={() => handleMultiSelectToggle('country', country)}
                        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-orange-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn</label>
              <Input
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                placeholder="https://www.linkedin.com/company/..."
                type="url"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://... (Investor logo/image URL)"
                type="url"
              />
              <p className="text-xs text-slate-500 mt-1">Enter the URL of the investor's logo or image</p>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-slate-600">Active (visible to startups)</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => {
              setShowAddForm(false);
              setEditingInvestor(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {editingInvestor ? 'Update' : 'Create'}
            </Button>
          </div>
        </Card>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Bulk Upload Investors</h3>
            <Button variant="ghost" onClick={() => {
              setShowBulkUpload(false);
              setUploadFile(null);
              setValidationResult(null);
              setUploadProgress({ isUploading: false, success: 0, errors: [] });
              setUploadResults(null);
              setOriginalCSVData([]);
            }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-600 mb-2">
                Upload a CSV file with investor data. Required columns: Name. Optional columns: Fund Type, Website, Domain, Round Type, Country, LinkedIn, Image URL.
                <br />
                <span className="text-xs text-slate-500 mt-1 block">
                  <strong>Workflow:</strong> 1) Select CSV file → 2) Click "Upload CSV" → 3) After upload, download error log if there are errors → 4) Fix errors and add missing data to General Data table → 5) Upload again.
                  <br />
                  <strong>Important:</strong> For multiple values in Fund Type, Domain, Round Type, or Country, separate them with commas, forward slashes, or hyphens (e.g., "VC,Angel Investor", "Technology / AI / SaaS", or "Pre-Seed-Seed-Series A").
                  <br />
                  <strong>Validation:</strong> The system automatically corrects simple spelling mistakes (1-2 character differences for similar length strings). Values must match those in the General Data table. Invalid values will be shown in the error log after upload.
                </span>
              </p>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    setUploadFile(e.target.files?.[0] || null);
                    setValidationResult(null);
                    setUploadProgress({ isUploading: false, success: 0, errors: [] });
                  }}
                  className="text-sm"
                />
                <Button onClick={downloadSampleFile} variant="secondary" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Sample
                </Button>
              </div>
            </div>
            
            {/* Upload Button */}
            {uploadFile && (
              <div className="flex gap-2">
                <Button 
                  onClick={handleBulkUpload} 
                  disabled={uploadProgress.isUploading}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {uploadProgress.isUploading ? 'Uploading...' : 'Upload CSV'}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    setUploadFile(null);
                    setUploadProgress({ isUploading: false, success: 0, errors: [] });
                    setUploadResults(null);
                    setOriginalCSVData([]);
                  }}
                  disabled={uploadProgress.isUploading}
                >
                  Clear
                </Button>
              </div>
            )}

            {/* Old validation results - removed */}
            {false && (
              <div className="space-y-4">
                {validationResult.isValid ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-800 font-medium mb-1">✓ Validation Passed!</p>
                    <p className="text-sm text-green-700">
                      {validationResult.validInvestors.length} investor(s) are ready to import.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-yellow-800 font-medium mb-1">⚠ Validation Found Errors</p>
                      <p className="text-sm text-yellow-700 mb-2">
                        {validationResult.errors.length} row(s) have invalid values. 
                        {(() => {
                          const hasSuggestions = validationResult.errors.some(e => 
                            e.invalidFields.some(f => f.suggestions.size > 0)
                          );
                          return hasSuggestions 
                            ? ' Some values were auto-corrected or have suggestions (see below).'
                            : ' Please download the error log, add missing data to the General Data table, then validate again.';
                        })()}
                      </p>
                      <Button 
                        onClick={downloadErrorLog}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Error Log
                      </Button>
                    </div>

                    {/* Show Suggestions */}
                    {validationResult.errors.some(e => 
                      e.invalidFields.some(f => f.suggestions.size > 0)
                    ) && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-blue-800 font-medium mb-2">💡 Suggestions & Auto-Corrections</p>
                        <div className="space-y-2 text-sm">
                          {validationResult.errors.map((error, idx) => {
                            const fieldsWithSuggestions = error.invalidFields.filter(f => f.suggestions.size > 0);
                            if (fieldsWithSuggestions.length === 0) return null;
                            
                            return (
                              <div key={idx} className="text-blue-700">
                                <strong>Row {error.row}:</strong>
                                {fieldsWithSuggestions.map((field, fIdx) => (
                                  <div key={fIdx} className="ml-4 mt-1">
                                    <strong>{field.field}:</strong>
                                    {Array.from(field.suggestions.entries()).map(([invalid, suggested], sIdx) => (
                                      <div key={sIdx} className="ml-2 text-xs">
                                        "{invalid}" → "{suggested}" {field.field === 'Domain' && '(auto-corrected if very close)'}
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-blue-600 mt-2">
                          Note: Values with very close matches (1-2 character differences) are automatically corrected. 
                          Others are shown as suggestions for manual review.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Import Button (only if validation passed) */}
                {validationResult.isValid && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleBulkUpload} 
                      disabled={uploadProgress.isUploading}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {uploadProgress.isUploading ? 'Importing...' : `Import ${validationResult.validInvestors.length} Investor(s)`}
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => {
                        setUploadFile(null);
                        setValidationResult(null);
                        setUploadProgress({ isUploading: false, success: 0, errors: [] });
                      }}
                      disabled={uploadProgress.isUploading}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {/* Show validation errors */}
                {validationResult.errors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-800 font-medium mb-2">Validation Errors ({validationResult.errors.length}):</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {validationResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-700">
                          <p className="font-medium">Row {error.row}: {error.data['Name'] || error.data['name'] || 'Unknown'}</p>
                          <p className="text-xs ml-2">{error.error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Import Results */}
            {(uploadProgress.success > 0 || uploadProgress.errors.length > 0) && !uploadProgress.isUploading && (
              <div className="space-y-3">
                {uploadProgress.success > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                    <p className="text-green-800 font-medium">✓ Successfully imported {uploadProgress.success} investor(s)</p>
                  </div>
                )}
                {uploadProgress.errors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-800 font-medium mb-2">Import Errors ({uploadProgress.errors.length}):</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {uploadProgress.errors.map((error, index) => (
                        <p key={index} className="text-sm text-red-700">
                          Row {error.row}: {error.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Download Error Log Button */}
                {uploadResults && uploadResults.errorRows.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-blue-800 font-medium mb-2">📥 Download Error Log</p>
                    <p className="text-sm text-blue-700 mb-3">
                      Download a CSV file with all errors from the upload. Fix the issues and upload again.
                    </p>
                    <Button
                      onClick={downloadErrorLog}
                      variant="secondary"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Error Log
                    </Button>
                  </div>
                )}
                
                {/* Download Results Button */}
                {uploadResults && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-800 font-medium mb-2">📥 Download Upload Results</p>
                    <p className="text-sm text-green-700 mb-3">
                      Download a detailed CSV report with all upload results including successful imports and errors.
                    </p>
                    <Button
                      onClick={downloadUploadResults}
                      variant="secondary"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Results CSV
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Investors List */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Fund Type</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Domain</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Round Type</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Country</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Links</th>
                <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvestors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    {searchTerm ? 'No investors found matching your search' : 'No investors found. Add your first investor!'}
                  </td>
                </tr>
              ) : (
                filteredInvestors.map((investor) => (
                  <tr key={investor.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{investor.name}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {investor.fund_type && investor.fund_type.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {investor.fund_type.map((type, idx) => (
                            <span key={idx} className="inline-block px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                              {type}
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {investor.domain && investor.domain.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {investor.domain.map((domain, idx) => (
                            <span key={idx} className="inline-block px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                              {domain}
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {investor.round_type && investor.round_type.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {investor.round_type.map((roundType, idx) => (
                            <span key={idx} className="inline-block px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                              {roundType}
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {investor.country && investor.country.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {investor.country.map((country, idx) => (
                            <span key={idx} className="inline-block px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800">
                              {country}
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {investor.website && (
                          <a
                            href={investor.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title="Website"
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                        {investor.linkedin && (
                          <a
                            href={investor.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                            title="LinkedIn"
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        )}
                        {!investor.website && !investor.linkedin && <span className="text-slate-400">-</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        investor.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {investor.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(investor)}
                          className="p-1"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(investor.id)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredInvestors.length > 0 && (
          <div className="mt-4 text-sm text-slate-600">
            Showing {filteredInvestors.length} of {investors.length} investors
          </div>
        )}
      </Card>
    </div>
  );
};

export default InvestorListManager;

