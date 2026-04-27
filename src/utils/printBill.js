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

export const printBill = (chalan, customer, items) => {
  const printWindow = window.open('', '_blank');
  const date = new Date(chalan.created_at || Date.now()).toLocaleDateString('en-GB');
  const amountInWords = numberToWords(chalan.total_amount);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bill - ${chalan.bill_no || chalan.chalan_no}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
          body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #fff; }
          .page {
            position: relative; width: 210mm; height: 297mm; 
            background-image: url('https://iahytcrmstlkvnmwfxgs.supabase.co/storage/v1/object/public/product%20image/Bill-Blank-Pad.jpg');
            background-size: 100% 100%; background-repeat: no-repeat; margin: 0 auto;
            padding: 270px 60px 90px 60px; box-sizing: border-box;
          }
          .bill-badge {
            position: absolute; top: 215px; left: 50%; transform: translateX(-50%);
            background-color: #ea580c; color: #fff; padding: 6px 60px; font-size: 20px;
            font-weight: 900; letter-spacing: 4px; border-radius: 50px; box-shadow: 0 0 0 8px #fff; z-index: 100;
          }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; line-height: 1.5; }
          .table-wrapper { width: 100%; min-height: 480px; }
          table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; }
          th { background-color: #f2f2f2 !important; border: 1.5px solid #000; padding: 8px 6px; font-size: 11px; text-transform: uppercase; font-weight: 900; }
          td { border-left: 1.5px solid #000; border-right: 1.5px solid #000; padding: 6px 8px; font-size: 12px; font-weight: 700; color: #000; vertical-align: middle; }
          .row-item { border-bottom: 1px solid #eee; }
          .col-sl { width: 40px; text-align: center; }
          .col-desc { text-align: left; }
          .col-qty { width: 60px; text-align: center; }
          .col-price { width: 90px; text-align: right; }
          .col-total { width: 100px; text-align: right; }
          .total-row td { border: 1.5px solid #000; background-color: #f9f9f9 !important; font-weight: 900; font-size: 14px; padding: 8px; }
          .words-section { margin-top: 15px; background-color: #fef08a; border: 1px solid #eab308; padding: 8px 12px; font-size: 12px; font-weight: 700; color: #000; }
          .paid-stamp { position: absolute; top: 450px; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); font-size: 80px; font-weight: 900; color: rgba(22, 163, 74, 0.12); text-transform: uppercase; letter-spacing: 5px; border: 8px solid rgba(22, 163, 74, 0.12); padding: 10px 40px; border-radius: 15px; pointer-events: none; z-index: 0; }
          @media print { @page { margin: 0; size: A4; } body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="paid-stamp">PAID</div>
          <div class="bill-badge">BILL</div>

          <div class="info-section">
            <div class="info-left">
              <div><b>Bill No:</b> ${chalan.bill_no || 'N/A'}</div>
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
                <tr><th class="col-sl">SL No.</th><th class="col-desc">Item Description</th><th class="col-qty">Unit</th><th class="col-price">Unit Price</th><th class="col-total">Total Price</th></tr>
              </thead>
              <tbody style="position: relative; z-index: 10;">
                ${items.map((item, index) => {
                  const desc = `${item.products?.category || item.category || ''} ${item.products?.model || item.model || ''} ${item.products?.name || item.name || ''}`.trim();
                  return `<tr class="row-item"><td class="col-sl">${index + 1}</td><td class="col-desc">${desc}</td><td class="col-qty">${item.quantity || item.qty}</td><td class="col-price">${item.unit_price}</td><td class="col-total">${item.total_price}</td></tr>`
                }).join('')}
                
                ${Array(Math.max(0, 15 - items.length)).fill(0).map(() => `<tr style="height: 24px;"><td class="col-sl"></td><td class="col-desc"></td><td class="col-qty"></td><td class="col-price"></td><td class="col-total"></td></tr>`).join('')}

                <tr class="total-row"><td colspan="4" style="text-align: right; padding-right: 20px;">Total =</td><td class="col-total">${chalan.total_amount}</td></tr>
              </tbody>
            </table>
            <div class="words-section"><b>Taka In Words:</b> ${amountInWords}</div>
          </div>
        </div>
        <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
};