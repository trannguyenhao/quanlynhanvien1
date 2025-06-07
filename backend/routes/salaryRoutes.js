const express = require('express');
const router = express.Router();
const { calculateSalary, getSalaries, exportSalariesToExcel } = require('../controllers/salaryController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.post('/', authMiddleware, roleMiddleware(['admin']), calculateSalary);
router.get('/', authMiddleware, roleMiddleware(['admin']), getSalaries);
router.get('/export', authMiddleware, roleMiddleware(['admin']), exportSalariesToExcel);

module.exports = router;