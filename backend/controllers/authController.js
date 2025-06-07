const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { poolPromise, sql } = require('../config/db');

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE username = @username');

    const user = result.recordset[0];
    if (!user) return res.status(400).json({ message: 'Tài khoản không tồn tại' });

    // So sánh trực tiếp mật khẩu plain text
    if (password !== user.password_hash) return res.status(400).json({ message: 'Mật khẩu không đúng' });

    const token = jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, role: user.role });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.user_id;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('user_id', sql.Int, userId)
      .query('SELECT password_hash FROM Users WHERE user_id = @user_id');

    const user = result.recordset[0];
    if (!user) return res.status(400).json({ message: 'Tài khoản không tồn tại' });

    // So sánh trực tiếp mật khẩu plain text
    if (oldPassword !== user.password_hash) return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });

    // Lưu mật khẩu mới trực tiếp dưới dạng plain text
    await pool.request()
      .input('user_id', sql.Int, userId)
      .input('password_hash', sql.NVarChar, newPassword)
      .query('UPDATE Users SET password_hash = @password_hash WHERE user_id = @user_id');

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};