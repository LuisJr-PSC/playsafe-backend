const PDFDocument = require('pdfkit');

const C = {
  dark:        '#0d1a1f',
  accent:      '#5ab5d4',
  text:        '#1e3238',
  muted:       '#5a8a9a',
  light:       '#ebf5f8',
  border:      '#c8dce4',
  white:       '#ffffff',
  amber:       '#fff8eb',
  amberBorder: '#dcb978',
};

function generatePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 0, bufferPages: true });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PW = 612, PH = 792;
      const M  = 36;
      const W  = PW - M * 2;
      let   y  = M;
      let   pageNum = 1;

      function t(str, x, ty, opts = {}) {
        doc.text(String(str ?? ''), x, ty, { lineBreak: false, ...opts });
      }

      function fmt(s) {
        if (!s) return '—';
        const p = s.split('-');
        if (p.length < 3) return s;
        const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${mo[parseInt(p[1])-1]} ${parseInt(p[2])}, ${p[0]}`;
      }

      function addFooter() {
        doc.fillColor(C.dark).rect(0, PH - 32, PW, 32).fill();
        doc.fillColor(C.muted).fontSize(7).font('Helvetica');
        t(`DAILY FIELD REPORT  ·  ${data.projectName}  ·  ${fmt(data.reportDate)}`, M, PH - 20);
        const pg = `Page ${pageNum}`;
        t(pg, PW - M - doc.widthOfString(pg), PH - 20);
      }

      function addPageHeader() {
        doc.fillColor(C.dark).rect(0, 0, PW, 28).fill();
        doc.fillColor(C.accent).fontSize(7).font('Helvetica-Bold');
        t('DAILY FIELD REPORT', M, 10);
        doc.fillColor(C.muted).font('Helvetica').fontSize(7);
        const mid = `${data.projectNumber} — ${data.projectName}`;
        t(mid, PW/2 - doc.widthOfString(mid)/2, 10);
        const dr = fmt(data.reportDate);
        t(dr, PW - M - doc.widthOfString(dr), 10);
        y = 44;
      }

      function sectionHeader(title) {
        doc.fillColor(C.dark).rect(M, y, W, 18).fill();
        doc.fillColor(C.accent).rect(M, y, 4, 18).fill();
        doc.fillColor(C.accent).fontSize(7.5).font('Helvetica-Bold');
        t(title.toUpperCase(), M + 12, y + 5);
        y += 22;
      }

      function infoCell(label, value, x, w) {
        const h = 26;
        doc.fillColor(C.light).rect(x, y, w, h).fill();
        doc.strokeColor(C.border).lineWidth(0.4).rect(x, y, w, h).stroke();
        doc.fillColor(C.muted).fontSize(6).font('Helvetica-Bold');
        t(label.toUpperCase(), x + 6, y + 5);
        doc.fillColor(C.text).fontSize(8.5).font('Helvetica');
        t(String(value || '—'), x + 6, y + 15, { width: w - 12, ellipsis: true });
      }

      function textBlock(label, content) {
        if (!content) return;
        const lh = doc.fontSize(8.5).font('Helvetica').heightOfString(content, { width: W - 16 });
        const bh = Math.max(40, lh + 22);
        doc.fillColor(C.light).rect(M, y, W, bh).fill();
        doc.strokeColor(C.border).lineWidth(0.4).rect(M, y, W, bh).stroke();
        doc.fillColor(C.muted).fontSize(6).font('Helvetica-Bold');
        t(label.toUpperCase(), M + 6, y + 5);
        doc.fillColor(C.text).fontSize(8.5).font('Helvetica');
        doc.text(content, M + 6, y + 15, { width: W - 12, lineBreak: true });
        y += bh + 5;
      }

      // ════════════════════════════════════════════
      // PAGE 1 — SECTIONS 1–6
      // ════════════════════════════════════════════

      // Cover bar
      doc.fillColor(C.dark).rect(0, 0, PW, 76).fill();
      doc.fillColor(C.accent).rect(0, 74, PW, 2).fill();

      if (data.logoBase64) {
        try {
          doc.image(Buffer.from(data.logoBase64, 'base64'), 12, 10, { width: 54, height: 54, fit: [54, 54] });
        } catch(e) {}
      }

      doc.fillColor(C.white).fontSize(20).font('Helvetica-Bold');
      t('DAILY FIELD REPORT', 78, 22);
      doc.fillColor(C.accent).fontSize(8.5).font('Helvetica');
      t('PLAYSAFE CONSTRUCTION INC', 78, 48);

      doc.fillColor('#1e3648').rect(PW - 138, 10, 106, 56).fill();
      doc.fillColor(C.muted).fontSize(6.5).font('Helvetica-Bold');
      const dlbl = 'REPORT DATE';
      t(dlbl, PW - 138 + (106 - doc.widthOfString(dlbl)) / 2, 22);
      doc.fillColor(C.accent).fontSize(10.5).font('Helvetica-Bold');
      const dv = fmt(data.reportDate);
      t(dv, PW - 138 + (106 - doc.widthOfString(dv)) / 2, 36);
      if (data.dayNumber) {
        doc.fillColor(C.muted).fontSize(7).font('Helvetica');
        const ds = `Day ${data.dayNumber} of Project`;
        t(ds, PW - 138 + (106 - doc.widthOfString(ds)) / 2, 52);
      }

      y = 84;

      // 01 Project Info
      sectionHeader('01  Project Information');
      const c3 = W / 3;
      infoCell('Project #',    data.projectNumber,        M,        c3);
      infoCell('Project Name', data.projectName,          M + c3,   c3);
      infoCell('Report Date',  fmt(data.reportDate),      M + c3*2, c3);
      y += 27;
      infoCell('Site Address', data.siteAddress,          M,        c3 * 2);
      infoCell('Day #',        data.dayNumber || '—',     M + c3*2, c3);
      y += 27;
      infoCell('Foreman / Prepared By', data.preparedBy,  M,        W);
      y += 30;

      // 02 Weather
      sectionHeader('02  Weather Conditions');
      infoCell('AM Temp',    data.tempAM    ? `${data.tempAM}°F`      : '—', M,        c3);
      infoCell('PM Temp',    data.tempPM    ? `${data.tempPM}°F`      : '—', M + c3,   c3);
      infoCell('Wind Speed', data.windSpeed ? `${data.windSpeed} mph`  : '—', M+c3*2,  c3);
      y += 27;
      if (data.weatherConditions && data.weatherConditions.length > 0) {
        infoCell('Sky Conditions', data.weatherConditions.join('  |  '), M, W);
        y += 27;
      }
      if (data.weatherNotes) textBlock('Weather Delays / Notes', data.weatherNotes);

      // 03 Crew — 2-column compact layout
      sectionHeader('03  Crew & Personnel');
      if (data.crewList && data.crewList.length > 0) {
        const half  = Math.ceil(data.crewList.length / 2);
        const col1  = data.crewList.slice(0, half);
        const col2  = data.crewList.slice(half);
        const colW  = (W - 8) / 2;
        const rowH  = 16;

        // Column headers — names only
        [M, M + colW + 8].forEach(cx => {
          doc.fillColor(C.dark).rect(cx, y, colW, 16).fill();
          doc.fillColor(C.muted).fontSize(6.5).font('Helvetica-Bold');
          t('NAME', cx + 5, y + 5);
        });
        y += 16;

        const maxRows = Math.max(col1.length, col2.length);
        for (let i = 0; i < maxRows; i++) {
          const bg = i % 2 === 0 ? C.white : C.light;
          [0, 1].forEach(side => {
            const cx   = side === 0 ? M : M + colW + 8;
            const item = side === 0 ? col1[i] : col2[i];
            doc.fillColor(bg).rect(cx, y, colW, rowH).fill();
            doc.strokeColor(C.border).lineWidth(0.3).rect(cx, y, colW, rowH).stroke();
            if (item) {
              doc.fillColor(C.text).fontSize(7.5).font('Helvetica');
              t(item.name || '', cx + 5, y + 4, { width: colW - 10, ellipsis: true });
            }
          });
          y += rowH;
        }
        y += 6;
      } else {
        doc.fillColor(C.muted).fontSize(8.5).font('Helvetica');
        t('No crew selected.', M + 6, y + 4); y += 20;
      }

      // 04 Equipment
      sectionHeader('04  Equipment On-Site');
      if (data.equipList && data.equipList.length > 0) {
        const ec = [W * 0.60, W * 0.40];
        doc.fillColor(C.dark).rect(M, y, W, 16).fill();
        doc.fillColor(C.muted).fontSize(6.5).font('Helvetica-Bold');
        t('EQUIPMENT DESCRIPTION', M + 5, y + 5);
        t('OWNER / RENTAL', M + ec[0] + 5, y + 5);
        y += 16;
        data.equipList.forEach((eq, ri) => {
          doc.fillColor(ri % 2 === 0 ? C.white : C.light).rect(M, y, W, 16).fill();
          doc.strokeColor(C.border).lineWidth(0.3).rect(M, y, W, 16).stroke();
          doc.fillColor(C.text).fontSize(7.5).font('Helvetica');
          t(eq.desc || '', M + 5, y + 4, { width: ec[0] - 10, ellipsis: true });
          doc.fillColor(C.muted).fontSize(7);
          t(eq.owner || '', M + ec[0] + 5, y + 4);
          y += 16;
        });
        y += 6;
      } else {
        doc.fillColor(C.muted).fontSize(8.5).font('Helvetica');
        t('No equipment recorded.', M + 6, y + 4); y += 20;
      }

      // 05 Work Performed
      sectionHeader('05  Work Performed Today');
      textBlock('Description of Work Performed', data.workDescription);
      textBlock('Materials Delivered / Used', data.materials);

      // 06 Delays & Issues
      sectionHeader('06  Delays & Issues');
      if (data.delays || data.issues) {
        const half = (W - 6) / 2;
        const dlH  = data.delays ? doc.fontSize(8.5).font('Helvetica').heightOfString(data.delays, { width: half - 14 }) : 0;
        const isH  = data.issues ? doc.fontSize(8.5).font('Helvetica').heightOfString(data.issues, { width: half - 14 }) : 0;
        const bh   = Math.max(42, Math.max(dlH, isH) + 22);
        if (data.delays) {
          doc.fillColor(C.amber).rect(M, y, half, bh).fill();
          doc.strokeColor(C.amberBorder).lineWidth(0.4).rect(M, y, half, bh).stroke();
          doc.fillColor(C.muted).fontSize(6).font('Helvetica-Bold');
          t('DELAYS', M + 6, y + 5);
          doc.fillColor(C.text).fontSize(8.5).font('Helvetica');
          doc.text(data.delays, M + 6, y + 15, { width: half - 12, lineBreak: true });
        }
        if (data.issues) {
          doc.fillColor(C.light).rect(M + half + 6, y, half, bh).fill();
          doc.strokeColor(C.border).lineWidth(0.4).rect(M + half + 6, y, half, bh).stroke();
          doc.fillColor(C.muted).fontSize(6).font('Helvetica-Bold');
          t('ISSUES / PROBLEMS', M + half + 12, y + 5);
          doc.fillColor(C.text).fontSize(8.5).font('Helvetica');
          doc.text(data.issues, M + half + 12, y + 15, { width: half - 12, lineBreak: true });
        }
        y += bh + 6;
      } else {
        doc.fillColor(C.muted).fontSize(8.5).font('Helvetica');
        t('No delays or issues recorded.', M + 6, y + 4); y += 20;
      }

      addFooter();

      // ════════════════════════════════════════════
      // PHOTO PAGES — 6 per page, fit (no crop/overlap)
      // ════════════════════════════════════════════
      if (data.images && data.images.length > 0) {
        const COLS = 2, ROWS = 3, PER = 6;

        for (let pi = 0; pi < data.images.length; pi += PER) {
          doc.addPage({ size: 'LETTER', margin: 0 });
          pageNum++;
          addPageHeader(); // y = 44

          const pagePhotos = data.images.slice(pi, pi + PER);
          const pageIndex  = Math.floor(pi / PER) + 1;
          const totalPages = Math.ceil(data.images.length / PER);
          sectionHeader(totalPages > 1
            ? `07  Site Photos (${pageIndex} of ${totalPages})`
            : '07  Site Photos'); // y advances 22

          // Fixed slot grid — all slots same size, no overlap possible
          const GAPX   = 10;
          const GAPY   = 10;
          const slotW  = Math.floor((W - GAPX) / COLS);
          const availH = PH - y - 32 - 8;   // footer + padding
          const slotH  = Math.floor((availH - (ROWS - 1) * GAPY) / ROWS);

          for (let i = 0; i < pagePhotos.length; i++) {
            const img  = pagePhotos[i];
            const col  = i % COLS;
            const row  = Math.floor(i / COLS);
            const sx   = M + col * (slotW + GAPX);
            const sy   = y + row * (slotH + GAPY);

            // Background slot
            doc.fillColor(C.light).rect(sx, sy, slotW, slotH).fill();
            doc.strokeColor(C.border).lineWidth(0.4).rect(sx, sy, slotW, slotH).stroke();

            if (img.dataUrl) {
              try {
                const buf    = Buffer.from(img.dataUrl.split(',')[1], 'base64');
                const opened = doc.openImage(buf);
                // Scale to fit within slot, preserve aspect ratio
                const scale  = Math.min(slotW / opened.width, slotH / opened.height);
                const iw     = Math.floor(opened.width  * scale);
                const ih     = Math.floor(opened.height * scale);
                // Center within slot
                const ix     = sx + Math.floor((slotW - iw) / 2);
                const iy     = sy + Math.floor((slotH - ih) / 2);
                doc.image(buf, ix, iy, { width: iw, height: ih });
                // Redraw border on top
                doc.strokeColor(C.border).lineWidth(0.4).rect(sx, sy, slotW, slotH).stroke();
              } catch(e) {
                doc.fillColor(C.muted).fontSize(8).font('Helvetica');
                t('Image unavailable', sx + 5, sy + slotH / 2 - 5);
              }
            }

            // Caption
            if (img.caption) {
              const capH = 18;
              doc.fillColor('rgba(13,26,31,0.72)').rect(sx, sy + slotH - capH, slotW, capH).fill();
              doc.fillColor('#dddddd').fontSize(7).font('Helvetica-Oblique');
              t(img.caption, sx + 5, sy + slotH - capH + 5, { width: slotW - 10, ellipsis: true });
            }

            // Photo number badge (top-left)
            doc.fillColor(C.dark).rect(sx + 4, sy + 4, 20, 13).fill();
            doc.fillColor(C.accent).fontSize(7).font('Helvetica-Bold');
            const num = String(pi + i + 1);
            t(num, sx + 4 + (20 - doc.widthOfString(num)) / 2, sy + 6);
          }

          addFooter();
        }
      }

      // ── PSI DOCUMENT PAGE ──
      if (data.psiDocBase64) {
        try {
          const psiBuf = Buffer.from(data.psiDocBase64, 'base64');
          doc.addPage({ size: 'LETTER', margin: 0 });
          pageNum++;
          // Fill page with white background
          doc.fillColor(C.white).rect(0, 0, PW, PH).fill();
          // Fit image to full page with small margin, preserve aspect ratio
          const psiMargin = 14;
          const maxW = PW - psiMargin * 2;
          const maxH = PH - psiMargin * 2;
          // Open image to get dimensions
          const opened = doc.openImage(psiBuf);
          const aspect = opened.width / opened.height;
          let drawW = maxW, drawH = maxW / aspect;
          if (drawH > maxH) { drawH = maxH; drawW = maxH * aspect; }
          const ox = psiMargin + (maxW - drawW) / 2;
          const oy = psiMargin + (maxH - drawH) / 2;
          doc.image(psiBuf, ox, oy, { width: drawW, height: drawH });
          addFooter();
        } catch(e) {
          console.error('PSI image error:', e.message);
        }
      }

      doc.end();
    } catch(err) {
      reject(err);
    }
  });
}

module.exports = { generatePDF };
