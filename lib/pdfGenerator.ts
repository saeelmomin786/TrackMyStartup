/**
 * PDF Generation Utility
 * 
 * This utility provides functions to generate PDF reports for investor data
 * using jsPDF library for client-side PDF generation.
 */

// Import jsPDF dynamically to avoid SSR issues
import { jsPDF } from 'jspdf';

// Dynamically import jsPDF
const loadJsPDF = async () => {
  return jsPDF;
};

export interface InvestorReportData {
  investorName: string;
  investmentAmount: string;
  equityAllocated: string;
  utilized: string;
  remainingFunds: string;
  investmentDate: string;
}

export interface IndividualInvestorReportData {
  date: string;
  description: string;
  amount: string;
  fundingSource: string;
  invoiceLink: string;
}

export interface PDFReportOptions {
  title: string;
  subtitle?: string;
  companyName: string;
  generatedDate: string;
  currency: string;
  investmentAmount?: string;
  equityAllocated?: string;
  utilizedAmount?: string;
}

/**
 * Generate a PDF report for all investors
 */
export async function generateInvestorListPDF(
  reportData: InvestorReportData[],
  options: PDFReportOptions
): Promise<Blob> {
  const PDF = await loadJsPDF();
  const doc = new PDF('p', 'mm', 'a4');
  
  // Set up the document
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Add header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title, margin, 30);
  
  if (options.subtitle) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(options.subtitle, margin, 40);
  }
  
  // Add company info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Company: ${options.companyName}`, margin, 55);
  doc.text(`Generated: ${options.generatedDate}`, margin, 65);
  doc.text(`Currency: ${options.currency}`, margin, 75);
  
  // Add line separator
  doc.setLineWidth(0.5);
  doc.line(margin, 85, pageWidth - margin, 85);
  
  // Add table headers
  const tableTop = 95;
  const colWidths = [40, 35, 25, 25, 25, 30]; // Adjusted for A4
  const headers = ['Investor', `Amount (${options.currency})`, 'Equity %', `Utilized (${options.currency})`, `Remaining (${options.currency})`, 'Date'];
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  let xPos = margin;
  headers.forEach((header, index) => {
    doc.text(header, xPos, tableTop);
    xPos += colWidths[index];
  });
  
  // Add table rows
  doc.setFont('helvetica', 'normal');
  let yPos = tableTop + 10;
  
  reportData.forEach((row, index) => {
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 30;
      
      // Redraw headers on new page
      doc.setFont('helvetica', 'bold');
      xPos = margin;
      headers.forEach((header, headerIndex) => {
        doc.text(header, xPos, yPos);
        xPos += colWidths[headerIndex];
      });
      yPos += 10;
      doc.setFont('helvetica', 'normal');
    }
    
    xPos = margin;
    const rowData = [
      row.investorName,
      row.investmentAmount,
      row.equityAllocated,
      row.utilized,
      row.remainingFunds,
      row.investmentDate
    ];
    
    rowData.forEach((cell, cellIndex) => {
      // Truncate long text to fit column
      const maxLength = Math.floor(colWidths[cellIndex] / 2);
      const displayText = cell.length > maxLength ? cell.substring(0, maxLength - 3) + '...' : cell;
      doc.text(displayText, xPos, yPos);
      xPos += colWidths[cellIndex];
    });
    
    yPos += 8;
  });
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, doc.internal.pageSize.getHeight() - 10);
  }
  
  return doc.output('blob');
}

/**
 * Generate a PDF report for individual investor
 */
