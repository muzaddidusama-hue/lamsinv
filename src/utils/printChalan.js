export const printChallan = (chalan, customer, items) => {
  const printWindow = window.open('', '_blank');
  
  const totalQty = items.reduce((acc, item) => acc + (item.quantity || item.qty), 0);
  const date = new Date(chalan.created_at || Date.now()).toLocaleDateString('en-GB');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Challan - ${chalan.chalan_no}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
          
          body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background-color: #fff;
          }
          .page {
            position: relative;
            width: 210mm; 
            height: 297mm; 
            background-image: url('https://i.postimg.cc/rpxSKm5t/Challan-Blank.jpg');
            background-size: 100% 100%;
            background-repeat: no-repeat;
            margin: 0 auto;
            padding: 285px 60px 90px 60px; /* ১৫-২০ আইটেমের জন্য নিচ থেকে একটু জায়গা বাড়ানো হয়েছে */
            box-sizing: border-box;
          }

          .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px; /* গ্যাপ কমানো হয়েছে */
            font-size: 13px;
            line-height: 1.5;
          }
          .info-left b, .info-right b { color: #000; }

          /* ডাইনামিক টেবিল */
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
            padding: 8px 6px; /* প্যাডিং কমানো হয়েছে */
            font-size: 11px; /* ফন্ট ছোট করা হয়েছে */
            text-transform: uppercase;
            font-weight: 900;
          }
          td {
            border-left: 1.5px solid #000;
            border-right: 1.5px solid #000;
            padding: 6px 8px; /* ১৫-২০ আইটেম ধরানোর জন্য স্পেস কমানো হয়েছে */
            font-size: 12px; /* ফন্ট সাইজ ছোট করা হয়েছে */
            font-weight: 700;
            color: #000;
            vertical-align: middle;
          }
          .row-item { border-bottom: 1px solid #eee; }
          
          .col-sl { width: 40px; text-align: center; }
          .col-desc { text-align: left; }
          .col-qty { width: 100px; text-align: center; }
          .col-rem { width: 120px; }

          .total-row td {
            border: 1.5px solid #000;
            background-color: #f9f9f9 !important;
            font-weight: 900;
            font-size: 14px;
            padding: 8px;
          }

          @media print {
            @page { margin: 0; size: A4; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          
          <div class="info-section">
            <div class="info-left">
              <div><b>No:</b> ${chalan.chalan_no}</div>
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
                <tr>
                  <th class="col-sl">No.</th>
                  <th class="col-desc">Description of Goods</th>
                  <th class="col-qty">Quantity (pcs)</th>
                  <th class="col-rem">Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item, index) => {
                  // প্রোডাক্টের নাম তৈরি: Category + Model + Brand 
                  const category = item.products?.category || item.category || '';
                  const model = item.products?.model || item.model || '';
                  const brand = item.products?.name || item.name || '';
                  const finalDescription = `${category} ${model} ${brand}`.trim();

                  return `
                  <tr class="row-item">
                    <td class="col-sl">${index + 1}</td>
                    <td class="col-desc">${finalDescription}</td>
                    <td class="col-qty">${item.quantity || item.qty}</td>
                    <td class="col-rem"></td>
                  </tr>
                `}).join('')}
                
                ${Array(Math.max(0, 15 - items.length)).fill(0).map(() => `
                  <tr style="height: 24px;">
                    <td class="col-sl"></td>
                    <td class="col-desc"></td>
                    <td class="col-qty"></td>
                    <td class="col-rem"></td>
                  </tr>
                `).join('')}

                <tr class="total-row">
                  <td colspan="2" style="text-align: right; padding-right: 20px;">TOTAL -</td>
                  <td class="col-qty">${totalQty}</td>
                  <td class="col-rem"></td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
        
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};