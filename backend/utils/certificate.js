// utils/certificate.js
//
// Generates a "Certificate of Appreciation" PDF for a completed donation.
// PDFKit builds a PDF by giving it drawing commands (like a canvas) -
// move to a position, draw text, draw a line, etc. - and streams the
// result out instead of saving a file to disk first.

const PDFDocument = require("pdfkit");

/**
 * Streams a certificate PDF directly to an HTTP response.
 * @param {object} res - the Express response object
 * @param {object} data - { donorName, bloodGroup, dateDonated, hospitalName, certificateId }
 */
function streamCertificate(res, data) {
  const doc = new PDFDocument({ layout: "landscape", size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="certificate-${data.certificateId}.pdf"`);

  doc.pipe(res);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const inset = 26;

  doc.rect(0, 0, pageWidth, pageHeight).fill("#f7f3ee");
  doc.lineWidth(4).strokeColor("#b91c3c").rect(inset, inset, pageWidth - inset * 2, pageHeight - inset * 2).stroke();
  doc.lineWidth(1).strokeColor("#146356").rect(inset + 10, inset + 10, pageWidth - (inset + 10) * 2, pageHeight - (inset + 10) * 2).stroke();

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#146356").text("LIFELINE CONNECT", 0, 66, { align: "center", characterSpacing: 2 });
  doc.font("Helvetica-Bold").fontSize(30).fillColor("#201c1a").text("Certificate of Appreciation", 0, 96, { align: "center" });
  doc.font("Helvetica").fontSize(13).fillColor("#55504b").text("Presented with gratitude to", 0, 153, { align: "center" });

  doc.font("Helvetica-Bold").fontSize(28).fillColor("#b91c3c").text(data.donorName, 85, 181, {
    align: "center",
    width: pageWidth - 170,
  });
  doc.lineWidth(1).strokeColor("#d8cfc2").moveTo(170, 222).lineTo(pageWidth - 170, 222).stroke();

  doc.font("Helvetica").fontSize(13).fillColor("#55504b").text(
    `In recognition of a generous ${data.bloodGroup} blood donation made on ${data.dateDonated} at ${data.hospitalName}.`,
    125,
    245,
    { align: "center", width: pageWidth - 250, lineGap: 5 }
  );
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#146356").text("Your generosity helps keep emergency care moving.", 0, 292, { align: "center" });

  doc.font("Helvetica").fontSize(9).fillColor("#8a847d").text(`Certificate ID: ${data.certificateId}`, 62, pageHeight - 74);
  doc.font("Helvetica").fontSize(9).fillColor("#8a847d").text("LifeLine Connect | Emergency Blood Donor & Volunteer Network", 0, pageHeight - 74, { align: "center" });
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#8a847d").text("Verified contribution", pageWidth - 160, pageHeight - 74, { align: "right" });

  doc.end();
}

module.exports = { streamCertificate };
