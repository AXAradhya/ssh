import React, { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

interface Props {
    targetId: string;
    filename?: string;
}

const ReportExporter: React.FC<Props> = ({ targetId, filename = 'GridGuard_Report' }) => {
    const [isExporting, setIsExporting] = useState(false);

    const exportToPDF = async () => {
        const element = document.getElementById(targetId);
        if (!element) {
            toast.error('Could not find dashboard to export');
            return;
        }

        setIsExporting(true);
        const toastId = toast.loading('Generating PDF report...');

        try {
            // Give charts a moment to render completely if needed
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(element, {
                scale: 2, // Higher resolution
                useCORS: true,
                backgroundColor: '#050814', // Match dashboard bg
                ignoreElements: (el) => el.classList.contains('no-export')
            });

            const imgData = canvas.toDataURL('image/jpeg', 1.0);

            // A4 landscape dimensions in mm
            const pdfWidth = 297;
            const pdfHeight = 210;

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const imgProps = pdf.getImageProperties(imgData);
            const imgRatio = imgProps.width / imgProps.height;
            const pdfRatio = pdfWidth / pdfHeight;

            let finalWidth, finalHeight;

            // Fit to page
            if (imgRatio > pdfRatio) {
                finalWidth = pdfWidth;
                finalHeight = pdfWidth / imgRatio;
            } else {
                finalHeight = pdfHeight;
                finalWidth = pdfHeight * imgRatio;
            }

            // Center image
            const xOffset = (pdfWidth - finalWidth) / 2;
            const yOffset = (pdfHeight - finalHeight) / 2;

            pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);

            // Add metadata footer
            pdf.setFontSize(8);
            pdf.setTextColor(150);
            pdf.text(`GridGuard AI - Exported on ${new Date().toLocaleString()}`, 10, pdfHeight - 10);

            pdf.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);

            toast.success('Report exported successfully', { id: toastId });
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export report', { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <button
            onClick={exportToPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isExporting ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating PDF...
                </>
            ) : (
                <>
                    <FileText className="w-4 h-4" />
                    Export Report
                </>
            )}
        </button>
    );
};

export default ReportExporter;
