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

  // Decorative border
  doc
    .lineWidth(3)
    .strokeColor("#b91c3c")
    .rect(24, 24, pageWidth - 48, doc.page.height - 48)
    .stroke();

  doc
    .fontSize(12)
    .fillColor("#146356")
    .font("Helvetica-Bold")
    .text("LIFELINE CONNECT", 0, 70, { align: "center" });

  doc
    .fontSize(30)
    .fillColor("#201c1a")
    .font("Helvetica-Bold")
    .text("Certificate of Appreciation", 0, 100, { align: "center" });

  doc
    .fontSize(14)
    .fillColor("#55504b")
    .font("Helvetica")
    .text("This certificate is proudly presented to", 0, 160, { align: "center" });

  doc
    .fontSize(26)
    .fillColor("#b91c3c")
    .font("Helvetica-Bold")
    .text(data.donorName, 0, 190, { align: "center" });

  doc
    .fontSize(13)
    .fillColor("#55504b")
    .font("Helvetica")
    .text(
      `for generously donating ${data.bloodGroup} blood on ${data.dateDonated} at ${data.hospitalName}, ` +
        `directly contributing to saving a life.`,
      120,
      230,
      { align: "center", width: pageWidth - 240 }
    );

  doc
    .fontSize(10)
    .fillColor("#8a847d")
    .text(`Certificate ID: ${data.certificateId}`, 0, doc.page.height - 90, { align: "center" });

  doc
    .fontSize(10)
    .fillColor("#8a847d")
    .text("Issued by LifeLine Connect — Emergency Blood Donor & Volunteer Network", 0, doc.page.height - 75, {
      align: "center",
    });

  doc.end();
}

module.exports = { streamCertificate };
