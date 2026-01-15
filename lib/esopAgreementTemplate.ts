/**
 * ESOP Agreement Template Generator
 * Generates Word documents (.docx) for Deferred Equity Compensation Agreements
 */

interface AgreementData {
  startupName: string;
  startupLegalName?: string;
  startupAddress?: string;
  startupJurisdiction?: string;
  mentorName: string;
  mentorAddress?: string;
  effectiveDate: string;
  currency: string;
  hourlyRate: number;
  pricePerShare?: number;
  esopPercentage?: number;
  esopValue?: number;
}

/**
 * Generate ESOP Agreement as Word Document
 * Uses a simple HTML-to-Word approach since we don't have docx library
 * Returns a blob that can be downloaded
 */
export async function generateESOPAgreement(data: AgreementData): Promise<Blob> {
  const {
    startupName,
    startupLegalName,
    startupAddress,
    startupJurisdiction,
    mentorName,
    mentorAddress,
    effectiveDate,
    currency,
    hourlyRate,
    pricePerShare,
    esopPercentage,
    esopValue
  } = data;

  // Format currency symbol
  const currencySymbols: { [key: string]: string } = {
    'USD': '$',
    'INR': '₹',
    'EUR': '€',
    'GBP': '£',
    'SGD': 'S$',
    'AED': 'AED '
  };
  const currencySymbol = currencySymbols[currency] || currency || '$';

  // Format date
  const formattedDate = new Date(effectiveDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Generate HTML content for the agreement
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Deferred Equity Compensation Agreement</title>
  <style>
    @page {
      margin: 1in;
    }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.5;
      margin: 0;
      padding: 0;
      color: #000;
      text-align: left;
    }
    h1 {
      font-size: 14pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 30px;
      margin-top: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    h2 {
      font-size: 11pt;
      font-weight: bold;
      margin-top: 18px;
      margin-bottom: 8px;
      text-align: left;
    }
    p {
      margin-bottom: 8px;
      text-align: justify;
      text-indent: 0;
    }
    .section {
      margin-bottom: 12px;
    }
    .subsection {
      margin-left: 0;
      margin-bottom: 8px;
      text-align: justify;
    }
    .subsection-label {
      font-weight: normal;
      display: inline;
    }
    .subsection-content {
      display: inline;
    }
    .list-item {
      margin-left: 20px;
      margin-bottom: 6px;
      text-align: justify;
    }
    .list-item-label {
      font-weight: normal;
      display: inline;
    }
    .signature-section {
      margin-top: 50px;
      page-break-inside: avoid;
    }
    .signature-block {
      margin-top: 30px;
      margin-bottom: 25px;
    }
    .signature-block h3 {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .signature-line {
      border-top: 1px solid #000;
      width: 300px;
      margin-top: 50px;
    }
    .party-info {
      margin-bottom: 12px;
      text-align: left;
    }
    .party-label {
      font-weight: bold;
    }
    .and-separator {
      text-align: center;
      font-weight: bold;
      margin: 12px 0;
    }
    .disclaimer {
      margin-top: 12px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <h1>DEFERRED EQUITY COMPENSATION AGREEMENT (DECA)</h1>
  
  <p>This Deferred Equity Compensation Agreement ("Agreement") is entered into on <strong>${formattedDate}</strong> ("Effective Date") by and between:</p>
  
  <div class="party-info">
    <p><strong>${startupLegalName || startupName}</strong>${startupJurisdiction ? `, a company incorporated under the laws of ${startupJurisdiction}` : ''}${startupAddress ? `, having its registered office at ${startupAddress}` : ''}</p>
    <p class="party-label">("Startup")</p>
  </div>
  
  <p class="and-separator">AND</p>
  
  <div class="party-info">
    <p><strong>${mentorName}</strong>${mentorAddress ? `, residing at ${mentorAddress}` : ''}</p>
    <p class="party-label">("Mentor")</p>
  </div>
  
  <p>The Startup and the Mentor are collectively referred to as the "Parties".</p>
  
  <p class="disclaimer">Track My Startup ("TMS") is referenced herein as a designated facilitation and settlement platform and is not a party to this Agreement.</p>
  
  <div class="section">
    <h2>1. Nature of Engagement</h2>
    <p class="subsection"><span class="subsection-label">1.1</span> <span class="subsection-content">The Mentor is engaged as an independent mentor and not as an employee, consultant, agent, partner, or representative of the Startup or TMS.</span></p>
    <p class="subsection"><span class="subsection-label">1.2</span> <span class="subsection-content">Mentorship services shall be provided on an hourly basis, with scope, frequency, and format mutually agreed between the Parties.</span></p>
    <p class="subsection"><span class="subsection-label">1.3</span> <span class="subsection-content">Nothing in this Agreement shall be construed to create any employment, partnership, fiduciary, or agency relationship.</span></p>
  </div>
  
  <div class="section">
    <h2>2. Deferred Equity Compensation Model</h2>
    <p class="subsection"><span class="subsection-label">2.1 Equity in Lieu of Cash</span></p>
    <p>In lieu of cash compensation, the Mentor shall earn deferred equity compensation for mentoring services rendered and accepted by the Startup.</p>
    
    <p class="subsection"><span class="subsection-label">2.2 Hourly Deferred Equity Rate (Platform-Recorded)</span></p>
    <p>The monetary value attributable to one (1) hour of mentoring services for the purpose of accruing deferred equity compensation ("Hourly Deferred Equity Rate") of <strong>${currencySymbol}${hourlyRate.toLocaleString()}</strong> has been mutually agreed between the Startup and the Mentor prior to execution of this Agreement.</p>
    <p>The Parties expressly acknowledge and agree that:</p>
    <p class="list-item"><span class="list-item-label">a.</span> <span class="subsection-content">the Hourly Deferred Equity Rate is recorded, stored, and maintained electronically on the Track My Startup ("TMS") platform; and</span></p>
    <p class="list-item"><span class="list-item-label">b.</span> <span class="subsection-content">the Hourly Deferred Equity Rate recorded on the TMS platform shall be binding, conclusive, and deemed incorporated by reference into this Agreement.</span></p>
    
    <p class="subsection"><span class="subsection-label">2.3 Accrual of Deferred Equity Value</span></p>
    <p>Deferred equity value shall accrue based on:</p>
    <p class="list-item"><span class="list-item-label">a.</span> <span class="subsection-content">mentoring hours delivered by the Mentor and accepted by the Startup; and</span></p>
    <p class="list-item"><span class="list-item-label">b.</span> <span class="subsection-content">the applicable Hourly Deferred Equity Rate as recorded on the TMS platform,</span></p>
    <p>as automatically calculated and reflected in the platform records.</p>
    
    <p class="subsection"><span class="subsection-label">2.4 Accrual Confirmation & Finality</span></p>
    <p>Mentoring hours and accrued deferred equity value, once confirmed or not disputed by the Startup through the TMS platform within seven (7) days, shall be deemed final and irrevocable for accrual purposes.</p>
    
    <p class="subsection"><span class="subsection-label">2.5 Modification of Hourly Rate</span></p>
    <p>Any modification to the Hourly Deferred Equity Rate shall:</p>
    <p class="list-item"><span class="list-item-label">a.</span> <span class="subsection-content">require mutual agreement between the Startup and the Mentor;</span></p>
    <p class="list-item"><span class="list-item-label">b.</span> <span class="subsection-content">be recorded through the TMS platform; and</span></p>
    <p class="list-item"><span class="list-item-label">c.</span> <span class="subsection-content">apply prospectively only, without affecting equity value already accrued.</span></p>
    
    <p class="subsection"><span class="subsection-label">2.6 Nature of Accrued Value</span></p>
    <p>Accrued deferred equity value represents a contractual entitlement only and does not constitute immediate ownership, issuance, or allotment of equity shares.</p>
  </div>
  
  <div class="section">
    <h2>3. Deferred Issuance of Equity</h2>
    <p class="subsection"><span class="subsection-label">3.1</span> <span class="subsection-content">The Startup shall not be required to issue equity at the time mentoring services are rendered.</span></p>
    <p class="subsection"><span class="subsection-label">3.2</span> <span class="subsection-content">Equity shall be issued or settled only upon the occurrence of a Settlement Trigger Event or upon the Long-Stop Date, in accordance with this Agreement.</span></p>
  </div>
  
  <div class="section">
    <h2>4. Settlement Trigger Events</h2>
    <p>Any of the following shall constitute a Settlement Trigger Event:</p>
    <p class="list-item"><span class="list-item-label">a.</span> <span class="subsection-content">Merger, acquisition, or sale of substantially all assets of the Startup</span></p>
    <p class="list-item"><span class="list-item-label">b.</span> <span class="subsection-content">Secondary sale of shares</span></p>
    <p class="list-item"><span class="list-item-label">c.</span> <span class="subsection-content">Founder- or company-initiated buyback</span></p>
    <p class="list-item"><span class="list-item-label">d.</span> <span class="subsection-content">Investor-led liquidity event</span></p>
    <p class="list-item"><span class="list-item-label">e.</span> <span class="subsection-content">Mandatory settlement upon the Long-Stop Date</span></p>
  </div>
  
  <div class="section">
    <h2>5. Equity Valuation & Pricing Mechanism</h2>
    <p>At the time of settlement, the price per share applicable to the Mentor's accrued equity entitlement shall be determined as follows:</p>
    <p class="subsection"><span class="subsection-label">5.1 Last Priced Equity Round</span></p>
    <p>The price per share of the most recent bona fide equity financing round completed prior to the date of issuance.</p>
    <p class="subsection"><span class="subsection-label">5.2 Discounted Next Equity Round</span></p>
    <p>If the Startup completes an equity financing round within twelve (12) months from the date the issuance obligation arises, equity shall be issued at a twenty percent (20%) discount to the price per share of such round.</p>
    <p class="subsection"><span class="subsection-label">5.3 Fallback Fixed Price</span></p>
    <p>If no equity financing round occurs within twelve (12) months, equity shall be issued at a fixed price per share of <strong>${currencySymbol}${pricePerShare?.toLocaleString() || 'N/A'}</strong>, as declared by the Startup in its portfolio information maintained with TMS as of the Effective Date.</p>
    <p class="subsection"><span class="subsection-label">5.4 Priority Rule</span></p>
    <p>Settlement shall occur under whichever of the above methods results in issuance first, and no re-pricing shall apply thereafter.</p>
  </div>
  
  <div class="section">
    <h2>6. Long-Stop Date (Mandatory Settlement)</h2>
    <p class="subsection"><span class="subsection-label">6.1</span> <span class="subsection-content">If no Settlement Trigger Event occurs within twenty-four (24) months from the date the relevant equity value is first accrued, the Startup shall mandatorily settle the accrued amount.</span></p>
    <p class="subsection"><span class="subsection-label">6.2</span> <span class="subsection-content">Settlement under the Long-Stop Date may occur, at the Startup's discretion, through:</span></p>
    <p class="list-item"><span class="list-item-label">a.</span> <span class="subsection-content">issuance of equity, or</span></p>
    <p class="list-item"><span class="list-item-label">b.</span> <span class="subsection-content">cash settlement at the applicable valuation under Section 5.</span></p>
  </div>
  
  <div class="section">
    <h2>7. Cash Settlement Option</h2>
    <p class="subsection"><span class="subsection-label">7.1</span> <span class="subsection-content">The Startup may elect to cash-settle the Mentor's accrued equity entitlement at any Settlement Trigger Event or upon the Long-Stop Date.</span></p>
    <p class="subsection"><span class="subsection-label">7.2</span> <span class="subsection-content">Cash settlement value shall be equivalent to the value of shares calculated under Section 5.</span></p>
  </div>
  
  <div class="section">
    <h2>8. Settlement Routing & Facilitation Fees (Track My Startup)</h2>
    <p class="subsection"><span class="subsection-label">8.1 Cash / Sale Settlement Routing</span></p>
    <p>In the event of any cash settlement, equity sale, secondary transaction, or buyback resulting in monetary consideration to the Mentor, the Parties agree that the gross proceeds shall be transferred to the bank account designated by TMS.</p>
    <p>TMS shall deduct a facilitation fee equal to twenty percent (20%) and transfer the remaining eighty percent (80%) to the Mentor.</p>
    <p class="subsection"><span class="subsection-label">8.2 Equity Issuance with Mandatory Buyback</span></p>
    <p>Where settlement occurs through issuance of equity shares to the Mentor:</p>
    <p class="list-item"><span class="list-item-label">a.</span> <span class="subsection-content">The total number of shares due shall be calculated at the applicable settlement price;</span></p>
    <p class="list-item"><span class="list-item-label">b.</span> <span class="subsection-content">Twenty percent (20%) of such shares shall be compulsorily bought back by the Startup;</span></p>
    <p class="list-item"><span class="list-item-label">c.</span> <span class="subsection-content">The buyback consideration shall be paid directly to TMS as facilitation fees prior to issuance; and</span></p>
    <p class="list-item"><span class="list-item-label">d.</span> <span class="subsection-content">The remaining eighty percent (80%) of shares shall be issued directly to the Mentor.</span></p>
    <p class="subsection"><span class="subsection-label">8.3 Authorization and Discharge</span></p>
    <p>Payment or transfer made to TMS in accordance with this Agreement shall constitute a valid and complete discharge of the Startup's obligations to the Mentor to the extent of such payment or transfer.</p>
    <p>The Mentor hereby irrevocably authorizes such routing and fee deduction.</p>
  </div>
  
  <div class="section">
    <h2>9. Records & Accrual Statements</h2>
    <p class="subsection"><span class="subsection-label">9.1</span> <span class="subsection-content">TMS shall maintain records of mentoring hours, accrued equity value, and cumulative entitlement.</span></p>
    <p class="subsection"><span class="subsection-label">9.2</span> <span class="subsection-content">Accrual statements are informational only and do not constitute separate contracts.</span></p>
  </div>
  
  <div class="section">
    <h2>10. Confidentiality & Conflict Disclosure</h2>
    <p class="subsection"><span class="subsection-label">10.1</span> <span class="subsection-content">The Mentor shall maintain confidentiality of Startup and platform information.</span></p>
    <p class="subsection"><span class="subsection-label">10.2</span> <span class="subsection-content">The Mentor may advise other startups, provided conflicts are disclosed and confidential information is not misused.</span></p>
  </div>
  
  <div class="section">
    <h2>11. Limitation of Role & Liability (Track My Startup)</h2>
    <p>TMS acts solely as a facilitation and settlement platform and shall not be deemed a trustee, fiduciary, shareholder, employer, or investment advisor.</p>
    <p>TMS shall not be liable for valuation outcomes, dilution, startup performance, regulatory compliance, or tax consequences.</p>
  </div>
  
  <div class="section">
    <h2>12. Risk & Tax Acknowledgement</h2>
    <p class="subsection"><span class="subsection-label">12.1</span> <span class="subsection-content">The Mentor acknowledges that equity-based compensation involves risk, including dilution and loss of value.</span></p>
    <p class="subsection"><span class="subsection-label">12.2</span> <span class="subsection-content">Any tax liability arising from settlement or issuance of equity shall be the sole responsibility of the Mentor.</span></p>
  </div>
  
  <div class="section">
    <h2>13. Electronic Execution</h2>
    <p>This Agreement may be executed electronically. Electronic or digital signatures shall have the same legal effect as wet-ink signatures.</p>
  </div>
  
  <div class="section">
    <h2>14. Governing Law & Jurisdiction</h2>
    <p>This Agreement shall be governed by the laws of India.</p>
    <p>Courts at Pune, Maharashtra shall have exclusive jurisdiction.</p>
  </div>
  
  <div class="section">
    <h2>15. Entire Agreement</h2>
    <p>This Agreement constitutes the entire understanding between the Parties and supersedes all prior discussions.</p>
  </div>
  
  <div class="signature-section">
    <h2>SIGNATURES</h2>
    
    <div class="signature-block">
      <h3>For the Startup</h3>
      <p>Name: ${startupName}</p>
      <p>Signature: [Digital Signature uploaded]</p>
      <p>Date: [Date of Execution]</p>
    </div>
    
    <div class="signature-block">
      <h3>For the Mentor</h3>
      <p>Name: ${mentorName}</p>
      <p>Signature: [Digital Signature uploaded]</p>
      <p>Date: [Date of Execution]</p>
    </div>
  </div>
</body>
</html>
  `;

  // Convert HTML to Word document format
  // Since we can't use docx library, we'll create a simple HTML file that can be opened in Word
  // Or we can use a different approach - create a downloadable HTML file that Word can open
  
  // Create blob with HTML content that Word can open
  // Using application/msword MIME type so it opens in Word
  const blob = new Blob([htmlContent], { 
    type: 'application/msword' 
  });
  
  return blob;
}

/**
 * Download the generated agreement
 */
export function downloadAgreement(blob: Blob, filename: string = 'ESOP_Agreement.doc') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
