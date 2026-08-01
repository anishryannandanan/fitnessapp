import { Injectable } from '@nestjs/common';

/**
 * PDF generation service using PDFKit.
 * Generates invoices, receipts, and diet plan PDFs as binary buffers.
 */
@Injectable()
export class PdfService {
  /**
   * Generate an invoice/receipt PDF.
   */
  async generateInvoiceReceipt(data: {
    invoiceNumber: string;
    businessName: string;
    branchName: string;
    branchAddress?: string;
    memberName: string;
    memberCode: string;
    packageName?: string;
    items: { description: string; amount: number }[];
    subtotal: number;
    tax: number;
    total: number;
    amountPaid: number;
    payments: { date: string; method: string; amount: number; reference?: string }[];
    issuedAt: string;
  }): Promise<Buffer> {
    // Lazy-import PDFKit to avoid issues when the package isn't installed
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).fillColor('#16A34A').text('FitCore', { align: 'center' });
      doc.fontSize(10).fillColor('#666').text(data.businessName, { align: 'center' });
      doc.text(`${data.branchName}${data.branchAddress ? ` — ${data.branchAddress}` : ''}`, { align: 'center' });
      doc.moveDown(2);

      // Invoice title
      doc.fontSize(16).fillColor('#000').text(`INVOICE / RECEIPT`, { align: 'center' });
      doc.moveDown();

      // Details
      doc.fontSize(10).fillColor('#333');
      doc.text(`Invoice #: ${data.invoiceNumber}`);
      doc.text(`Date: ${data.issuedAt}`);
      doc.text(`Member: ${data.memberName} (${data.memberCode})`);
      if (data.packageName) doc.text(`Package: ${data.packageName}`);
      doc.moveDown(1.5);

      // Items table header
      doc.fontSize(9).fillColor('#666');
      const tableTop = doc.y;
      doc.text('Description', 50, tableTop, { width: 300 });
      doc.text('Amount (Rs.)', 400, tableTop, { width: 100, align: 'right' });
      doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).strokeColor('#ccc').stroke();
      doc.moveDown(0.8);

      // Items
      doc.fontSize(10).fillColor('#000');
      for (const item of data.items) {
        doc.text(item.description, 50, doc.y, { width: 300 });
        doc.text((item.amount / 100).toFixed(2), 400, doc.y - 12, { width: 100, align: 'right' });
        doc.moveDown(0.5);
      }
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
      doc.moveDown(0.8);

      // Totals
      doc.fontSize(10);
      doc.text(`Subtotal:`, 350, doc.y, { width: 100 });
      doc.text(`Rs. ${(data.subtotal / 100).toFixed(2)}`, 450, doc.y - 12, { width: 95, align: 'right' });
      doc.moveDown(0.3);
      doc.text(`Tax:`, 350, doc.y, { width: 100 });
      doc.text(`Rs. ${(data.tax / 100).toFixed(2)}`, 450, doc.y - 12, { width: 95, align: 'right' });
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text(`Total:`, 350, doc.y, { width: 100 });
      doc.text(`Rs. ${(data.total / 100).toFixed(2)}`, 450, doc.y - 12, { width: 95, align: 'right' });
      doc.moveDown(0.3);
      doc.fillColor('#16A34A');
      doc.text(`Paid:`, 350, doc.y, { width: 100 });
      doc.text(`Rs. ${(data.amountPaid / 100).toFixed(2)}`, 450, doc.y - 12, { width: 95, align: 'right' });
      doc.moveDown(0.5);
      doc.font('Helvetica').fillColor('#333');
      const balance = data.total - data.amountPaid;
      doc.text(`Balance Due: Rs. ${(balance / 100).toFixed(2)}`, 350, doc.y, { width: 195, align: 'right' });
      doc.moveDown(2);

      // Payment history
      if (data.payments.length > 0) {
        doc.fontSize(11).font('Helvetica-Bold').text('Payment History');
        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica').fillColor('#666');
        for (const p of data.payments) {
          doc.text(`${p.date} — ${p.method} — Rs. ${(p.amount / 100).toFixed(2)}${p.reference ? ` (Ref: ${p.reference})` : ''}`, 50);
        }
      }

      // Footer
      doc.moveDown(3);
      doc.fontSize(8).fillColor('#999').text('This is a computer-generated document. No signature required.', { align: 'center' });
      doc.text('Thank you for being a FitCore member!', { align: 'center' });

      doc.end();
    });
  }

  /**
   * Generate a diet plan PDF.
   */
  async generateDietPlanPdf(data: {
    memberName: string;
    planName: string;
    trainerName: string;
    dailyCalories?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    waterGoalMl?: number;
    meals: {
      mealType: string;
      title: string;
      calories?: number;
      proteinG?: number;
      carbsG?: number;
      fatG?: number;
    }[];
    createdAt: string;
  }): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).fillColor('#16A34A').text('FitCore', { align: 'center' });
      doc.fontSize(12).fillColor('#333').text('Diet & Nutrition Plan', { align: 'center' });
      doc.moveDown(2);

      // Plan details
      doc.fontSize(14).fillColor('#000').text(data.planName);
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666');
      doc.text(`Prepared for: ${data.memberName}`);
      doc.text(`By: ${data.trainerName}`);
      doc.text(`Date: ${data.createdAt}`);
      doc.moveDown(1.5);

      // Daily macro targets
      doc.fontSize(12).fillColor('#000').text('Daily Macro Targets');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#333');
      const macros = [
        data.dailyCalories ? `Calories: ${data.dailyCalories} kcal` : null,
        data.proteinG ? `Protein: ${data.proteinG}g` : null,
        data.carbsG ? `Carbs: ${data.carbsG}g` : null,
        data.fatG ? `Fat: ${data.fatG}g` : null,
        data.waterGoalMl ? `Water: ${data.waterGoalMl}ml` : null,
      ].filter(Boolean);
      doc.text(macros.join('  |  '));
      doc.moveDown(1.5);

      // Meals
      doc.fontSize(12).fillColor('#000').text('Meal Schedule');
      doc.moveDown(0.8);

      const mealOrder = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack'];
      const sortedMeals = [...data.meals].sort(
        (a, b) => mealOrder.indexOf(a.mealType) - mealOrder.indexOf(b.mealType),
      );

      for (const meal of sortedMeals) {
        const mealLabel = meal.mealType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        doc.fontSize(11).fillColor('#16A34A').text(mealLabel);
        doc.fontSize(10).fillColor('#000').text(meal.title);
        const macroLine = [
          meal.calories ? `${meal.calories} kcal` : null,
          meal.proteinG ? `P: ${meal.proteinG}g` : null,
          meal.carbsG ? `C: ${meal.carbsG}g` : null,
          meal.fatG ? `F: ${meal.fatG}g` : null,
        ].filter(Boolean).join(' | ');
        if (macroLine) {
          doc.fontSize(9).fillColor('#666').text(macroLine);
        }
        doc.moveDown(0.8);
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#999').text('Generated by FitCore Gym Management Platform', { align: 'center' });
      doc.text('Follow this plan consistently for best results!', { align: 'center' });

      doc.end();
    });
  }
}
