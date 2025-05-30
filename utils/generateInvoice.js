// const PDFDocument = require('pdfkit');
// const fs = require('fs');
// const path = require('path');
// import PDFDocument from 'pdfkit';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import path from 'path';

const generateInvoice = async (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      // Set up the buffers to store the PDF
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

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

const generateHeader = (doc, order) => {
  doc
    .fillColor('#444444')
    .fontSize(20)
    .text('INVOICE', 50, 50, { align: 'right' })
    .fontSize(10)
    .text(`Invoice No. ${order._id}`, 50, 70, { align: 'right' })
    .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, 85, { align: 'right' })
    .moveDown();
};

const generateCustomerInformation = (doc, order) => {
  doc
    .fillColor('#444444')
    .fontSize(20)
    .text('Bill To:', 50, 120)
    .fontSize(10)
    .text(order.user.name, 50, 140)
    .text(order.shippingAddress.street, 50, 155)
    .text(
      `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}`,
      50,
      170
    )
    .text(order.shippingAddress.country, 50, 185)
    .moveDown();
};

const generateInvoiceTable = (doc, order) => {
  let i;
  const invoiceTableTop = 250;

  doc.font('Helvetica-Bold');
  generateTableRow(
    doc,
    invoiceTableTop,
    'Item',
    'Unit Price',
    'Quantity',
    'Line Total'
  );
  generateHr(doc, invoiceTableTop + 20);
  doc.font('Helvetica');

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
    '',
    'Subtotal',
    '',
    formatCurrency(order.totalPrice - order.taxPrice - order.shippingPrice)
  );

  const taxPosition = subtotalPosition + 20;
  generateTableRow(
    doc,
    taxPosition,
    '',
    'Tax',
    '',
    formatCurrency(order.taxPrice)
  );

  const shippingPosition = taxPosition + 20;
  generateTableRow(
    doc,
    shippingPosition,
    '',
    'Shipping',
    '',
    formatCurrency(order.shippingPrice)
  );

  const totalPosition = shippingPosition + 20;
  doc.font('Helvetica-Bold');
  generateTableRow(
    doc,
    totalPosition,
    '',
    'Total',
    '',
    formatCurrency(order.totalPrice)
  );
  doc.font('Helvetica');
};

const generateFooter = (doc) => {
  doc
    .fontSize(10)
    .text('Thank you for your business.', 50, 700, {
      align: 'center',
      width: 500,
    });
};

const generateTableRow = (doc, y, item, unitPrice, quantity, lineTotal) => {
  doc
    .fontSize(10)
    .text(item, 50, y)
    .text(unitPrice, 280, y, { width: 90, align: 'right' })
    .text(quantity, 370, y, { width: 90, align: 'right' })
    .text(lineTotal, 0, y, { align: 'right' });
};

const generateHr = (doc, y) => {
  doc
    .strokeColor('#aaaaaa')
    .lineWidth(1)
    .moveTo(50, y)
    .lineTo(550, y)
    .stroke();
};

const formatCurrency = (amount) => {
  return `$${amount.toFixed(2)}`;
};

// module.exports = generateInvoice;
export default generateInvoice;