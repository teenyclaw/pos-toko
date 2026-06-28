import { formatCurrency } from "./utils";

export interface BarcodeLabel {
  name: string;
  code: string;
  barcode: string;
  price: number;
  unit: string;
}

export function generateBarcodeLabelsHtml(labels: BarcodeLabel[]): string {
  const items = labels
    .map(
      (l) => `
    <div class="label">
      <p class="name">${escapeHtml(l.name)}</p>
      <svg class="barcode" data-barcode="${escapeHtml(l.barcode)}"></svg>
      <p class="code">${escapeHtml(l.barcode)}</p>
      <p class="price">${formatCurrency(l.price)} / ${escapeHtml(l.unit)}</p>
    </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Cetak Label Barcode</title>
<style>
  @page { size: A4; margin: 10mm; }
  body { font-family: Arial, sans-serif; margin: 0; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .label { border: 1px dashed #ccc; padding: 8px; text-align: center; page-break-inside: avoid; }
  .name { font-size: 11px; font-weight: bold; margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .code { font-size: 10px; font-family: monospace; margin: 2px 0; }
  .price { font-size: 11px; font-weight: bold; margin: 4px 0 0; color: #2563eb; }
  svg.barcode { width: 100%; height: 40px; }
  @media print { .no-print { display: none; } }
</style>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
</head>
<body>
<button class="no-print" onclick="window.print()" style="margin:10px;padding:8px 16px;cursor:pointer">Cetak</button>
<div class="grid">${items}</div>
<script>
document.querySelectorAll('svg.barcode').forEach(function(el) {
  try { JsBarcode(el, el.dataset.barcode, { format: 'CODE128', width: 1.5, height: 40, displayValue: false, margin: 0 }); } catch(e) {}
});
</script>
</body></html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printBarcodeLabels(labels: BarcodeLabel[]): void {
  const html = generateBarcodeLabelsHtml(labels);
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
