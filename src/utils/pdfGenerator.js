import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const numberToWords = (amount) => {
  const words = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (amount === 0) return 'Zero';
  let numStr = amount.toString();
  if (numStr.length > 9) return 'Amount too large';
  const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != 0) ? (words[Number(n[1])] || tens[n[1][0]] + ' ' + words[n[1][1]]) + ' Crore ' : '';
  str += (n[2] != 0) ? (words[Number(n[2])] || tens[n[2][0]] + ' ' + words[n[2][1]]) + ' Lakh ' : '';
  str += (n[3] != 0) ? (words[Number(n[3])] || tens[n[3][0]] + ' ' + words[n[3][1]]) + ' Thousand ' : '';
  str += (n[4] != 0) ? (words[Number(n[4])] || tens[n[4][0]] + ' ' + words[n[4][1]]) + ' Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (words[Number(n[5])] || tens[n[5][0]] + ' ' + words[n[5][1]]) : '';
  return str.trim() + ' Taka Only';
};

export const downloadPDF = async (chalan, customer, items, type = 'Bill') => {
  const date = new Date(chalan.created_at || Date.now()).toLocaleDateString('en-GB');
  const amountInWords = type === 'Bill' ? numberToWords(chalan.total_amount || 0) : '';
  const totalQty = items.reduce((acc, item) => acc + (item.quantity || item.qty || 0), 0);
  const padUrl = 'https://iahytcrmstlkvnmwfxgs.supabase.co/storage/v1/object/public/product%20image/Bill-Blank-Pad.jpg';

  // ১. একটি অফ-স্ক্রিন কন্টেইনার তৈরি করা যা আমরা স্ক্রিনশট নেব
  const exportContainer = document.createElement('div');
  exportContainer.style.width = '794px'; // A4 Width in px
  exportContainer.style.padding = '20px';
  exportContainer.style.backgroundColor = 'transparent';
  exportContainer.style.position = 'fixed';
  exportContainer.style.left = '-9999px';
  exportContainer.style.fontFamily = "'Inter', sans-serif";
  
  exportContainer.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
      .pdf-body { color: #000; width: 100%; }
      .badge { background: #ea580c; color: #fff; padding: 5px 40px; border-radius: 50px; font-weight: 900; text-align: center; width: fit-content; margin: 0 auto 20px; letter-spacing: 3px; }
      .info-grid { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 20px; line-height: 1.6; }
      table { width: 100%; border-collapse: collapse; border: 2px solid #000; }
      th { background: #f2f2f2; border: 2px solid #000; padding: 10px; font-size: 12px; font-weight: 900; }
      td { border: 2px solid #000; padding: 8px 12px; font-size: 14px; font-weight: 700; }
      .total-row { background: #f9f9f9; font-weight: 900; font-size: 16px; }
      .words { margin-top: 15px; padding: 10px; border: 1px solid #000; background: #fffde7; font-size: 13px; font-weight: 800; }
    </style>
    <div class="pdf-body">
      <div class="badge">${type.toUpperCase()}</div>
      <div class="info-grid">
        <div>
          <b>${type} No:</b> ${chalan.bill_no || chalan.chalan_no}<br>
          <b>Customer:</b> ${customer.name}<br>
          <b>Phone:</b> ${customer.phone || 'N/A'}
        </div>
        <div style="text-align: right">
          <b>Date:</b> ${date}<br>
          <b>Address:</b> ${customer.address || 'N/A'}
        </div>
      </div>
      <table>
        <thead>
          ${type === 'Bill' 
            ? '<tr><th>SL</th><th>DESCRIPTION</th><th>QTY</th><th>PRICE</th><th>TOTAL</th></tr>'
            : '<tr><th>SL</th><th>DESCRIPTION</th><th>QUANTITY</th><th>REMARKS</th></tr>'
          }
        </thead>
        <tbody>
          ${items.map((item, i) => `
            <tr>
              <td style="text-align:center">${i+1}</td>
              <td>${(item.products?.name || item.name)}</td>
              <td style="text-align:center">${item.quantity || item.qty}</td>
              ${type === 'Bill' ? `<td>${item.unit_price}</td><td>${item.total_price}</td>` : '<td></td>'}
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="2" style="text-align:right">TOTAL =</td>
            <td style="text-align:center">${totalQty}</td>
            ${type === 'Bill' ? `<td colspan="2" style="text-align:right">${chalan.total_amount} ৳</td>` : '<td></td>'}
          </tr>
        </tbody>
      </table>
      ${type === 'Bill' ? `<div class="words">IN WORDS: ${amountInWords}</div>` : ''}
    </div>
  `;

  document.body.appendChild(exportContainer);

  try {
    // ২. কন্টেন্টকে PNG ইমেজে রূপান্তর করা
    const canvas = await html2canvas(exportContainer, {
      scale: 3, // High quality
      backgroundColor: null,
      useCORS: true
    });
    const contentImage = canvas.toDataURL('image/png');
    document.body.removeChild(exportContainer);

    // ৩. PDF তৈরি এবং প্যাডের ওপর ইমেজ বসানো
    const pdf = new jsPDF('p', 'px', [794, 1122]); // A4 Size pixels
    
    // প্যাড ব্যাকগ্রাউন্ড যোগ করা
    pdf.addImage(padUrl, 'JPEG', 0, 0, 794, 1122);
    
    // জেনারেট করা PNG কন্টেন্ট নির্দিষ্ট পজিশনে বসানো
    // প্যাডের ওপরের অংশ খালি রেখে ২৬০ পিক্সেল নিচে বসানো হয়েছে
    pdf.addImage(contentImage, 'PNG', 60, 260, 674, canvas.height * (674 / canvas.width));

    pdf.save(`${type}_${chalan.bill_no || chalan.chalan_no}.pdf`);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    alert("Error generating PDF. Please try again.");
  }
};