const { poolPromise, sql } = require('../config/db');
const ExcelJS = require('exceljs');

exports.calculateSalary = async (req, res) => {
  const { employee_id, month, year } = req.body;

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('employee_id', sql.Int, employee_id)
      .input('month', sql.Int, month)
      .input('year', sql.Int, year)
      .execute('sp_CalculateSalary');

    res.json({ message: 'Tính lương thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.getSalaries = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT s.*, e.full_name 
      FROM Salaries s 
      JOIN Employees e ON s.employee_id = e.employee_id
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.exportSalariesToExcel = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT s.*, e.full_name 
      FROM Salaries s 
      JOIN Employees e ON s.employee_id = e.employee_id
    `);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Salaries');

    worksheet.columns = [
      { header: 'ID', key: 'salary_id', width: 10 },
      { header: 'Họ tên', key: 'full_name', width: 20 },
      { header: 'Tháng', key: 'month', width: 10 },
      { header: 'Năm', key: 'year', width: 10 },
      { header: 'Lương cơ bản', key: 'base_salary', width: 15 },
      { header: 'Phụ cấp', key: 'allowance', width: 15 },
      { header: 'Khấu trừ', key: 'deduction', width: 15 },
      { header: 'Tổng lương', key: 'total_salary', width: 15 },
    ];

    worksheet.addRows(result.recordset);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=salaries.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};