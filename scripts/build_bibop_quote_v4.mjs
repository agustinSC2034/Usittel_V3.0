import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const outputDir = path.join(root, "outputs", "019fd83b-49ab-7f62-b271-ec2e8201db32");
const previewDir = path.join(root, "tmp", "spreadsheets");
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Cotizacion");
sheet.showGridLines = true;
sheet.freezePanes.freezeRows(7);

sheet.getRange("A1:F1").merge();
sheet.getRange("A1").values = [["BIBOP S.A. - COTIZACION N° 0804/26"]];
sheet.getRange("A2:F2").merge();
sheet.getRange("A2").values = [["CUIT 30-71578682-2 | Carlos Pellegrini 855, piso 3, CABA | gestion@bibop.com.ar"]];
sheet.getRange("A3").values = [["Cliente"]];
sheet.getRange("B3:F3").merge();
sheet.getRange("B3").values = [["José J. Chediack S.A.I.C.A."]];
sheet.getRange("A4").values = [["Trabajo"]];
sheet.getRange("B4:F4").merge();
sheet.getRange("B4").values = [["Mudanza de sitios Claro y Movistar - PBN y Anillo Peatonal Av. Pampa"]];
sheet.getRange("A5").values = [["Fecha"]];
sheet.getRange("B5").values = [[new Date("2026-08-05T12:00:00")]];
sheet.getRange("C5").values = [["Validez"]];
sheet.getRange("D5").values = [["30 días"]];
sheet.getRange("E5").values = [["Plazo"]];
sheet.getRange("F5").values = [["60 días"]];

sheet.getRange("A7:F7").values = [[
  "N°", "Detalle", "Unidad", "Cant.", "Precio unitario USD", "Importe USD"
]];

sheet.getRange("A8:E12").values = [
  [1, "Relevamiento, ingeniería, topografía, suelos, memorias y planos", "global", 1, 6500.00],
  [2, "Fundaciones hasta 10 m3, armaduras, anclajes y canalizaciones", "global", 1, 24000.00],
  [3, "Desmontaje de monopostes hasta 18 m e inventario", "global", 1, 8200.00],
  [4, "Traslado, grúa, izaje, montaje, aplomado y torqueado", "global", 1, 10552.21],
  [5, "Logística inversa, limpieza y disposición de residuos", "global", 1, 3000.00],
];
sheet.getRange("F8").formulas = [["=D8*E8"]];
sheet.getRange("F8:F12").fillDown();
sheet.getRange("B13:E13").merge();
sheet.getRange("B13").values = [["Subtotal infraestructura civil y estructural"]];
sheet.getRange("F13").formulas = [["=SUM(F8:F12)"]];

sheet.getRange("A15:E20").values = [
  [6, "Desmontaje y resguardo de antenas, RRU, BBU, MW, gabinetes y energía", "global", 1, 8500.00],
  [7, "Montaje de sistema radiante, transmisión, jumpers y sellado", "global", 1, 10250.00],
  [8, "Gabinete, rectificadores, baterías, tableros, climatización y PAT", "global", 1, 9800.00],
  [9, "Fibra, fusiones, ODF, ordenamiento y certificación OTDR", "global", 1, 5800.00],
  [10, "Configuración, OSS/NOC, commissioning, swap, rollback y soporte 72 h", "global", 1, 6500.00],
  [11, "Sweep, DTF, PIM, potencia, alineación GPS, alarmas y as-built", "global", 1, 3148.08],
];
sheet.getRange("F15").formulas = [["=D15*E15"]];
sheet.getRange("F15:F20").fillDown();
sheet.getRange("B21:E21").merge();
sheet.getRange("B21").values = [["Subtotal electrónica e integración"]];
sheet.getRange("F21").formulas = [["=SUM(F15:F20)"]];
sheet.getRange("B22:E22").merge();
sheet.getRange("B22").values = [["TOTAL GENERAL - IVA NO INCLUIDO"]];
sheet.getRange("F22").formulas = [["=F13+F21"]];

sheet.getRange("A24").values = [["Nota"]];
sheet.getRange("B24:E24").merge();
sheet.getRange("B24").values = [["Descuento por cada fundación ejecutada integralmente por el comitente"]];
sheet.getRange("F24").values = [[14401.51]];

