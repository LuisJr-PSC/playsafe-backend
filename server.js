const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const { generatePDF } = require('./pdf-generator');

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

// ── MIDDLEWARE ──
app.use(cors());
app.use(express.json({ limit: '50mb' })); // generous limit for images

// ── HEALTH CHECK ──
app.get('/', (req, res) => {
  res.json({ status: 'PlaySafe Field Report Server is running.' });
});

// ── SUBMIT REPORT ──
app.post('/submit-report', async (req, res) => {
  try {
    const data = req.body;

    // Validate required fields
    if (!data.projectNumber || !data.projectName || !data.reportDate || !data.preparedBy) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Generate the PDF
    const pdfBuffer = await generatePDF(data);

    // Build a clean filename
    const safe = str => (str || '').replace(/[^a-zA-Z0-9\-_]/g, '_');
    const filename = `${safe(data.projectNumber)}_${safe(data.projectName)}_FieldReport_${data.reportDate}.pdf`;

    // Build email recipients
    const recipients = (process.env.REPORT_RECIPIENTS || process.env.REPORT_EMAIL || '')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      return res.status(500).json({ error: 'No recipient email configured on server.' });
    }

    // Build weather summary string
    const weatherParts = [
      data.tempAM ? `AM: ${data.tempAM}°F` : '',
      data.tempPM ? `PM: ${data.tempPM}°F` : '',
      data.windSpeed ? `Wind: ${data.windSpeed} mph` : '',
      (data.weatherConditions || []).join(', ')
    ].filter(Boolean);
    const weatherStr = weatherParts.join('  ·  ') || '—';

    // Build HTML email body
    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f7f8;font-family:Arial,sans-serif;">
  <div style="max-width:620px;margin:24px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#0d1a1f;padding:28px 32px;display:flex;align-items:center;">
      <div>
        <div style="color:#5ab5d4;font-size:20px;font-weight:700;letter-spacing:1px;">DAILY FIELD REPORT</div>
        <div style="color:#5ab5d4;font-size:11px;letter-spacing:2px;margin-top:4px;">PLAYSAFE CONSTRUCTION INC</div>
      </div>
      <div style="margin-left:auto;background:#1e3648;padding:10px 18px;border-radius:4px;text-align:center;">
        <div style="color:#5a8a9a;font-size:9px;letter-spacing:1px;text-transform:uppercase;">Report Date</div>
        <div style="color:#5ab5d4;font-size:13px;font-weight:700;margin-top:4px;">${data.reportDate}</div>
        ${data.dayNumber ? `<div style="color:#5a8a9a;font-size:10px;margin-top:2px;">Day ${data.dayNumber} of Project</div>` : ''}
      </div>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">

      <!-- Project Info -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:8px 12px;background:#ebf5f8;width:150px;font-size:11px;font-weight:700;color:#5a8a9a;text-transform:uppercase;letter-spacing:1px;border:1px solid #c8dce4;">Project #</td>
          <td style="padding:8px 12px;background:#fff;font-size:13px;color:#1e3238;border:1px solid #c8dce4;">${data.projectNumber}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#ebf5f8;font-size:11px;font-weight:700;color:#5a8a9a;text-transform:uppercase;letter-spacing:1px;border:1px solid #c8dce4;">Project Name</td>
          <td style="padding:8px 12px;background:#fff;font-size:13px;color:#1e3238;border:1px solid #c8dce4;">${data.projectName}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#ebf5f8;font-size:11px;font-weight:700;color:#5a8a9a;text-transform:uppercase;letter-spacing:1px;border:1px solid #c8dce4;">Site Address</td>
          <td style="padding:8px 12px;background:#fff;font-size:13px;color:#1e3238;border:1px solid #c8dce4;">${data.siteAddress || '—'}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#ebf5f8;font-size:11px;font-weight:700;color:#5a8a9a;text-transform:uppercase;letter-spacing:1px;border:1px solid #c8dce4;">Foreman</td>
          <td style="padding:8px 12px;background:#fff;font-size:13px;color:#1e3238;border:1px solid #c8dce4;">${data.preparedBy}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#ebf5f8;font-size:11px;font-weight:700;color:#5a8a9a;text-transform:uppercase;letter-spacing:1px;border:1px solid #c8dce4;">Submitted</td>
          <td style="padding:8px 12px;background:#fff;font-size:13px;color:#1e3238;border:1px solid #c8dce4;">${data.submittedAt || new Date().toLocaleString()}</td>
        </tr>
      </table>

      <!-- Weather -->
      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#5ab5d4;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #ebf5f8;padding-bottom:6px;margin-bottom:10px;">Weather</div>
        <p style="margin:0;font-size:13px;color:#1e3238;">${weatherStr}</p>
        ${data.weatherNotes ? `<p style="margin:6px 0 0;font-size:12px;color:#5a8a9a;font-style:italic;">${data.weatherNotes}</p>` : ''}
      </div>

      <!-- Crew -->
      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#5ab5d4;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #ebf5f8;padding-bottom:6px;margin-bottom:10px;">Crew on Site</div>
        <p style="margin:0;font-size:13px;color:#1e3238;">${data.crew || '—'}</p>
      </div>

      <!-- Equipment -->
      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#5ab5d4;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #ebf5f8;padding-bottom:6px;margin-bottom:10px;">Equipment on Site</div>
        <p style="margin:0;font-size:13px;color:#1e3238;">${data.equipment || '—'}</p>
      </div>

      <!-- Work Performed -->
      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#5ab5d4;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #ebf5f8;padding-bottom:6px;margin-bottom:10px;">Work Performed</div>
        <p style="margin:0;font-size:13px;color:#1e3238;line-height:1.6;">${data.workDescription || '—'}</p>
      </div>

      <!-- Materials -->
      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#5ab5d4;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #ebf5f8;padding-bottom:6px;margin-bottom:10px;">Materials Delivered / Used</div>
        <p style="margin:0;font-size:13px;color:#1e3238;line-height:1.6;">${data.materials || '—'}</p>
      </div>

      <!-- Delays & Issues -->
      <div style="display:flex;gap:16px;margin-bottom:20px;">
        <div style="flex:1;background:#fff8eb;border:1px solid #dcb978;padding:12px 14px;border-radius:4px;">
          <div style="font-size:11px;font-weight:700;color:#a07820;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Delays</div>
          <p style="margin:0;font-size:12px;color:#1e3238;line-height:1.5;">${data.delays || 'None'}</p>
        </div>
        <div style="flex:1;background:#ebf5f8;border:1px solid #c8dce4;padding:12px 14px;border-radius:4px;">
          <div style="font-size:11px;font-weight:700;color:#5a8a9a;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Issues</div>
          <p style="margin:0;font-size:12px;color:#1e3238;line-height:1.5;">${data.issues || 'None'}</p>
        </div>
      </div>

      <!-- Photo count note -->
      <div style="background:#ebf5f8;border:1px solid #c8dce4;padding:10px 14px;border-radius:4px;font-size:12px;color:#5a8a9a;">
        📎 <strong style="color:#1e3238;">${data.photoCount || 0} site photo(s)</strong> attached in the PDF report below.
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#0d1a1f;padding:16px 32px;text-align:center;">
      <p style="margin:0;color:#5a8a9a;font-size:11px;">PlaySafe Construction Inc — Daily Field Report System</p>
    </div>

  </div>
</body>
</html>`;

    // Send via Resend with PDF attached
    const { error: sendError } = await resend.emails.send({
      from: 'PlaySafe Field Reports <reports@yourdomain.com>',
      to: recipients,
      subject: `Daily Field Report — ${data.projectName} — ${data.reportDate}`,
      html: emailHtml,
      attachments: [
        {
          filename,
          content: pdfBuffer.toString('base64'),
        }
      ]
    });

    if (sendError) {
      console.error('Resend error:', sendError);
      return res.status(500).json({ error: 'Email send failed: ' + sendError.message });
    }

    res.json({ success: true, message: 'Report submitted and emailed successfully.' });

  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ── START ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PlaySafe Field Report Server running on port ${PORT}`);
});
