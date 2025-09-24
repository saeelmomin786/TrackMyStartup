import React, { useState } from 'react';
import { Startup, NewInvestment, InvestmentOffer } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import AddStartupModal from './AddStartupModal';
import AdvisorAwareLogo from './AdvisorAwareLogo';
import { 
  Building2, 
  TrendingUp, 
  Users, 
  FileText, 
  DollarSign, 
  BarChart3,
  Eye,
  Plus,
  Upload,
  Settings,
  Menu,
  Share2
} from 'lucide-react';

interface StartupViewProps {
  startups: Startup[];
  newInvestments: NewInvestment[];
  investmentOffers: InvestmentOffer[];
  onViewStartup: (startup: Startup) => void;
  onMakeOffer: (investmentId: number, offerAmount: number, equityPercentage: number) => void;
  onProcessOffer?: (offerId: number, status: 'approved' | 'rejected' | 'accepted' | 'completed') => void;
}

const StartupView: React.FC<StartupViewProps> = ({
  startups,
  newInvestments,
  investmentOffers,
  onViewStartup,
  onMakeOffer,
  onProcessOffer
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'investments' | 'offers' | 'documents'>('overview');
  const [isAddStartupModalOpen, setIsAddStartupModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Since we're now filtering by user_id in the database, all startups returned are for the current user
  const userStartups = startups;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredStartups = normalizedQuery
    ? userStartups.filter((s) =>
        [s.name, s.sector]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(normalizedQuery))
      )
    : userStartups;

  // Auto-select the first startup for startup users
  React.useEffect(() => {
    if (userStartups.length === 1) {
      onViewStartup(userStartups[0]);
    }
  }, [userStartups, onViewStartup]);

  const userInvestments = newInvestments.filter(investment => 
    userStartups.some(startup => startup.name === investment.name)
  );

  const userOffers = investmentOffers.filter(offer => 
    userStartups.some(startup => startup.name === offer.startup_name)
  );

  const totalFunding = userStartups.reduce((sum, startup) => sum + startup.total_funding, 0);
  const totalRevenue = userStartups.reduce((sum, startup) => sum + startup.total_revenue, 0);
  const averageValuation = userStartups.length > 0 
    ? userStartups.reduce((sum, startup) => sum + startup.current_valuation, 0) / userStartups.length 
    : 0;

  const handleShare = async (startup: Startup) => {
    const details = `Startup: ${startup.name}\nSector: ${startup.sector}\nValuation: ₹${startup.current_valuation}L\nFunding: ₹${startup.total_funding}L\nRevenue: ₹${startup.total_revenue}L`;
    try {
      if (navigator.share) {
        await navigator.share({ title: startup.name, text: details });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(details);
        alert('Startup details copied to clipboard');
      } else {
        // Fallback: hidden textarea copy
        const textarea = document.createElement('textarea');
        textarea.value = details;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Startup details copied to clipboard');
      }
    } catch (err) {
      console.error('Share failed', err);
      alert('Unable to share. Try copying manually.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <AdvisorAwareLogo 
            currentUser={currentUser}
            showText={true}
            textClassName="text-2xl sm:text-3xl font-bold text-slate-900"
          />
          <p className="text-sm sm:text-base text-slate-600 mt-1">Manage your startup portfolio and investments</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <Button 
            onClick={() => setSelectedTab('documents')} 
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
            size="sm"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload Documents</span>
            <span className="sm:hidden">Documents</span>
          </Button>
          <Button 
            onClick={() => setIsAddStartupModalOpen(true)} 
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Startup</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-slate-600">Total Startups</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{userStartups.length}</p>
            </div>
            <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-brand-primary" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-slate-600">Total Funding</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">₹{totalFunding.toLocaleString()}L</p>
            </div>
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-slate-600">Total Revenue</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">₹{totalRevenue.toLocaleString()}L</p>
            </div>
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-slate-600">Avg Valuation</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">₹{averageValuation.toLocaleString()}L</p>
            </div>
            <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Mobile Menu Button */}
      <div className="sm:hidden">
        <Button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          size="sm"
        >
          <Menu className="h-4 w-4" />
          {selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)}
        </Button>
      </div>

      {/* Tabs - Hidden on mobile, shown on larger screens */}
      <div className="hidden sm:block border-b border-slate-200">
        <nav className="flex space-x-4 lg:space-x-8 overflow-x-auto">
          <button
            onClick={() => setSelectedTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              selectedTab === 'overview'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedTab('investments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              selectedTab === 'investments'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Investments ({userInvestments.length})
          </button>
          <button
            onClick={() => setSelectedTab('offers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              selectedTab === 'offers'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Offers ({userOffers.length})
          </button>
          <button
            onClick={() => setSelectedTab('documents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              selectedTab === 'documents'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Documents
          </button>
        </nav>
      </div>

      {/* Mobile Tab Content */}
      {isMobileMenuOpen && (
        <div className="sm:hidden bg-white rounded-lg shadow-lg border border-slate-200 p-4 space-y-2">
          <button
            onClick={() => {
              setSelectedTab('overview');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
              selectedTab === 'overview'
                ? 'bg-brand-primary text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => {
              setSelectedTab('investments');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
              selectedTab === 'investments'
                ? 'bg-brand-primary text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Investments ({userInvestments.length})
          </button>
          <button
            onClick={() => {
              setSelectedTab('offers');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
              selectedTab === 'offers'
                ? 'bg-brand-primary text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Offers ({userOffers.length})
          </button>
          <button
            onClick={() => {
              setSelectedTab('documents');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
              selectedTab === 'documents'
                ? 'bg-brand-primary text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Documents
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="mt-4 sm:mt-6">
        {selectedTab === 'overview' && (
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Your Startups</h2>
            {userStartups.length > 0 && (
              <div className="flex items-center">
                <Input
                  id="startup-search"
                  name="startup-search"
                  placeholder="Search by name or sector"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
            {userStartups.length === 0 ? (
              <Card className="p-6 sm:p-8 text-center">
                <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">No Startups Found</h3>
                <p className="text-sm sm:text-base text-slate-600 mb-4">You haven't registered any startups yet.</p>
                <Button onClick={() => setSelectedTab('overview')} className="flex items-center gap-2 mx-auto" size="sm">
                  <Plus className="h-4 w-4" />
                  Add Your First Startup
                </Button>
              </Card>
            ) : filteredStartups.length === 0 ? (
              <Card className="p-6 sm:p-8 text-center">
                <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">No matches</h3>
                <p className="text-sm sm:text-base text-slate-600">Try a different keyword.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredStartups.map((startup) => (
                  <Card key={startup.id} className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{startup.name}</h3>
                        <p className="text-xs sm:text-sm text-slate-600 truncate">{startup.sector}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ml-2 flex-shrink-0 ${
                        startup.compliance_status === 'Compliant' 
                          ? 'bg-green-100 text-green-800'
                          : startup.compliance_status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {startup.compliance_status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-3 sm:mb-4">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-slate-600">Valuation:</span>
                        <span className="font-medium">₹{startup.current_valuation}L</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-slate-600">Funding:</span>
                        <span className="font-medium">₹{startup.total_funding}L</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-slate-600">Revenue:</span>
                        <span className="font-medium">₹{startup.total_revenue}L</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => onViewStartup(startup)}
                        className="flex-1 flex items-center justify-center gap-2"
                        size="sm"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleShare(startup)}
                        className="flex-1 flex items-center justify-center gap-2"
                        size="sm"
                      >
                        <Share2 className="h-4 w-4" />
                        Share
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'investments' && (
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Investment Opportunities</h2>
            {userInvestments.length === 0 ? (
              <Card className="p-6 sm:p-8 text-center">
                <TrendingUp className="h-10 w-10 sm:h-12 sm:w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">No Investment Opportunities</h3>
                <p className="text-sm sm:text-base text-slate-600">No investment opportunities available for your startups.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {userInvestments.map((investment) => (
                  <Card key={investment.id} className="p-4 sm:p-6">
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{investment.name}</h3>
                        <p className="text-xs sm:text-sm text-slate-600 truncate">{investment.sector}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ml-2 flex-shrink-0 ${
                        investment.compliance_status === 'Compliant' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {investment.compliance_status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-3 sm:mb-4">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-slate-600">Investment Value:</span>
                        <span className="font-medium">₹{investment.investment_value}L</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-slate-600">Equity Allocation:</span>
                        <span className="font-medium">{investment.equity_allocation}%</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-slate-600">Type:</span>
                        <span className="font-medium">{investment.investment_type}</span>
                      </div>
                    </div>
                    
                    <Button className="w-full" size="sm">
                      View Details
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'offers' && (
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Investment Offers</h2>
            {userOffers.length === 0 ? (
              <Card className="p-6 sm:p-8 text-center">
                <DollarSign className="h-10 w-10 sm:h-12 sm:w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">No Offers Received</h3>
                <p className="text-sm sm:text-base text-slate-600">No investment offers have been made for your startups.</p>
              </Card>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {userOffers.map((offer) => (
                  <Card key={offer.id} className="p-4 sm:p-6">
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{offer.startup_name}</h3>
                        <p className="text-xs sm:text-sm text-slate-600 truncate">From: {offer.investor_email}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ml-2 flex-shrink-0 ${
                        offer.status === 'accepted' 
                          ? 'bg-green-100 text-green-800'
                          : offer.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : offer.status === 'approved'
                          ? 'bg-orange-100 text-orange-800'
                          : offer.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div>
                        <p className="text-xs sm:text-sm text-slate-600">Offer Amount</p>
                        <p className="text-base sm:text-lg font-semibold text-slate-900">₹{offer.offer_amount}L</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-slate-600">Equity Percentage</p>
                        <p className="text-base sm:text-lg font-semibold text-slate-900">{offer.equity_percentage}%</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      {offer.status === 'approved' && onProcessOffer && (
                        <>
                          <Button 
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              if (confirm('Are you sure you want to accept this offer? This will finalize the investment deal.')) {
                                onProcessOffer(offer.id, 'accepted');
                              }
                            }}
                            size="sm"
                          >
                            Accept Offer
                          </Button>
                          <Button 
                            className="flex-1 bg-red-600 hover:bg-red-700"
                            onClick={() => {
                              if (confirm('Are you sure you want to decline this offer?')) {
                                onProcessOffer(offer.id, 'rejected');
                              }
                            }}
                            size="sm"
                          >
                            Decline Offer
                          </Button>
                        </>
                      )}
                      {offer.status === 'accepted' && onProcessOffer && (
                        <Button 
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={() => {
                            if (confirm('Mark this investment as completed? This will finalize the transaction.')) {
                              onProcessOffer(offer.id, 'completed');
                            }
                          }}
                          size="sm"
                        >
                          Mark as Completed
                        </Button>
                      )}
                      {(offer.status === 'pending' || offer.status === 'rejected' || offer.status === 'completed') && (
                        <div className="flex-1 text-center text-xs sm:text-sm text-slate-500">
                          {offer.status === 'pending' && 'Waiting for admin approval'}
                          {offer.status === 'rejected' && 'Offer was declined'}
                          {offer.status === 'completed' && 'Investment completed'}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'documents' && (
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Document Management</h2>
            <Card className="p-6 sm:p-8 text-center">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">Upload Your Documents</h3>
              <p className="text-sm sm:text-base text-slate-600 mb-4">Upload your startup documents, pitch decks, and other important files.</p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                <Button className="flex items-center justify-center gap-2 w-full sm:w-auto" size="sm">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Upload Pitch Deck</span>
                  <span className="sm:hidden">Pitch Deck</span>
                </Button>
                <Button className="flex items-center justify-center gap-2 w-full sm:w-auto" size="sm">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Upload Financial Documents</span>
                  <span className="sm:hidden">Financial Docs</span>
                </Button>
                <Button className="flex items-center justify-center gap-2 w-full sm:w-auto" size="sm">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Upload Legal Documents</span>
                  <span className="sm:hidden">Legal Docs</span>
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Add Startup Modal */}
      <AddStartupModal
        isOpen={isAddStartupModalOpen}
        onClose={() => setIsAddStartupModalOpen(false)}
        onStartupAdded={() => {
          // Refresh the startups list
          window.location.reload();
        }}
      />
    </div>
  );
};

export default StartupView;