sheet.getRange("A26:F26").merge();
sheet.getRange("A26").values = [["Condiciones"]];
sheet.getRange("A27:F31").values = [
  ["- 40% de anticipo contra orden de compra.", null, null, null, null, null],
  ["- Saldo por certificaciones mensuales a 30 días.", null, null, null, null, null],
  ["- 10% final contra aceptación de los trabajos.", null, null, null, null, null],
  ["- Pago en pesos al tipo vendedor BNA dólar billete del día de pago.", null, null, null, null, null],
  ["- Incluye dos sitios llave en mano. No incluye IVA, tasas ni hardware nuevo.", null, null, null, null, null],
];
for (let row = 27; row <= 31; row++) {
  sheet.getRange(`A${row}:F${row}`).merge();
}

sheet.getRange("A33:F33").merge();
sheet.getRange("A33").values = [["Consultas: gestion@bibop.com.ar | 0800 362 2020"]];

sheet.getRange("A1:F33").format.font = { name: "Calibri", size: 10, color: "#202020" };
sheet.getRange("A1").format.font = { name: "Calibri", size: 15, bold: true, color: "#5B2AA8" };
sheet.getRange("A2").format.font = { name: "Calibri", size: 9, italic: true, color: "#555555" };
sheet.getRange("A3:A5").format.font = { bold: true };
sheet.getRange("C5").format.font = { bold: true };
sheet.getRange("E5").format.font = { bold: true };
sheet.getRange("A7:F7").format = {
  fill: "#6C35D7",
  font: { name: "Calibri", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
};
sheet.getRange("A8:F22").format.borders = { preset: "all", style: "thin", color: "#BFBFBF" };
sheet.getRange("A13:F13").format.font = { bold: true };
sheet.getRange("A21:F21").format.font = { bold: true };
sheet.getRange("A22:F22").format = {
  fill: "#EEE7F8",
  font: { bold: true, color: "#3F1B73" },
  borders: { preset: "doubleBottom", style: "medium", color: "#6C35D7" },
};
sheet.getRange("A24:F24").format.font = { italic: true };
sheet.getRange("F24").format.font = { bold: true };
sheet.getRange("A26:F26").format = {
  fill: "#E8E8E8",
  font: { bold: true, color: "#222222" },
};
sheet.getRange("A33").format.font = { italic: true, color: "#666666" };

sheet.getRange("A1:F33").format.verticalAlignment = "center";
sheet.getRange("B8:B20").format.wrapText = true;
sheet.getRange("A27:F31").format.wrapText = true;
sheet.getRange("A8:A20").format.horizontalAlignment = "center";
sheet.getRange("C8:D20").format.horizontalAlignment = "center";
sheet.getRange("E8:F24").format.horizontalAlignment = "right";
sheet.getRange("B5").format.numberFormat = "dd/mm/yyyy";
sheet.getRange("E8:F24").format.numberFormat = '"USD" #,##0.00';

sheet.getRange("A1:F1").format.rowHeight = 25;
sheet.getRange("A2:F2").format.rowHeight = 18;
sheet.getRange("A7:F7").format.rowHeight = 30;
sheet.getRange("A8:F12").format.rowHeight = 31;
sheet.getRange("A15:F20").format.rowHeight = 31;
sheet.getRange("A27:F31").format.rowHeight = 20;
sheet.getRange("A:A").format.columnWidth = 6;
sheet.getRange("B:B").format.columnWidth = 55;
sheet.getRange("C:C").format.columnWidth = 12;
sheet.getRange("D:D").format.columnWidth = 9;
sheet.getRange("E:F").format.columnWidth = 17;

const preview = await workbook.render({
  sheetName: "Cotizacion",
  range: "A1:F33",
  scale: 1.25,
  format: "png",
});
await fs.writeFile(path.join(previewDir, "bibop-cotizacion-v4.png"), new Uint8Array(await preview.arrayBuffer()));

const inspection = await workbook.inspect({
  kind: "table",
  range: "Cotizacion!A1:F33",
  include: "values,formulas",
  tableMaxRows: 40,
  tableMaxCols: 8,
  maxChars: 10000,
});
console.log(inspection.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "formula error scan",
});
console.log(errors.ndjson);

const output = await SpreadsheetFile.exportXlsx(workbook);
const outputPath = path.join(outputDir, "Cotizacion_Bibop_Chediack_Mudanza.xlsx");
await output.save(outputPath);
console.log(`OUTPUT=${outputPath}`);