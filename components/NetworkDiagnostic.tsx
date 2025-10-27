import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

const NetworkDiagnostic: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    const newResults: DiagnosticResult[] = [];

    // Test 1: Check if we're online
    newResults.push({
      test: 'Internet Connectivity',
      status: navigator.onLine ? 'success' : 'error',
      message: navigator.onLine ? 'Internet connection detected' : 'No internet connection',
    });

    // Test 2: Check DNS resolution
    try {
      const response = await fetch('https://www.google.com/favicon.ico', { 
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      newResults.push({
        test: 'DNS Resolution',
        status: 'success',
        message: 'DNS resolution working',
      });
    } catch (error) {
      newResults.push({
        test: 'DNS Resolution',
        status: 'error',
        message: 'DNS resolution failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test 3: Check if external CDNs are accessible
    const cdnTests = [
      { name: 'Tailwind CDN', url: 'https://cdn.tailwindcss.com' },
      { name: 'ESM.sh CDN', url: 'https://esm.sh' },
      { name: 'Google Fonts', url: 'https://fonts.googleapis.com' },
    ];

    for (const cdnTest of cdnTests) {
      try {
        const response = await fetch(cdnTest.url, { 
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        });
        newResults.push({
          test: `${cdnTest.name} Access`,
          status: 'success',
          message: `${cdnTest.name} is accessible`,
        });
      } catch (error) {
        newResults.push({
          test: `${cdnTest.name} Access`,
          status: 'error',
          message: `${cdnTest.name} is blocked or unreachable`,
          details: `This might be why your CSS doesn't work on BSNL`,
        });
      }
    }

    // Test 4: Check local assets
    try {
      const response = await fetch('/index.css', { method: 'HEAD' });
      newResults.push({
        test: 'Local CSS Assets',
        status: response.ok ? 'success' : 'warning',
        message: response.ok ? 'Local CSS files accessible' : 'Local CSS files not found',
      });
    } catch (error) {
      newResults.push({
        test: 'Local CSS Assets',
        status: 'warning',
        message: 'Local CSS files not accessible',
        details: 'Make sure to build the project with npm run build',
      });
    }

    // Test 5: Check ISP-specific issues
    const userAgent = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    
    newResults.push({
      test: 'Device Detection',
      status: 'success',
      message: `Device: ${isMobile ? 'Mobile' : 'Desktop'}`,
    });

    setResults(newResults);
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Wifi className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Network Diagnostic Tool</h2>
            <p className="text-gray-600">Check why your CSS might not work on different ISPs</p>
          </div>
        </div>

        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="btn-primary mb-6 flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Running Diagnostics...
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4" />
              Run Network Diagnostics
            </>
          )}
        </button>

        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Diagnostic Results</h3>
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{result.test}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        result.status === 'success' ? 'bg-green-100 text-green-800' :
                        result.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {result.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-700">{result.message}</p>
                    {result.details && (
                      <p className="text-sm text-gray-600 mt-1">{result.details}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Solutions for ISP Issues:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>DNS Issues:</strong> Change DNS to 8.8.8.8, 8.8.4.4 (Google) or 1.1.1.1, 1.0.0.1 (Cloudflare)</li>
            <li>• <strong>CDN Blocking:</strong> Use local assets instead of external CDNs</li>
            <li>• <strong>Firewall:</strong> Check if corporate firewall is blocking resources</li>
            <li>• <strong>IPv6 Issues:</strong> Disable IPv6 in network settings</li>
            <li>• <strong>Cache Issues:</strong> Clear browser cache and try incognito mode</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NetworkDiagnostic;

