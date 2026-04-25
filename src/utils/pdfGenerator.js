import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const downloadPDF = (docData, customer, items, type = 'Bill') => {
  const doc = new jsPDF();
  const title = type === 'Bill' ? "Sales Bill" : "Challan";
  const docNo = type === 'Bill' ? docData.bill_no : docData.chalan_no;

  // হেডার ডিজাইন
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text("LAMS POWER", 14, 22);
  
  doc.setFontSize(10);
  doc.text(`${title} No: ${docNo}`, 14, 30);
  doc.text(`Date: ${new Date(docData.created_at).toLocaleDateString()}`, 14, 35);

  // কাস্টমার ইনফো
  doc.setFontSize(12);
  doc.text("Customer Info:", 14, 50);
  doc.setFontSize(10);
  doc.text(`Name: ${customer?.name || 'Walk-in'}`, 14, 56);
  doc.text(`Phone: ${customer?.phone || 'N/A'}`, 14, 61);
  doc.text(`Address: ${customer?.address || 'N/A'}`, 14, 66);

  // টেবিল তৈরি
  const tableColumn = ["Product", "Model", "Qty", "Price", "Total"];
  const tableRows = [];

  items.forEach(item => {
    const productData = [
      item.name || item.products?.name,
      item.model || item.products?.model,
      item.quantity || item.qty,
      `${item.unit_price} TK`,
      `${item.total_price || item.total} TK`
    ];
    tableRows.push(productData);
  });

  doc.autoTable({
    startY: 75,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text(`Grand Total: ${docData.total_amount} TK`, 14, finalY);

  // ফাইল ডাউনলোড শুরু হবে
  doc.save(`${title}_${docNo}.pdf`);
};