export async function generateIndividualInvestorPDF(
  investorName: string,
  reportData: IndividualInvestorReportData[],
  options: PDFReportOptions
): Promise<Blob> {
  const PDF = await loadJsPDF();
  const doc = new PDF('p', 'mm', 'a4');
  
  // Set up the document
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Add header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`${options.title} - ${investorName}`, margin, 30);
  
  if (options.subtitle) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(options.subtitle, margin, 40);
  }
  
  // Add company info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Company: ${options.companyName}`, margin, 55);
  doc.text(`Investor: ${investorName}`, margin, 65);
  doc.text(`Generated: ${options.generatedDate}`, margin, 75);
  doc.text(`Currency: ${options.currency}`, margin, 85);
  
  // Add investment summary if provided
  let tableTop: number;
  if (options.investmentAmount || options.equityAllocated || options.utilizedAmount) {
    doc.text(`Investment Amount: ${options.investmentAmount || 'N/A'} ${options.currency}`, margin, 95);
    doc.text(`Equity Allocated: ${options.equityAllocated || 'N/A'}`, margin, 105);
    doc.text(`Utilized Amount: ${options.utilizedAmount || 'N/A'} ${options.currency}`, margin, 115);
    
    // Add line separator
    doc.setLineWidth(0.5);
    doc.line(margin, 125, pageWidth - margin, 125);
    
    tableTop = 145;
  } else {
    // Add line separator
    doc.setLineWidth(0.5);
    doc.line(margin, 95, pageWidth - margin, 95);
    
    tableTop = 105;
  }
  
  // Add table headers
  const colWidths = [25, 50, 25, 30, 40]; // Adjusted for A4
  const headers = ['Date', 'Description', `Amount (${options.currency})`, 'Source', 'Invoice Link'];
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  let xPos = margin;
  headers.forEach((header, index) => {
    doc.text(header, xPos, tableTop);
    xPos += colWidths[index];
  });
  
  // Add table rows
  doc.setFont('helvetica', 'normal');
  let yPos = tableTop + 10;
  
  reportData.forEach((row, index) => {
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 30;
      
      // Redraw headers on new page
      doc.setFont('helvetica', 'bold');
      xPos = margin;
      headers.forEach((header, headerIndex) => {
        doc.text(header, xPos, yPos);
        xPos += colWidths[headerIndex];
      });
      yPos += 10;
      doc.setFont('helvetica', 'normal');
    }
    
    xPos = margin;
    const rowData = [
      row.date,
      row.description,
      row.amount,
      row.fundingSource,
      row.invoiceLink
    ];
    
    rowData.forEach((cell, cellIndex) => {
      // Special handling for invoice link column (last column)
      if (cellIndex === 4 && cell !== 'No invoice attached' && cell.startsWith('http')) {
        // Create clickable link for invoice
        const linkText = 'View Invoice';
        const maxLength = Math.floor(colWidths[cellIndex] / 2);
        const displayText = linkText.length > maxLength ? linkText.substring(0, maxLength - 3) + '...' : linkText;
        
        // Add clickable link
        doc.setTextColor(0, 0, 255); // Blue color for links
        doc.textWithLink(displayText, xPos, yPos, { url: cell });
        doc.setTextColor(0, 0, 0); // Reset to black
      } else {
        // Regular text handling
        const maxLength = Math.floor(colWidths[cellIndex] / 2);
        const displayText = cell.length > maxLength ? cell.substring(0, maxLength - 3) + '...' : cell;
        doc.text(displayText, xPos, yPos);
      }
      xPos += colWidths[cellIndex];
    });
    
    yPos += 8;
  });
  
  // Add summary section
  yPos += 20;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const totalTransactions = reportData.length;
  const totalAmount = reportData.reduce((sum, row) => {
    const amount = parseFloat(row.amount.replace(/[^0-9.-]/g, '')) || 0;
    return sum + amount;
  }, 0);
  
  doc.text(`Total Transactions: ${totalTransactions}`, margin, yPos);
  yPos += 8;
  doc.text(`Total Amount: ${totalAmount.toLocaleString()} ${options.currency}`, margin, yPos);
  
  // If no transactions found, add a note
  if (totalTransactions === 0) {
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Note: No detailed expense transactions found for this investor.', margin, yPos);
    yPos += 8;
    doc.text('This may indicate that funds were utilized through other means', margin, yPos);
    yPos += 8;
    doc.text('or that expense records are not properly linked to this funding source.', margin, yPos);
  }
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, doc.internal.pageSize.getHeight() - 10);
  }
  
  return doc.output('blob');
}

/**
 * Invoice data interface
 */
export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  paymentDate: string;
  customerName: string;
  customerEmail?: string;
  billingAddress?: string;
  startupName?: string; // Add startup name
  amount: number;
  currency: string;
  taxAmount?: number;
  totalAmount: number;
  planName: string;
  planTier: string;
  billingPeriod?: string;
  paymentGateway: 'razorpay' | 'paypal';
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  transactionId: string;
  status: string;
  country?: string;
}

/**
 * Generate an invoice PDF
 */
