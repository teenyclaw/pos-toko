import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToExcel(
  filename: string,
  sheetName: string,
  rows: Record<string, string | number>[],
  headers?: string[]
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  if (headers) {
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPdf(
  filename: string,
  title: string,
  columns: string[],
  rows: (string | number)[][],
  summary?: string[]
) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  summary?.forEach((line, i) => doc.text(line, 14, 24 + i * 6));

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 24 + (summary?.length ?? 0) * 6 + 4,
    styles: { fontSize: 8 },
  });

  doc.save(`${filename}.pdf`);
}
