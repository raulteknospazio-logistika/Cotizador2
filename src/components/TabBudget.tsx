import React from 'react';
import { CatalogItem, MaterialItem, Quote } from '../types';
import { formatMXN } from '../utils/storage';

interface TabBudgetProps {
  quote: Quote;
  catalog?: CatalogItem[];
  onShowToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const TabBudget: React.FC<TabBudgetProps> = ({ quote, catalog = [], onShowToast }) => {
  const currentDateStr = new Date().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formatAreaNum = (val: number) =>
    Number.isInteger(val) ? String(val) : Number(val.toFixed(2)).toString();

  const findCatalogForMaterial = (material?: MaterialItem): CatalogItem | undefined => {
    if (!material || catalog.length === 0) return undefined;
    const cleanSku = (material.sku || '').trim().toUpperCase();
    if (cleanSku) {
      const bySku =
        catalog.find((item) => item.id.trim().toUpperCase() === cleanSku) ||
        catalog.find((item) => item.sku && item.sku.trim().toUpperCase() === cleanSku) ||
        catalog.find(
          (item) => item.articleNumber && item.articleNumber.trim().toUpperCase() === cleanSku
        );
      if (bySku) return bySku;
    }
    const cleanName = (material.name || '').trim().toLowerCase();
    if (cleanName) {
      return catalog.find((item) => item.name.trim().toLowerCase() === cleanName);
    }
    return undefined;
  };

  // Calculate totals per room and grand total
  const roomsCalculated = quote.rooms.map((room, idx) => {
    const l = typeof room.length === 'number' ? room.length : 0;
    const w = typeof room.width === 'number' ? room.width : 0;
    const areaNet = l * w;
    const waste = typeof room.wastePct === 'number' ? room.wastePct : 10;
    const areaGross = areaNet * (1 + waste / 100);

    const materialsCalc = room.materials.map((m) => {
      const y = typeof m.yield === 'number' ? m.yield : 0;
      const p = typeof m.price === 'number' ? m.price : 0;
      const hasManualPcs = m.pieces !== '' && m.pieces !== null && m.pieces !== undefined;

      const qty = hasManualPcs
        ? typeof m.pieces === 'number'
          ? m.pieces
          : 0
        : y > 0 && areaGross > 0
        ? Math.ceil(areaGross / y)
        : 0;

      const grossTotal = qty * p;
      const discountPct = Math.min(100, Math.max(0, m.discountPct || 0));
      const discountAmt = (grossTotal * discountPct) / 100;
      const netTotal = grossTotal - discountAmt;

      return {
        ...m,
        qty,
        grossTotal,
        discountAmt,
        netTotal,
      };
    });

    const roomSubtotal = materialsCalc.reduce((sum, item) => sum + item.netTotal, 0);

    const firstMaterial = room.materials[0];
    const matchedCatalog = findCatalogForMaterial(firstMaterial);
    const firstMaterialDescription = (
      firstMaterial?.description ||
      matchedCatalog?.description ||
      ''
    ).trim();
    const firstMaterialPhotoUrl = (
      firstMaterial?.photoUrl ||
      matchedCatalog?.photoUrl ||
      ''
    ).trim();
    const rawProductUrl = (
      firstMaterial?.productUrl ||
      matchedCatalog?.productUrl ||
      ''
    ).trim();
    const firstMaterialProductUrl =
      rawProductUrl && !/^javascript:/i.test(rawProductUrl)
        ? /^https?:\/\//i.test(rawProductUrl)
          ? rawProductUrl
          : `https://${rawProductUrl}`
        : '';

    return {
      room,
      idx,
      l,
      w,
      waste,
      areaNet,
      areaGross,
      materialsCalc,
      roomSubtotal,
      firstMaterialName: firstMaterial?.name || matchedCatalog?.name || '',
      firstMaterialSku: firstMaterial?.sku || matchedCatalog?.sku || '',
      firstMaterialDescription,
      firstMaterialPhotoUrl,
      firstMaterialProductUrl,
    };
  });

  const grandTotal = roomsCalculated.reduce((sum, r) => sum + r.roomSubtotal, 0);
  const areasWithDescription = roomsCalculated.filter((r) =>
    Boolean(r.firstMaterialDescription || r.firstMaterialPhotoUrl || r.firstMaterialProductUrl)
  );

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsApp = () => {
    let text = `*COTIZACIÓN TEKNOSPAZIO DE RECUBRIMIENTOS*\n`;
    text += `------------------------------------\n`;
    text += `📄 *Folio:* ${quote.folio || 'TK-2026-001'}\n`;
    text += `🏬 *Tienda:* ${quote.store || 'No especificada'}\n`;
    text += `👤 *Cliente:* ${quote.client_name || 'Cliente'}\n`;
    text += `📞 *Tel:* ${quote.client_phone || '-'}\n`;
    text += `📍 *Obra:* ${quote.project_address || 'Ubicación no especificada'}\n\n`;

    text += `*DESGLOSE POR ÁREAS:*\n`;

    roomsCalculated.forEach(({ room, idx, l, w, waste, areaNet, areaGross, materialsCalc, roomSubtotal }) => {
      text += `\n#${idx + 1}. *${room.name || `Área ${idx + 1}`}* (${formatAreaNum(l)} x ${formatAreaNum(w)} = ${formatAreaNum(areaNet)} m² útiles + ${formatAreaNum(waste)}% merma = ${formatAreaNum(areaGross)} m²)\n`;
      materialsCalc.forEach((m) => {
        text += `   • ${m.name || 'Material'}: ${m.qty} unid x $${formatMXN(typeof m.price === 'number' ? m.price : 0)} = $${formatMXN(m.netTotal)}\n`;
      });
      text += `   Subtotal Área: $${formatMXN(roomSubtotal)} MXN\n`;
    });

    text += `\n💰 *TOTAL (IVA INCLUIDO):* $${formatMXN(grandTotal)} MXN\n`;
    text += `------------------------------------\n`;
    text += `Vigencia: 15 días naturales.\n`;
    text += `Quedamos a sus órdenes en Teknospazio.com`;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    onShowToast('Resumen de cotización copiado para WhatsApp', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="no-print flex flex-wrap justify-between items-center gap-4 bg-slate-800 text-white p-4 rounded-2xl shadow-md">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-circle-check text-emerald-400 text-lg"></i>
          <span className="text-xs font-medium">
            Presupuesto generado y listo para presentar o imprimir para el cliente.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-2 transition"
          >
            <i className="fa-solid fa-print"></i> Imprimir / Guardar PDF
          </button>
          <button
            onClick={handleCopyWhatsApp}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold shadow flex items-center gap-2 transition"
          >
            <i className="fa-brands fa-whatsapp text-sm"></i> Copiar a WhatsApp
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div
        id="printSheet"
        className="bg-white p-6 sm:p-10 md:p-12 rounded-2xl shadow-xl border border-slate-200 print-container max-w-4xl mx-auto space-y-8 text-slate-800"
      >
        {/* Header Presupuesto */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/logo-Tekno-Spazio-blanco-png_e3d30b93.png"
                alt="Teknospazio"
                className="w-44 h-auto bg-slate-950 p-2 rounded-lg"
              />
            </div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider pt-1">
              Recubrimientos & Diseño de Espacios
            </p>
            <p className="text-[11px] text-slate-400">
              RFC: TEK-080912-K32 | Ventas y Proyectos Especiales
            </p>
          </div>

          <div className="text-right space-y-1">
            <span className="inline-block bg-teal-50 text-teal-800 font-bold px-3 py-1 rounded-full text-xs border border-teal-200">
              PRESUPUESTO FORMAL
            </span>
            <div className="text-xs text-slate-500">
              Folio:{' '}
              <span className="font-bold text-slate-900">{quote.folio || 'TK-2026-001'}</span>
            </div>
            <div className="text-xs text-slate-500">
              Fecha: <span className="font-medium text-slate-800">{currentDateStr}</span>
            </div>
            <div className="text-xs text-slate-500">
              Vigencia: <span className="font-medium text-slate-800">15 días naturales</span>
            </div>
          </div>
        </div>

        {/* Client & Work Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
          <div>
            <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Cliente / Atención a:
            </span>
            <div className="font-bold text-slate-800 text-sm">
              {quote.client_name || 'Cliente Particular'}
            </div>
            <div className="text-slate-500">{quote.client_phone ? `Tel: ${quote.client_phone}` : 'Tel: No registrado'}</div>
          </div>

          <div>
            <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Ubicación de la Obra:
            </span>
            <div className="font-medium text-slate-800">
              {quote.project_address || 'Ubicación no especificada'}
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Tienda y Atención:
            </span>
            <div className="font-medium text-slate-800">
              {quote.store} · {quote.seller_name || 'Vendedor'}
            </div>
            {quote.technician_name && (
              <div className="text-indigo-600 font-medium">Técnico: {quote.technician_name}</div>
            )}
          </div>
        </div>

        {/* Breakdown tables per room */}
        <div className="space-y-6">
          {roomsCalculated.map(({ room, idx, l, w, waste, areaNet, areaGross, materialsCalc, roomSubtotal }) => (
            <div key={room.id} className="space-y-2">
              <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold">
                <span>
                  #{idx + 1}. {room.name || `Área ${idx + 1}`} (
                  {formatAreaNum(l)} x {formatAreaNum(w)} = {formatAreaNum(areaNet)} m² útiles +{' '}
                  {formatAreaNum(waste)}% merma = {formatAreaNum(areaGross)} m²)
                </span>
                <span>Subtotal: ${formatMXN(roomSubtotal)} MXN</span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 uppercase font-semibold text-[10px]">
                    <th className="py-1.5 pl-1">SKU / Material</th>
                    <th className="py-1.5 text-center">Cant. / Unid</th>
                    <th className="py-1.5 text-right">Precio Unit</th>
                    <th className="py-1.5 text-center">Desc. %</th>
                    <th className="py-1.5 text-right pr-1">Importe Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {materialsCalc.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2 pl-1">
                        <span className="font-semibold text-slate-800">{m.name || 'Material'}</span>
                        {m.sku && (
                          <span className="block text-[10px] text-slate-400 font-mono">
                            SKU: {m.sku}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-center font-medium">{m.qty}</td>
                      <td className="py-2 text-right">
                        ${formatMXN(typeof m.price === 'number' ? m.price : 0)}
                      </td>
                      <td className="py-2 text-center text-emerald-700 font-bold">
                        {m.discountPct > 0 ? `${m.discountPct}%` : '-'}
                      </td>
                      <td className="py-2 text-right font-bold text-slate-900 pr-1">
                        ${formatMXN(m.netTotal)}
                      </td>
                    </tr>
                  ))}
                  {materialsCalc.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-slate-400">
                        Sin materiales registrados en esta área
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Work Planning Badge (only shown if user set work times/dates) */}
              {(() => {
                const hasDuration =
                  room.workDuration !== '' &&
                  room.workDuration !== null &&
                  room.workDuration !== undefined &&
                  Number(room.workDuration) > 0;
                const hasStartTime = Boolean(room.workStartTime && room.workStartTime.trim());
                const hasEndTime = Boolean(room.workEndTime && room.workEndTime.trim());
                const hasSchedule = hasStartTime || hasEndTime;
                const hasStartDate = Boolean(room.workStartDate && room.workStartDate.trim());

                if (!hasDuration && !hasSchedule && !hasStartDate) return null;

                return (
                  <div className="flex flex-wrap gap-x-6 gap-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600">
                    {hasDuration && (
                      <div>
                        <span className="font-bold text-slate-700">Tiempo de Obra:</span>{' '}
                        {room.workDuration} días hábiles
                      </div>
                    )}
                    {hasSchedule && (
                      <div>
                        <span className="font-bold text-slate-700">Horario in situ:</span>{' '}
                        {hasStartTime && hasEndTime
                          ? `${room.workStartTime} a ${room.workEndTime}`
                          : hasStartTime
                          ? `Desde ${room.workStartTime}`
                          : `Hasta ${room.workEndTime}`}
                      </div>
                    )}
                    {hasStartDate && (
                      <div>
                        <span className="font-bold text-slate-700">Inicio de Obra:</span>{' '}
                        {new Date(`${room.workStartDate}T00:00:00`).toLocaleDateString('es-MX')}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>

        {/* Totals Section */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <div className="w-full sm:w-80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal (descuentos aplicados):</span>
              <span className="font-semibold">${formatMXN(grandTotal)} MXN</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-300">
              <span>TOTAL (IVA INCLUIDO):</span>
              <span className="text-teal-700">${formatMXN(grandTotal)} MXN</span>
            </div>
          </div>
        </div>

        {/* Material Descriptions per Area (First Material of Each Area) */}
        {areasWithDescription.length > 0 && (
          <div className="space-y-3 border-t border-slate-200 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <i className="fa-solid fa-align-left text-teal-600"></i> Descripción de Materiales por
              Área
            </h3>
            <div className="space-y-3">
              {areasWithDescription.map(
                ({
                  room,
                  idx,
                  firstMaterialName,
                  firstMaterialSku,
                  firstMaterialDescription,
                  firstMaterialPhotoUrl,
                  firstMaterialProductUrl,
                }) => (
                  <div
                    key={`desc-${room.id}`}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-col sm:flex-row gap-4 items-start"
                  >
                    {firstMaterialPhotoUrl && (
                      <img
                        src={firstMaterialPhotoUrl}
                        alt={firstMaterialName || `Material de ${room.name || `Área ${idx + 1}`}`}
                        className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl border border-slate-200 bg-white shrink-0 shadow-2xs"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-900">
                        <span className="text-teal-700">
                          #{idx + 1}. {room.name?.trim() || `Área ${idx + 1}`}
                        </span>
                        {firstMaterialName && (
                          <span className="text-slate-700 font-semibold">— {firstMaterialName}</span>
                        )}
                        {firstMaterialSku && (
                          <span className="text-[10px] font-mono font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            SKU: {firstMaterialSku}
                          </span>
                        )}
                      </div>
                      {firstMaterialDescription && (
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                          {firstMaterialDescription}
                        </p>
                      )}
                      {firstMaterialProductUrl && (
                        <div className="pt-1">
                          <a
                            href={firstMaterialProductUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-teal-700 hover:text-teal-900 underline break-all"
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square text-[10px] shrink-0"></i>
                            <span>{firstMaterialProductUrl}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Value Proposition Cards */}
        <section className="space-y-5 border-t border-slate-200 pt-7">
          <div className="text-center">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              ¿Por qué elegir Teknospazio para sus recubrimientos?
            </h2>
            <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-amber-500"></div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <article className="budget-benefit-card rounded-xl border border-amber-100 bg-amber-50/50 p-3.5 text-center shadow-xs">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-amber-100 bg-white text-amber-700 shadow-2xs">
                <i className="fa-solid fa-award text-sm"></i>
              </div>
              <h3 className="mb-1 text-xs font-bold text-slate-900">PROFESIONALES CAPACITADOS</h3>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Personal técnico capacitado para realizar la instalación con atención al detalle y
                control de calidad.
              </p>
            </article>

            <article className="budget-benefit-card rounded-xl border border-amber-100 bg-amber-50/50 p-3.5 text-center shadow-xs">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-amber-100 bg-white text-amber-700 shadow-2xs">
                <i className="fa-regular fa-calendar-check text-sm"></i>
              </div>
              <h3 className="mb-1 text-xs font-bold text-slate-900">PLANEACIÓN DE OBRA</h3>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Definimos tiempos y horario de trabajo para organizar el proyecto desde el inicio.
              </p>
            </article>

            <article className="budget-benefit-card rounded-xl border border-amber-100 bg-amber-50/50 p-3.5 text-center shadow-xs">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-amber-100 bg-white text-amber-700 shadow-2xs">
                <i className="fa-solid fa-scale-balanced text-sm"></i>
              </div>
              <h3 className="mb-1 text-xs font-bold text-slate-900">VALOR PARA SU INVERSIÓN</h3>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Una propuesta clara con materiales y cantidades definidos para ayudarle a decidir
                con confianza.
              </p>
            </article>
          </div>

          <div className="border-t border-amber-100 pt-3 text-center">
            <p className="text-xs font-semibold text-slate-800">
              Una marca de confianza en recubrimientos arquitectónicos.
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[11px] text-slate-500">
              <span>
                <i className="fa-solid fa-globe mr-1 text-amber-700"></i>teknospazio.com
              </span>
              <span>
                <i className="fa-solid fa-envelope mr-1 text-amber-700"></i>info@teknospazio.com
              </span>
              <span>
                <i className="fa-solid fa-phone mr-1 text-amber-700"></i>(318) 755-7831
              </span>
            </div>
          </div>
        </section>

        {/* Terms & Conditions */}
        <div className="border-t border-slate-200 pt-5 text-[11px] text-slate-400 space-y-1">
          <p className="font-bold text-slate-600 uppercase">Términos y Condiciones:</p>
          <p>
            • Todos los montos de esta cotización ya incluyen IVA; no se agrega un importe adicional
            por este concepto.
          </p>
          <p>
            • Los importes consideran las cantidades calculadas con el rendimiento y la merma
            indicados en cada área.
          </p>
          <p>
            • La preparación de la superficie para colocación requiere estar a nivel y plomo previo
            al inicio de los trabajos.
          </p>
          <p>• Cotización generada mediante el Cotizador Express Teknospazio en MXN.</p>
        </div>
      </div>
    </div>
  );
};
