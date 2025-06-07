const express = require('express');
const router = express.Router();
const {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  exportEmployeesToExcel, importEmployeesFromExcel
} = require('../controllers/employeeController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', authMiddleware, getEmployees);
router.post('/', authMiddleware, roleMiddleware(['admin']), createEmployee);
router.put('/:employee_id', authMiddleware, roleMiddleware(['admin']), updateEmployee);
router.delete('/:user_id', authMiddleware, roleMiddleware(['admin']), deleteEmployee);
router.get('/export', authMiddleware, exportEmployeesToExcel);
router.post('/import', authMiddleware, roleMiddleware(['admin']), upload.single('file'), importEmployeesFromExcel);

module.exports = router;