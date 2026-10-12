import excel from 'exceljs';
import { Readable } from 'stream';

// exceljs cells are not always strings: rich text, formulas, hyperlinks and
// dates all come back as objects. Without this, header keys turn into
// "[object Object]" and values serialise as garbage.
const cellToString = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();

  if (typeof value === 'object') {
    // Formula cells -> { formula, result }
    if ('result' in value) return cellToString(value.result);
    // Hyperlink cells -> { text, hyperlink }
    if ('text' in value) return cellToString(value.text);
    // Rich text -> { richText: [{ text }, ...] }
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }
    if ('error' in value) return '';
  }

  return String(value);
};

// Values found in columns with no header, kept under a symbol-like key so it
// can never collide with a real column name.
export const EXTRA_CELLS = "__extraCells";

// Turn a worksheet into an array of objects keyed by the header row.
const worksheetToObjects = (worksheet) => {
  const data = [];
  const headerRow = worksheet.getRow(1);

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row

    const rowData = {};
    row.eachCell((cell, colNumber) => {
      const header = cellToString(headerRow.getCell(colNumber).value).trim();
      const value = cellToString(cell.value).trim();

      // Cells past the last header. A hand-written CSV line like
      //   Size,2 inch,3 inch,4 inch
      // spills into unnamed columns; dropping them silently loses data.
      // Stash them so a consumer can decide what to do.
      if (!header) {
        if (value) (rowData[EXTRA_CELLS] ||= []).push(value);
        return;
      }

      // Repeated headers (e.g. three "Feature" columns) used to overwrite each
      // other, silently keeping only the last. Join them instead - consumers
      // that treat a cell as a list split on commas anyway.
      if (rowData[header]) {
        rowData[header] = value ? `${rowData[header]},${value}` : rowData[header];
      } else {
        rowData[header] = value;
      }
    });

    // eachCell skips empty cells, so a row of blanks yields {} - drop it.
    if (Object.keys(rowData).length > 0) data.push(rowData);
  });

  return data;
};

const isCsv = (source = '') => {
  const s = String(source).toLowerCase();
  return s.includes('csv') || s.endsWith('.csv') || s === 'text/plain';
};

/**
 * Parse an uploaded spreadsheet buffer into an array of row objects.
 * Handles both CSV and XLSX - exceljs reads CSV natively, so this needs no
 * extra dependency.
 *
 * @param {Buffer} buffer   the uploaded file
 * @param {string} source   mimetype or original filename, used to pick a reader
 */
export const parseSpreadsheet = async (buffer, source = '') => {
  const workbook = new excel.Workbook();

  if (isCsv(source)) {
    const worksheet = await workbook.csv.read(Readable.from(buffer));
    return worksheetToObjects(worksheet);
  }

  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  return worksheetToObjects(worksheet);
};

export const generateExcel = async (data, sheetName) => {
  const workbook = new excel.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Add headers
  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);

    // Add data rows
    data.forEach(item => {
      const row = headers.map(header => item[header]);
      worksheet.addRow(row);
    });
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};