export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Blob> {
  const PDF = await loadJsPDF();
  const doc = new PDF('p', 'mm', 'a4');
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 30;

  // Header - Company Info
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Track My Startup', margin, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Invoice', margin, yPos);
  
  yPos += 15;
  
  // Invoice Details (Right side)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - margin - 40, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${invoiceData.invoiceNumber}`, pageWidth - margin - 40, yPos);
  
  yPos += 6;
  doc.text(`Date: ${invoiceData.invoiceDate}`, pageWidth - margin - 40, yPos);
  
  yPos += 6;
  doc.text(`Status: ${invoiceData.status.toUpperCase()}`, pageWidth - margin - 40, yPos);
  
  yPos = 60;
  
  // Bill To Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', margin, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceData.customerName, margin, yPos);
  
  // Add startup name if available
  if (invoiceData.startupName) {
    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text(invoiceData.startupName, margin, yPos);
    doc.setFont('helvetica', 'normal');
  }
  
  if (invoiceData.customerEmail) {
    yPos += 6;
    doc.text(invoiceData.customerEmail, margin, yPos);
  }
  
  if (invoiceData.billingAddress) {
    yPos += 6;
    const addressLines = invoiceData.billingAddress.split('\n');
    addressLines.forEach(line => {
      doc.text(line, margin, yPos);
      yPos += 6;
    });
  }
  
  yPos += 15;
  
  // Line separator
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;
  
  // Service Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Service Details', margin, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Plan Name
  doc.setFont('helvetica', 'bold');
  doc.text('Plan:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invoiceData.planName} (${invoiceData.planTier})`, margin + 25, yPos);
  
  yPos += 8;
  if (invoiceData.billingPeriod) {
    doc.setFont('helvetica', 'bold');
    doc.text('Billing Period:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceData.billingPeriod, margin + 40, yPos);
    yPos += 8;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Gateway:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceData.paymentGateway === 'paypal' ? 'PayPal' : 'Razorpay', margin + 40, yPos);
  
  yPos += 8;
  if (invoiceData.gatewayPaymentId) {
    doc.setFont('helvetica', 'bold');
    doc.text('Payment ID:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceData.gatewayPaymentId, margin + 30, yPos);
    yPos += 8;
  }
  
  if (invoiceData.gatewayOrderId) {
    doc.setFont('helvetica', 'bold');
    doc.text('Order ID:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceData.gatewayOrderId, margin + 30, yPos);
    yPos += 8;
  }
  
  yPos += 10;
  
  // Line separator
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;
  
  // Amount Breakdown
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount Breakdown', margin, yPos);
  
  yPos += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Subtotal
  doc.text('Subtotal:', pageWidth - margin - 60, yPos);
  doc.text(`${invoiceData.amount.toFixed(2)} ${invoiceData.currency}`, pageWidth - margin, yPos, { align: 'right' });
  
  if (invoiceData.taxAmount && invoiceData.taxAmount > 0) {
    yPos += 8;
    doc.text('Tax:', pageWidth - margin - 60, yPos);
    doc.text(`${invoiceData.taxAmount.toFixed(2)} ${invoiceData.currency}`, pageWidth - margin, yPos, { align: 'right' });
  }
  
  yPos += 10;
  doc.setLineWidth(0.5);
  doc.line(pageWidth - margin - 60, yPos, pageWidth - margin, yPos);
  
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', pageWidth - margin - 60, yPos);
  doc.text(`${invoiceData.totalAmount.toFixed(2)} ${invoiceData.currency}`, pageWidth - margin, yPos, { align: 'right' });
  
  yPos += 20;
  
  // Payment Information
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Payment Date: ${invoiceData.paymentDate}`, margin, yPos);
  
  yPos += 8;
  doc.text(`Transaction ID: ${invoiceData.transactionId}`, margin, yPos);
  
  if (invoiceData.country) {
    yPos += 8;
    doc.text(`Country: ${invoiceData.country}`, margin, yPos);
  }
  
  yPos += 20;
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for your business!', margin, yPos);
  
  yPos += 6;
  doc.text('This is an auto-generated invoice. For any queries, please contact support.', margin, yPos);
  
  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, doc.internal.pageSize.getHeight() - 10);
  }
  
  return doc.output('blob');
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
