import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const generateInvoice = async (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });

      // Set up the buffers to store the PDF
      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Register fonts (for currency symbols like ₦)
      registerFonts(doc);

      // Invoice header
      generateHeader(doc, order);

      // Customer information
      generateCustomerInformation(doc, order);

      // Invoice table
      generateInvoiceTable(doc, order);

      // Footer
      generateFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

function registerFonts(doc) {
  const regularCandidates = [
    path.resolve(process.cwd(), "public", "fonts", "DejaVuSans.ttf"),
    path.resolve(process.cwd(), "../frontend/public/DejaVuSans.ttf"),
    path.resolve(process.cwd(), "../frontend/public/fonts/DejaVuSans.ttf"),
    path.resolve(process.cwd(), "../frontend/public/Roboto-Regular.ttf"),
    path.resolve(process.cwd(), "../frontend/public/fonts/Roboto-Regular.ttf"),
    path.resolve(process.cwd(), "public", "DejaVuSans.ttf"),
  ];
  const boldCandidates = [
    path.resolve(process.cwd(), "public", "fonts", "DejaVuSans-Bold.ttf"),
    path.resolve(process.cwd(), "../frontend/public/DejaVuSans-Bold.ttf"),
    path.resolve(process.cwd(), "../frontend/public/fonts/DejaVuSans-Bold.ttf"),
    path.resolve(process.cwd(), "../frontend/public/Roboto-Bold.ttf"),
    path.resolve(process.cwd(), "../frontend/public/fonts/Roboto-Bold.ttf"),
    path.resolve(process.cwd(), "public", "DejaVuSans-Bold.ttf"),
  ];
  for (const p of regularCandidates) {
    try {
      if (fs.existsSync(p)) {
        doc.registerFont("Body", p);
        break;
      }
    } catch (_) {}
  }
  for (const p of boldCandidates) {
    try {
      if (fs.existsSync(p)) {
        doc.registerFont("Body-Bold", p);
        break;
      }
    } catch (_) {}
  }
}

const generateHeader = (doc, order) => {
  const companyName = process.env.COMPANY_NAME || "Chike";

  // Try to load a logo from common locations (PNG/JPG recommended)
  const candidatePaths = [
    path.resolve(process.cwd(), "public", "logo.png"),
    path.resolve(process.cwd(), "public", "chikelogo.png"),
    path.resolve(process.cwd(), "../frontend/public/chikelogo.png"),
    path.resolve(process.cwd(), "../frontend/public/logo.png"),
    path.resolve(process.cwd(), "../frontend/public/chikelogo.jpg"),
    path.resolve(process.cwd(), "public", "logo.jpg"),
  ];

  let logoPath = null;
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        logoPath = p;
        break;
      }
    } catch (_) {}
  }

  // Draw logo if found
  if (logoPath) {
    try {
      doc.image(logoPath, 50, 40, { width: 90 });
    } catch (_) {}
  }

  // Company name (top-left, next to logo)
  // doc.fillColor("#111111").fontSize(18).text(companyName, 150, 50);

  // Invoice meta (top-right)
  doc
    .fillColor("#444444")
    .fontSize(20)
    .text("INVOICE", 50, 50, { align: "right" })
    .fontSize(10)
    .text(`Invoice No. ${order._id}`, 50, 70, { align: "right" })
    .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, 85, {
      align: "right",
    })
    .moveDown();
};

const generateCustomerInformation = (doc, order) => {
  doc
    .fillColor("#444444")
    .fontSize(20)
    .text("Bill To:", 50, 120)
    .fontSize(10)
    .text(order.user.name, 50, 140)
    .text(order.shippingAddress.street, 50, 155)

    .moveDown();
};

const generateInvoiceTable = (doc, order) => {
  let i;
  const invoiceTableTop = 250;

  try {
    doc.font("Body-Bold");
  } catch (_) {
    doc.font("Helvetica-Bold");
  }
  generateTableRow(
    doc,
    invoiceTableTop,
    "Item",
    "Unit Price",
    "Quantity",
    "Line Total"
  );
  generateHr(doc, invoiceTableTop + 20);
  try {
    doc.font("Body");
  } catch (_) {
    doc.font("Helvetica");
  }

  for (i = 0; i < order.orderItems.length; i++) {
    const item = order.orderItems[i];
    const position = invoiceTableTop + (i + 1) * 30;
    generateTableRow(
      doc,
      position,
      item.product.name,
      formatCurrency(item.price),
      item.quantity,
      formatCurrency(item.price * item.quantity)
    );

    generateHr(doc, position + 20);
  }

  const subtotalPosition = invoiceTableTop + (i + 1) * 30;
  generateTableRow(
    doc,
    subtotalPosition,
    "",
    "Subtotal",
    "",
    formatCurrency(order.totalPrice - order.taxPrice - order.shippingPrice)
  );

  const taxPosition = subtotalPosition + 20;
  generateTableRow(
    doc,
    taxPosition,
    "",
    "Tax",
    "",
    formatCurrency(order.taxPrice)
  );

  const shippingPosition = taxPosition + 20;
  generateTableRow(
    doc,
    shippingPosition,
    "",
    "Shipping",
    "",
    formatCurrency(order.shippingPrice)
  );

  const totalPosition = shippingPosition + 20;
  try {
    doc.font("Body-Bold");
  } catch (_) {
    doc.font("Helvetica-Bold");
  }
  generateTableRow(
    doc,
    totalPosition,
    "",
    "Total",
    "",
    formatCurrency(order.totalPrice)
  );
  try {
    doc.font("Body");
  } catch (_) {
    doc.font("Helvetica");
  }
};

const generateFooter = (doc) => {
  doc.fontSize(10).text("Thank you for your business.", 50, 700, {
    align: "center",
    width: 500,
  });
};

const generateTableRow = (doc, y, item, unitPrice, quantity, lineTotal) => {
  doc
    .fontSize(10)
    .text(item, 50, y)
    .text(unitPrice, 280, y, { width: 90, align: "right" })
    .text(quantity, 370, y, { width: 90, align: "right" })
    .text(lineTotal, 0, y, { align: "right" });
};

const generateHr = (doc, y) => {
  doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
};

const formatCurrency = (amount) => {
  return `₦${amount.toFixed(2)}`;
};

// module.exports = generateInvoice;
export default generateInvoice;
