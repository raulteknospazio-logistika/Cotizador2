import * as XLSX from 'xlsx';
import { CatalogItem } from '../types';

function normalizeHeader(header: unknown): string {
  return String(header ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseNumberSafe(val: unknown): number {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : 0;
  }
  const str = String(val ?? '')
    .replace(/[$,\s]/g, '')
    .trim();
  if (!str || /^n\/?a$/i.test(str)) return 0;
  const num = parseFloat(str);
  return Number.isFinite(num) ? num : 0;
}

export function parseYieldPerM2(val: unknown): number | '' {
  if (typeof val === 'number') {
    return Number.isFinite(val) && val > 0 ? val : '';
  }
  const str = String(val ?? '').trim();
  if (!str || /^n\/?a$/i.test(str)) return '';
  const match = str.replace(/,/g, '.').match(/(\d+(?:\.\d+)?)/);
  if (!match) return '';
  const num = parseFloat(match[1]);
  return Number.isFinite(num) && num > 0 ? num : '';
}

function cleanStr(val: unknown): string {
  return String(val ?? '').trim();
}

export function parseCatalogFromSheetMatrix(rows: unknown[][]): CatalogItem[] {
  if (!rows || rows.length < 2) return [];

  const headers = (rows[0] || []).map(normalizeHeader);

  const findCol = (matchers: ((h: string) => boolean)[]): number => {
    for (const matcher of matchers) {
      const idx = headers.findIndex(matcher);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const productIdIdx = findCol([
    (h) => h === 'id producto',
    (h) => h.includes('id producto'),
  ]);
  const skuIdx = findCol([
    (h) => h === 'sku',
    (h) => h.includes('sku'),
    (h) => h.includes('clave'),
    (h) => h.includes('codigo'),
  ]);
  const nameIdx = findCol([
    (h) => h === 'nombre del producto',
    (h) => h.includes('nombre del producto'),
    (h) => h.includes('nombre'),
    (h) => h.includes('concepto'),
  ]);
  const regularPriceIdx = findCol([
    (h) => h.includes('precio regular'),
    (h) => h === 'regular',
  ]);
  const discountPriceIdx = findCol([
    (h) => h.includes('precio descuento'),
    (h) => h.includes('descuento (mxn)'),
    (h) => h.includes('precio'),
    (h) => h.includes('costo'),
    (h) => h.includes('lista'),
  ]);
  const categoryIdx = findCol([
    (h) => h.includes('categoria'),
    (h) => h.includes('linea'),
    (h) => h.includes('grupo'),
  ]);
  const breadcrumbsIdx = findCol([
    (h) => h.includes('breadcrumbs'),
    (h) => h.includes('ruta'),
  ]);
  const articleNumberIdx = findCol([
    (h) => h.includes('numero de articulo'),
    (h) => h.includes('articulo'),
  ]);
  const lengthIdx = findCol([(h) => h === 'largo', (h) => h.includes('largo')]);
  const widthIdx = findCol([(h) => h === 'ancho', (h) => h.includes('ancho')]);
  const thicknessIdx = findCol([(h) => h === 'espesor', (h) => h.includes('espesor')]);
  const yieldIdx = findCol([
    (h) => h.includes('m2/caja'),
    (h) => h.includes('m²/caja'),
    (h) => h.includes('m2 / caja'),
    (h) => h.includes('rendimiento'),
  ]);
  const piecesIdx = findCol([
    (h) => h.includes('pz/caja'),
    (h) => h.includes('piezas/caja'),
    (h) => h.includes('pz'),
  ]);
  const weightIdx = findCol([
    (h) => h.includes('kg/caja'),
    (h) => h.includes('peso'),
  ]);
  const warrantyIdx = findCol([(h) => h.includes('garantia')]);
  const photoIdx = findCol([
    (h) => h === 'foto',
    (h) => h.includes('foto'),
    (h) => h.includes('imagen'),
  ]);
  const descriptionIdx = findCol([
    (h) => h === 'descripcion',
    (h) => h.includes('descripcion'),
  ]);
  const urlIdx = findCol([
    (h) => h.includes('url producto'),
    (h) => h === 'url',
  ]);
  const extractedIdx = findCol([
    (h) => h.includes('ultima extraccion'),
    (h) => h.includes('extraccion'),
  ]);
  const unitIdx = findCol([(h) => h === 'unidad', (h) => h === 'um']);

  const parsed: CatalogItem[] = [];
  const seenSkus = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawSku = skuIdx !== -1 ? cleanStr(row[skuIdx]) : '';
    const rawArticle = articleNumberIdx !== -1 ? cleanStr(row[articleNumberIdx]) : '';
    const rawProductId = productIdIdx !== -1 ? cleanStr(row[productIdIdx]) : '';
    const name = nameIdx !== -1 ? cleanStr(row[nameIdx]) : '';

    const sku = rawSku || rawArticle || rawProductId || `ART-${i}`;
    if (!name && !rawSku) continue;

    // Price MUST come from Precio Descuento (MXN)
    const discountPrice = discountPriceIdx !== -1 ? parseNumberSafe(row[discountPriceIdx]) : 0;
    const regularPrice = regularPriceIdx !== -1 ? parseNumberSafe(row[regularPriceIdx]) : discountPrice;

    const yieldRaw = yieldIdx !== -1 ? cleanStr(row[yieldIdx]) : '';
    const yieldPerM2 = parseYieldPerM2(yieldRaw);
    const piecesPerBox = piecesIdx !== -1 ? cleanStr(row[piecesIdx]) : '';

    let unit = unitIdx !== -1 ? cleanStr(row[unitIdx]) : '';
    if (!unit) {
      if (yieldPerM2 !== '') {
        unit = 'caja';
      } else if (piecesPerBox === '1') {
        unit = 'pieza';
      } else {
        unit = 'unidad';
      }
    }

    // Deduplicate SKU key safely if duplicates exist in sheet
    let finalId = sku;
    if (seenSkus.has(finalId.toUpperCase())) {
      finalId = rawProductId && !seenSkus.has(rawProductId.toUpperCase()) ? rawProductId : `${sku}-${i}`;
    }
    seenSkus.add(finalId.toUpperCase());

    parsed.push({
      id: finalId,
      sku: sku,
      productId: rawProductId || undefined,
      name: name || sku,
      regularPrice,
      price: discountPrice,
      category: (categoryIdx !== -1 ? cleanStr(row[categoryIdx]) : '') || 'General',
      breadcrumbs: breadcrumbsIdx !== -1 ? cleanStr(row[breadcrumbsIdx]) || undefined : undefined,
      articleNumber: rawArticle || undefined,
      length: lengthIdx !== -1 ? cleanStr(row[lengthIdx]) || undefined : undefined,
      width: widthIdx !== -1 ? cleanStr(row[widthIdx]) || undefined : undefined,
      thickness: thicknessIdx !== -1 ? cleanStr(row[thicknessIdx]) || undefined : undefined,
      yieldPerM2,
      yieldRaw: yieldRaw || undefined,
      piecesPerBox: piecesPerBox || undefined,
      weightKg: weightIdx !== -1 ? cleanStr(row[weightIdx]) || undefined : undefined,
      warranty: warrantyIdx !== -1 ? cleanStr(row[warrantyIdx]) || undefined : undefined,
      photoUrl: photoIdx !== -1 ? cleanStr(row[photoIdx]) || undefined : undefined,
      description: descriptionIdx !== -1 ? cleanStr(row[descriptionIdx]) || undefined : undefined,
      productUrl: urlIdx !== -1 ? cleanStr(row[urlIdx]) || undefined : undefined,
      lastExtracted: extractedIdx !== -1 ? cleanStr(row[extractedIdx]) || undefined : undefined,
      unit,
    });
  }

  return parsed;
}

export function parseCatalogFromCSVString(csvText: string): CatalogItem[] {
  const workbook = XLSX.read(csvText, { type: 'string' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], { header: 1 });
  return parseCatalogFromSheetMatrix(rows);
}

export function parseCatalogFromArrayBuffer(buffer: ArrayBuffer): CatalogItem[] {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], { header: 1 });
  return parseCatalogFromSheetMatrix(rows);
}
