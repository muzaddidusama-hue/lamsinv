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
  
  const padUrl = type === 'Bill' 
    ? 'https://iahytcrmstlkvnmwfxgs.supabase.co/storage/v1/object/public/product%20image/Bill-Blank-Pad.jpg'
    : 'https://iahytcrmstlkvnmwfxgs.supabase.co/storage/v1/object/public/product%20image/Challan-Blank-Pad.jpg';

  // ১. একটি অফ-স্ক্রিন কন্টেইনার তৈরি করা যা আমরা স্ক্রিনশট নেব
  const exportContainer = document.createElement('div');
  exportContainer.style.width = '794px'; // A4 Width in px
  exportContainer.style.height = '1122px'; // A4 Height in px
  exportContainer.style.position = 'absolute';
  exportContainer.style.top = '0';
  exportContainer.style.left = '-9999px';
  exportContainer.style.zIndex = '-9999';
  exportContainer.style.opacity = '1';
  exportContainer.style.pointerEvents = 'none';
  exportContainer.style.boxSizing = 'border-box';
  
  const paddingTop = type === 'Bill' ? '270px' : '285px';

  exportContainer.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
      .pdf-page {
        width: 794px;
        height: 1122px;
        background-image: url('${padUrl}');
        background-size: 100% 100%;
        background-repeat: no-repeat;
        padding: ${paddingTop} 60px 90px 60px;
        box-sizing: border-box;
        font-family: 'Inter', sans-serif;
        position: relative;
        background-color: #fff;
      }
      .paid-stamp {
        position: absolute;
        top: 450px;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-15deg);
        font-size: 80px;
        font-weight: 900;
        color: rgba(22, 163, 74, 0.12);
        text-transform: uppercase;
        letter-spacing: 5px;
        border: 8px solid rgba(22, 163, 74, 0.12);
        padding: 10px 40px;
        border-radius: 15px;
        pointer-events: none;
        z-index: 0;
      }
      .bill-badge {
        position: absolute;
        top: 215px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #ea580c;
        color: #fff;
        padding: 6px 60px;
        font-size: 20px;
        font-weight: 900;
        letter-spacing: 4px;
        border-radius: 50px;
        box-shadow: 0 0 0 8px #fff;
        z-index: 100;
      }
      .info-section {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
        font-size: 13px;
        line-height: 1.5;
        color: #000;
      }
      .table-wrapper {
        width: 100%;
        min-height: 480px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        border: 1.5px solid #000;
      }
      th {
        background-color: #f2f2f2 !important;
        border: 1.5px solid #000;
        padding: 8px 6px;
        font-size: 11px;
        text-transform: uppercase;
        font-weight: 900;
        color: #000;
      }
      td {
        border-left: 1.5px solid #000;
        border-right: 1.5px solid #000;
        padding: 6px 8px;
        font-size: 12px;
        font-weight: 700;
        color: #000;
        vertical-align: middle;
      }
      .row-item {
        border-bottom: 1px solid #eee;
      }
      .col-sl { width: 40px; text-align: center; }
      .col-desc { text-align: left; }
      .col-qty { width: 60px; text-align: center; }
      .col-price { width: 90px; text-align: right; }
      .col-total { width: 100px; text-align: right; }
      .total-row td {
        border: 1.5px solid #000;
        background-color: #f9f9f9 !important;
        font-weight: 900;
        font-size: 14px;
        padding: 8px;
        color: #000;
      }
      .words-section {
        margin-top: 15px;
        background-color: #fef08a;
        border: 1px solid #eab308;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 700;
        color: #000;
      }
    </style>
    <div class="pdf-page">
      ${type === 'Bill' ? '<div class="paid-stamp">PAID</div><div class="bill-badge">BILL</div>' : ''}
      <div class="info-section">
        <div class="info-left">
          <div><b>${type} No:</b> ${chalan.bill_no || chalan.chalan_no}</div>
          <div><b>Name:</b> ${customer.name}</div>
          <div><b>Mobile:</b> ${customer.phone || 'N/A'}</div>
        </div>
        <div class="info-right" style="text-align: right;">
          <div><b>Date:</b> ${date}</div>
          <div style="max-width: 250px;"><b>Address:</b> ${customer.address || 'N/A'}</div>
        </div>
      </div>
      
      <div class="table-wrapper">
        <table>
          <thead>
            ${type === 'Bill'
              ? '<tr><th class="col-sl">SL No.</th><th class="col-desc">Item Description</th><th class="col-qty">Unit</th><th class="col-price">Unit Price</th><th class="col-total">Total Price</th></tr>'
              : '<tr><th class="col-sl">No.</th><th class="col-desc">Description of Goods</th><th class="col-qty" style="width: 100px">Quantity (pcs)</th><th style="width: 120px">Remarks</th></tr>'
            }
          </thead>
          <tbody>
            ${items.map((item, index) => {
              const cat = item.products?.category || item.category || '';
              const cleanCat = cat.toLowerCase() === 'manual' ? '' : cat;
              const model = item.products?.model || item.model || '';
              const cleanModel = model.toUpperCase() === 'N/A' ? '' : model;
              const brand = item.products?.name || item.name || '';
              const desc = `${cleanCat} ${cleanModel} ${brand}`.replace(/\s+/g, ' ').trim();
              
              if (type === 'Bill') {
                return `<tr class="row-item"><td class="col-sl">${index + 1}</td><td class="col-desc">${desc}</td><td class="col-qty">${item.quantity || item.qty}</td><td class="col-price">${item.unit_price}</td><td class="col-total">${item.total_price}</td></tr>`;
              } else {
                return `<tr class="row-item"><td class="col-sl">${index + 1}</td><td class="col-desc">${desc}</td><td class="col-qty" style="text-align: center">${item.quantity || item.qty}</td><td></td></tr>`;
              }
            }).join('')}
            
            ${Array(Math.max(0, 15 - items.length)).fill(0).map(() => {
              if (type === 'Bill') {
                return `<tr style="height: 24px;"><td class="col-sl"></td><td class="col-desc"></td><td class="col-qty"></td><td class="col-price"></td><td class="col-total"></td></tr>`;
              } else {
                return `<tr style="height: 24px;"><td class="col-sl"></td><td class="col-desc"></td><td class="col-qty"></td><td></td></tr>`;
              }
            }).join('')}

            ${type === 'Bill'
              ? `<tr class="total-row"><td colspan="4" style="text-align: right; padding-right: 20px;">Total =</td><td class="col-total">${chalan.total_amount}</td></tr>`
              : `<tr class="total-row"><td colspan="2" style="text-align: right; padding-right: 20px;">TOTAL -</td><td style="text-align: center">${totalQty}</td><td></td></tr>`
            }
          </tbody>
        </table>
        ${type === 'Bill' ? `<div class="words-section"><b>Taka In Words:</b> ${amountInWords}</div>` : ''}
      </div>
    </div>
  `;

  document.body.appendChild(exportContainer);

  try {
    // ২. ফন্ট ও ব্যাকগ্রাউন্ড ইমেজ রেন্ডার হওয়ার জন্য ৩০০ মিলি-সেকেন্ড অপেক্ষা
    await new Promise(resolve => setTimeout(resolve, 300));

    // ৩. কন্টেন্টকে হাই-কোয়ালিটি ইমেজে কনভার্ট করা
    const canvas = await html2canvas(exportContainer, {
      scale: 3, // high DPI
      backgroundColor: null,
      useCORS: true,
      logging: false
    });
    const contentImage = canvas.toDataURL('image/png');
    document.body.removeChild(exportContainer);

    // ৪. A4 সাইজের PDF তৈরি এবং পুরো পেজের ইমেজ বসানো
    const pdf = new jsPDF('p', 'px', [794, 1122]);
    pdf.addImage(contentImage, 'PNG', 0, 0, 794, 1122);

    pdf.save(`${type}_${chalan.bill_no || chalan.chalan_no}.pdf`);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    alert("Error generating PDF. Please try again.");
    if (exportContainer.parentNode) {
      document.body.removeChild(exportContainer);
    }
  }
};