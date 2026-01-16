import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { MapPin, CreditCard, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generalDataService } from '../../lib/generalDataService';

interface CountryConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (country: string, priceInr: number | null, gateway: 'razorpay' | 'stripe' | 'paypal') => void;
  planTier: 'free' | 'basic' | 'premium';
  planName: string;
  basePriceEur: number;
  userCountry?: string;
}

export default function CountryConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  planTier,
  planName,
  basePriceEur,
  userCountry
}: CountryConfirmationModalProps) {
  const [selectedCountry, setSelectedCountry] = useState(userCountry || '');
  const [countries, setCountries] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [countryPrice, setCountryPrice] = useState<{ price_inr: number | null; payment_gateway: 'razorpay' | 'stripe' | 'paypal' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Load countries from general_data table
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setLoadingCountries(true);
        const countryData = await generalDataService.getItemsByCategory('country');
        const countryNames = countryData.map(country => country.name);
        setCountries(countryNames);
      } catch (error) {
        console.error('Error loading countries:', error);
        // Fallback to common countries if general_data table fails
        setCountries(['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Singapore', 'United Arab Emirates', 'Other']);
      } finally {
        setLoadingCountries(false);
      }
    };

    if (isOpen) {
      loadCountries();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedCountry && isOpen) {
      fetchCountryPrice();
    }
  }, [selectedCountry, isOpen, planTier]);

  const fetchCountryPrice = async () => {
    try {
      setLoading(true);
      
      // Use real country price service
      const { countryPriceService } = await import('../../lib/countryPriceService');
      const { selectPaymentGateway } = await import('../../lib/paymentGatewaySelector');
      
      const priceData = await countryPriceService.getCountryPrice(selectedCountry, planTier);
      const gateway = selectPaymentGateway(selectedCountry);
      
      if (priceData) {
        setCountryPrice({
          price_inr: priceData.price_inr || null,
          payment_gateway: gateway as 'razorpay' | 'stripe' | 'paypal'
        });
      } else {
        // Fallback pricing
        const isIndia = selectedCountry === 'India';
        setCountryPrice({
          price_inr: isIndia ? (planTier === 'basic' ? 450 : 1800) : null,
          payment_gateway: gateway as 'razorpay' | 'stripe' | 'paypal'
        });
      }
    } catch (error) {
      console.error('Error fetching country price:', error);
      // Fallback on error
      const isIndia = selectedCountry === 'India';
      setCountryPrice({
        price_inr: isIndia ? (planTier === 'basic' ? 450 : 1800) : null,
        payment_gateway: isIndia ? 'razorpay' : 'stripe'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedCountry && countryPrice) {
      onConfirm(selectedCountry, countryPrice.price_inr, countryPrice.payment_gateway);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Your Subscription">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-gray-600 mb-1">Plan</p>
          <p className="text-lg font-semibold">{planName}</p>
          <p className="text-sm text-gray-600">Base Price: €{basePriceEur}/month</p>
        </div>

        <div>
          <Select
            label="Your Country"
            id="country-select"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            disabled={loadingCountries}
          >
            <option value="">{loadingCountries ? 'Loading countries...' : 'Select a country'}</option>
            {countries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </Select>
        </div>

        {selectedCountry && countryPrice && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center mb-2">
              <MapPin className="h-5 w-5 text-blue-600 mr-2" />
              <p className="font-semibold text-blue-900">Amount to Pay</p>
            </div>
            <p className="text-2xl font-bold text-blue-900 mb-2">
              {countryPrice.price_inr 
                ? `₹${countryPrice.price_inr.toLocaleString('en-IN')}`
                : `€${basePriceEur.toLocaleString('en-EU')}`
              }
            </p>
            <div className="flex items-center text-sm text-blue-700">
              <CreditCard className="h-4 w-4 mr-2" />
              <span>Payment via: {
                countryPrice.payment_gateway === 'razorpay' ? 'Razorpay' : 
                countryPrice.payment_gateway === 'stripe' ? 'Stripe' : 
                'PayPal'
              }</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600">Loading pricing...</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedCountry || !countryPrice || loading}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Continue to Payment
          </Button>
        </div>
      </div>
    </Modal>
  );
}
