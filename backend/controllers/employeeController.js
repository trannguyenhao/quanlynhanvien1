const { poolPromise, sql } = require('../config/db');
const ExcelJS = require('exceljs');

exports.getEmployees = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT e.*, u.username 
      FROM Employees e 
      JOIN Users u ON e.user_id = u.user_id
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.createEmployee = async (req, res) => {
  const {
    username, password, full_name, gender, dob, phone, email, address,
    position, base_salary, allowance, deduction
  } = req.body;
  const created_by = req.user.user_id;

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('username', sql.NVarChar, username)
      .input('password_hash', sql.NVarChar, password) // Lưu mật khẩu trực tiếp
      .input('full_name', sql.NVarChar, full_name)
      .input('gender', sql.NVarChar, gender)
      .input('dob', sql.Date, dob)
      .input('phone', sql.NVarChar, phone)
      .input('email', sql.NVarChar, email)
      .input('address', sql.NVarChar, address)
      .input('position', sql.NVarChar, position)
      .input('base_salary', sql.Decimal(18, 2), base_salary)
      .input('allowance', sql.Decimal(18, 2), allowance)
      .input('deduction', sql.Decimal(18, 2), deduction)
      .input('created_by', sql.Int, created_by)
      .execute('sp_CreateEmployeeWithAccount');

    res.json({ message: 'Thêm nhân viên thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.updateEmployee = async (req, res) => {
  const { employee_id } = req.params;
  const {
    username, password, full_name, gender, dob, phone, email, address,
    position, base_salary, allowance, deduction, status
  } = req.body;

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('employee_id', sql.Int, employee_id)
      .input('username', sql.NVarChar, username)
      .input('password_hash', sql.NVarChar, password) // Lưu mật khẩu trực tiếp
      .input('full_name', sql.NVarChar, full_name)
      .input('gender', sql.NVarChar, gender)
      .input('dob', sql.Date, dob)
      .input('phone', sql.NVarChar, phone)
      .input('email', sql.NVarChar, email)
      .input('address', sql.NVarChar, address)
      .input('position', sql.NVarChar, position)
      .input('base_salary', sql.Decimal(18, 2), base_salary)
      .input('allowance', sql.Decimal(18, 2), allowance)
      .input('deduction', sql.Decimal(18, 2), deduction)
      .input('status', sql.NVarChar, status)
      .execute('sp_UpdateEmployeeWithAccount');

    res.json({ message: 'Cập nhật nhân viên thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.deleteEmployee = async (req, res) => {
  const { user_id } = req.params;

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('user_id', sql.Int, user_id)
      .execute('sp_DeleteUserWithEmployeeAndSalary');

    res.json({ message: 'Xóa nhân viên thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.exportEmployeesToExcel = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT e.*, u.username 
      FROM Employees e 
      JOIN Users u ON e.user_id = u.user_id
    `);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employees');

    worksheet.columns = [
      { header: 'ID', key: 'employee_id', width: 10 },
      { header: 'Tên đăng nhập', key: 'username', width: 20 },
      { header: 'Họ tên', key: 'full_name', width: 20 },
      { header: 'Giới tính', key: 'gender', width: 15 },
      { header: 'Ngày sinh', key: 'dob', width: 15 },
      { header: 'Số điện thoại', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 20 },
      { header: 'Địa chỉ', key: 'address', width: 30 },
      { header: 'Vị trí', key: 'position', width: 20 },
      { header: 'Lương cơ bản', key: 'base_salary', width: 15 },
      { header: 'Phụ cấp', key: 'allowance', width: 15 },
      { header: 'Khấu trừ', key: 'deduction', width: 15 },
      { header: 'Trạng thái', key: 'status', width: 15 },
    ];

    worksheet.addRows(result.recordset);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=employees.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.importEmployeesFromExcel = async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: 'Vui lòng tải lên file Excel' });

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const worksheet = workbook.getWorksheet(1);
    const pool = await poolPromise;

    worksheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
      if (rowNumber === 1) return; // Bỏ qua dòng tiêu đề
      const [_, username, full_name, gender, dob, phone, email, address, position, base_salary, allowance, deduction, status] = row.values;

      const hashedPassword = await bcrypt.hash('default123', 10); // Mật khẩu mặc định
      await pool.request()
        .input('username', sql.NVarChar, username)
        .input('password_hash', sql.NVarChar, hashedPassword)
        .input('full_name', sql.NVarChar, full_name)
        .input('gender', sql.NVarChar, gender)
        .input('dob', sql.Date, dob)
        .input('phone', sql.NVarChar, phone)
        .input('email', sql.NVarChar, email)
        .input('address', sql.NVarChar, address)
        .input('position', sql.NVarChar, position)
        .input('base_salary', sql.Decimal(18, 2), base_salary)
        .input('allowance', sql.Decimal(18, 2), allowance)
        .input('deduction', sql.Decimal(18, 2), deduction)
        .input('created_by', sql.Int, req.user.user_id)
        .execute('sp_CreateEmployeeWithAccount');
    });

    res.json({ message: 'Nhập nhân viên từ Excel thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};