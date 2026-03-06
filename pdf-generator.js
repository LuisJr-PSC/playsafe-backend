const PDFDocument = require('pdfkit');

// ── COLORS ──
const C = {
  dark:    '#0d1a1f',
  accent:  '#5ab5d4',
  text:    '#1e3238',
  muted:   '#5a8a9a',
  light:   '#ebf5f8',
  border:  '#c8dce4',
  white:   '#ffffff',
  success: '#28b478',
  amber:   '#fff8eb',
  amberBorder: '#dcb978',
};

function generatePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 0, bufferPages: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PW = 612, PH = 792;
      const M = 40;
      const W = PW - M * 2;
      let y = M;
      let pageNum = 1;

      // ── HELPERS ──
      function hex(h) {
        const r = parseInt(h.slice(1,3),16);
        const g = parseInt(h.slice(3,5),16);
        const b = parseInt(h.slice(5,7),16);
        return [r,g,b];
      }

      function fill(color) { doc.fillColor(color); }
      function stroke(color) { doc.strokeColor(color); }

      function rect(x, y, w, h, fillColor, strokeColor) {
        if (fillColor) { doc.rect(x, y, w, h).fill(fillColor); }
        if (strokeColor) { doc.rect(x, y, w, h).stroke(strokeColor); }
        if (fillColor && strokeColor) { doc.rect(x, y, w, h).fillAndStroke(fillColor, strokeColor); }
      }

      function text(str, x, ty, opts = {}) {
        doc.text(String(str || ''), x, ty, { lineBreak: false, ...opts });
      }

      function formatDate(s) {
        if (!s) return '—';
        const parts = s.split('-');
        if (parts.length < 3) return s;
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${months[parseInt(parts[1])-1]} ${parseInt(parts[2])}, ${parts[0]}`;
      }

      function addFooter() {
        doc.fillColor(C.dark).rect(0, PH - 36, PW, 36).fill();
        doc.fillColor(C.muted).fontSize(7).font('Helvetica');
        text(`DAILY FIELD REPORT  ·  ${data.projectName}  ·  ${formatDate(data.reportDate)}`, M, PH - 22);
        doc.fillColor(C.muted).fontSize(7);
        const pageStr = `Page ${pageNum}`;
        const pw = doc.widthOfString(pageStr);
        text(pageStr, PW - M - pw, PH - 22);
      }

      function addPageHeader() {
        doc.fillColor(C.dark).rect(0, 0, PW, 32).fill();
        doc.fillColor(C.accent).fontSize(7).font('Helvetica-Bold');
        text('DAILY FIELD REPORT', M, 12);
        doc.fillColor(C.muted).font('Helvetica').fontSize(7);
        const mid = `${data.projectNumber} — ${data.projectName}`;
        const mw = doc.widthOfString(mid);
        text(mid, PW/2 - mw/2, 12);
        const dr = formatDate(data.reportDate);
        const dw = doc.widthOfString(dr);
        text(dr, PW - M - dw, 12);
        y = 52;
      }

      function newPage() {
        addFooter();
        doc.addPage({ size: 'LETTER', margin: 0 });
        pageNum++;
        addPageHeader();
      }

      function checkPage(needed = 40) {
        if (y + needed > PH - 50) newPage();
      }

      function sectionHeader(title) {
        checkPage(36);
        doc.fillColor(C.dark).rect(M, y, W, 22).fill();
        doc.fillColor(C.accent).rect(M, y, 4, 22).fill();
        doc.fillColor(C.accent).fontSize(8).font('Helvetica-Bold');
        text(title.toUpperCase(), M + 14, y + 7);
        y += 26;
      }

      function labelVal(label, value, x, w) {
        const bh = 32;
        checkPage(bh + 4);
        doc.fillColor(C.light).rect(x, y, w, bh).fill();
        doc.strokeColor(C.border).lineWidth(0.5).rect(x, y, w, bh).stroke();
        doc.fillColor(C.muted).fontSize(6.5).font('Helvetica-Bold');
        text(label.toUpperCase(), x + 8, y + 8);
        doc.fillColor(C.text).fontSize(9).font('Helvetica');
        text(String(value || '—'), x + 8, y + 20, { width: w - 16, lineBreak: false, ellipsis: true });
      }

      function textBlock(label, content) {
        if (!content) return;
        const lines = doc.fontSize(9).font('Helvetica').heightOfString(content, { width: W - 20 });
        const bh = Math.max(52, lines + 28);
        checkPage(bh + 10);
        doc.fillColor(C.light).rect(M, y, W, bh).fill();
        doc.strokeColor(C.border).lineWidth(0.5).rect(M, y, W, bh).stroke();
        doc.fillColor(C.muted).fontSize(6.5).font('Helvetica-Bold');
        text(label.toUpperCase(), M + 8, y + 8);
        doc.fillColor(C.text).fontSize(9).font('Helvetica');
        doc.text(content, M + 8, y + 20, { width: W - 16, lineBreak: true });
        y += bh + 8;
      }

      // ════════════════════════════════
      // PAGE 1 — COVER
      // ════════════════════════════════

      // Top bar
      doc.fillColor(C.dark).rect(0, 0, PW, 90).fill();
      doc.fillColor(C.accent).rect(0, 88, PW, 3).fill();

      // Logo (if provided as base64)
      if (data.logoBase64) {
        try {
          const logoBuffer = Buffer.from(data.logoBase64, 'base64');
          doc.image(logoBuffer, 14, 12, { width: 66, height: 66, fit: [66, 66] });
        } catch(e) { /* skip if logo fails */ }
      }

      // Title
      doc.fillColor(C.white).fontSize(22).font('Helvetica-Bold');
      text('DAILY FIELD REPORT', 92, 32);
      doc.fillColor(C.accent).fontSize(9).font('Helvetica');
      text('PLAYSAFE CONSTRUCTION INC', 92, 58);

      // Date box
      doc.fillColor('#1e3648').rect(PW - 156, 14, 116, 62).fill();
      doc.fillColor(C.muted).fontSize(7).font('Helvetica-Bold');
      const dlabel = 'REPORT DATE';
      const dlw = doc.widthOfString(dlabel);
      text(dlabel, PW - 156 + (116 - dlw) / 2, 26);
      doc.fillColor(C.accent).fontSize(11).font('Helvetica-Bold');
      const dval = formatDate(data.reportDate);
      const dvw = doc.widthOfString(dval);
      text(dval, PW - 156 + (116 - dvw) / 2, 42);
      if (data.dayNumber) {
        doc.fillColor(C.muted).fontSize(7.5).font('Helvetica');
        const ds = `Day ${data.dayNumber} of Project`;
        const dsw = doc.widthOfString(ds);
        text(ds, PW - 156 + (116 - dsw) / 2, 60);
      }

      y = 106;

      // ── 01 PROJECT INFO ──
      sectionHeader('01  Project Information');

      const col3 = W / 3;
      labelVal('Project Number', data.projectNumber, M, col3);
      labelVal('Project Name', data.projectName, M + col3, col3);
      labelVal('Report Date', formatDate(data.reportDate), M + col3 * 2, col3);
      y += 34;

      labelVal('Site Address / Location', data.siteAddress, M, col3 * 2);
      labelVal('Day # of Project', data.dayNumber || '—', M + col3 * 2, col3);
      y += 34;

      labelVal('Foreman / Report Prepared By', data.preparedBy, M, W);
      y += 38;

      // ── 02 WEATHER ──
      sectionHeader('02  Weather Conditions');

      const col3w = W / 3;
      labelVal('AM Temp', data.tempAM ? `${data.tempAM}°F` : '—', M, col3w);
      labelVal('PM Temp', data.tempPM ? `${data.tempPM}°F` : '—', M + col3w, col3w);
      labelVal('Wind Speed', data.windSpeed ? `${data.windSpeed} mph` : '—', M + col3w * 2, col3w);
      y += 34;

      if (data.weatherConditions && data.weatherConditions.length > 0) {
        labelVal('Sky Conditions', data.weatherConditions.join('  |  '), M, W);
        y += 34;
      }

      if (data.weatherNotes) textBlock('Weather Delays / Notes', data.weatherNotes);

      // ── 03 CREW ──
      checkPage(60);
      sectionHeader('03  Crew & Personnel');

      if (data.crewList && data.crewList.length > 0) {
        const cols = [W * 0.55, W * 0.45];
        const headers = ['Name', 'Role'];

        // Header row
        doc.fillColor(C.dark).rect(M, y, W, 20).fill();
        doc.fillColor(C.muted).fontSize(7).font('Helvetica-Bold');
        let rx = M;
        headers.forEach((h, i) => {
          text(h.toUpperCase(), rx + 6, y + 7);
          rx += cols[i];
        });
        y += 20;

        data.crewList.forEach((w, ri) => {
          checkPage(24);
          doc.fillColor(ri % 2 === 0 ? C.white : C.light).rect(M, y, W, 22).fill();
          doc.strokeColor(C.border).lineWidth(0.5).rect(M, y, W, 22).stroke();
          doc.fillColor(C.text).fontSize(8.5).font('Helvetica');
          rx = M;
          [w.name, w.role].forEach((val, i) => {
            text(String(val || ''), rx + 6, y + 7);
            rx += cols[i];
          });
          y += 22;
        });
        y += 6;
      } else {
        doc.fillColor(C.muted).fontSize(9).font('Helvetica');
        text('No crew entries recorded.', M + 8, y + 6); y += 24;
      }

      // ── 04 EQUIPMENT ──
      checkPage(60);
      sectionHeader('04  Equipment On-Site');

      if (data.equipList && data.equipList.length > 0) {
        const ecols = [W * 0.60, W * 0.40];
        const eheads = ['Equipment Description', 'Owner / Rental'];

        doc.fillColor(C.dark).rect(M, y, W, 20).fill();
        doc.fillColor(C.muted).fontSize(7).font('Helvetica-Bold');
        let ex = M;
        eheads.forEach((h, i) => { text(h.toUpperCase(), ex + 6, y + 7); ex += ecols[i]; });
        y += 20;

        data.equipList.forEach((eq, ri) => {
          checkPage(24);
          doc.fillColor(ri % 2 === 0 ? C.white : C.light).rect(M, y, W, 22).fill();
          doc.strokeColor(C.border).lineWidth(0.5).rect(M, y, W, 22).stroke();
          doc.fillColor(C.text).fontSize(8.5).font('Helvetica');
          ex = M;
          [eq.desc, eq.owner].forEach((val, i) => {
            text(String(val || ''), ex + 6, y + 7);
            ex += ecols[i];
          });
          y += 22;
        });
        y += 6;
      } else {
        doc.fillColor(C.muted).fontSize(9).font('Helvetica');
        text('No equipment entries recorded.', M + 8, y + 6); y += 24;
      }

      // ════════════════════════════════
      // PAGE 2 — WORK & DELAYS
      // ════════════════════════════════
      newPage();

      // ── 05 WORK PERFORMED ──
      sectionHeader('05  Work Performed Today');
      textBlock('Description of Work Performed', data.workDescription);
      textBlock('Materials Delivered / Used', data.materials);

      // ── 06 DELAYS & ISSUES ──
      sectionHeader('06  Delays & Issues');

      if (data.delays || data.issues) {
        const half = (W - 6) / 2;
        const dlHeight = data.delays
          ? doc.fontSize(9).font('Helvetica').heightOfString(data.delays, { width: half - 20 })
          : 0;
        const isHeight = data.issues
          ? doc.fontSize(9).font('Helvetica').heightOfString(data.issues, { width: half - 20 })
          : 0;
        const bh = Math.max(52, Math.max(dlHeight, isHeight) + 28);
        checkPage(bh + 10);

        if (data.delays) {
          doc.fillColor(C.amber).rect(M, y, half, bh).fill();
          doc.strokeColor(C.amberBorder).lineWidth(0.5).rect(M, y, half, bh).stroke();
          doc.fillColor(C.muted).fontSize(6.5).font('Helvetica-Bold');
          text('DELAYS', M + 8, y + 8);
          doc.fillColor(C.text).fontSize(9).font('Helvetica');
          doc.text(data.delays, M + 8, y + 20, { width: half - 16, lineBreak: true });
        }

        if (data.issues) {
          doc.fillColor(C.light).rect(M + half + 6, y, half, bh).fill();
          doc.strokeColor(C.border).lineWidth(0.5).rect(M + half + 6, y, half, bh).stroke();
          doc.fillColor(C.muted).fontSize(6.5).font('Helvetica-Bold');
          text('ISSUES / PROBLEMS', M + half + 14, y + 8);
          doc.fillColor(C.text).fontSize(9).font('Helvetica');
          doc.text(data.issues, M + half + 14, y + 20, { width: half - 16, lineBreak: true });
        }

        y += bh + 10;
      } else {
        doc.fillColor(C.muted).fontSize(9).font('Helvetica');
        text('No delays or issues recorded.', M + 8, y + 6); y += 24;
      }

      // ════════════════════════════════
      // PHOTO PAGES (up to 12 photos, 6 per page)
      // ════════════════════════════════
      if (data.images && data.images.length > 0) {
        const PHOTOS_PER_PAGE = 6;
        const imgW = (W - 12) / 2;
        const imgH = imgW * 0.65;

        for (let pi = 0; pi < data.images.length; pi += PHOTOS_PER_PAGE) {
          newPage();
          const pagePhotos = data.images.slice(pi, pi + PHOTOS_PER_PAGE);
          const pageIndex = Math.floor(pi / PHOTOS_PER_PAGE) + 1;
          const totalPages = Math.ceil(data.images.length / PHOTOS_PER_PAGE);
          const sectionTitle = totalPages > 1
            ? `07  Site Photos (${pageIndex} of ${totalPages})`
            : '07  Site Photos';

          sectionHeader(sectionTitle);

          let col = 0;
          let rowY = y;

          for (const img of pagePhotos) {
            const ix = col === 0 ? M : M + imgW + 12;

            // Photo background
            doc.fillColor(C.light).rect(ix, rowY, imgW, imgH).fill();
            doc.strokeColor(C.border).lineWidth(0.5).rect(ix, rowY, imgW, imgH).stroke();

            // Draw image
            if (img.dataUrl) {
              try {
                const base64Data = img.dataUrl.split(',')[1];
                const imgBuffer = Buffer.from(base64Data, 'base64');
                doc.image(imgBuffer, ix, rowY, { width: imgW, height: imgH, cover: [imgW, imgH] });
                doc.strokeColor(C.border).lineWidth(0.5).rect(ix, rowY, imgW, imgH).stroke();
              } catch(e) { /* skip bad image */ }
            }

            // Caption bar
            if (img.caption) {
              doc.fillColor('rgba(13,26,31,0.75)').rect(ix, rowY + imgH - 20, imgW, 20).fill();
              doc.fillColor('#dddddd').fontSize(7.5).font('Helvetica-Oblique');
              text(img.caption, ix + 6, rowY + imgH - 13, { width: imgW - 12, lineBreak: false, ellipsis: true });
            }

            col++;
            if (col === 2) {
              rowY += imgH + 12;
              col = 0;
            }
          }
          y = rowY + (col !== 0 ? imgH + 12 : 0);
        }
      }

      // ── FINALIZE ──
      addFooter();
      doc.end();

    } catch(err) {
      reject(err);
    }
  });
}

module.exports = { generatePDF };
