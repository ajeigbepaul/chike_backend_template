import excel from 'exceljs';

export const parseExcel = async (buffer) => {
  const workbook = new excel.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  const data = [];
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row
    
    const rowData = {};
    row.eachCell((cell, colNumber) => {
      rowData[worksheet.getRow(1).getCell(colNumber).value] = cell.value;
    });
    
    data.push(rowData);
  });
  
  return data;
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