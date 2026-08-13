const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const materialController = require('../controllers/materialController');

const router = express.Router({ mergeParams: true });

router.use(protect);

router.route('/')
  .get(materialController.getMaterials)
  .post(
    authorize('professor'),
    validate([
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('type').isIn(['pdf', 'video', 'text', 'link', 'presentation']).withMessage('Invalid type'),
      body('order').isNumeric().withMessage('Order must be a number'),
    ]),
    materialController.createMaterial
  );

router.route('/:id')
  .get(materialController.getMaterialById)
  .patch(authorize('professor'), materialController.updateMaterial)
  .delete(authorize('professor'), materialController.deleteMaterial);

router.post('/:id/progress', authorize('student'), materialController.markProgress);

module.exports = router;
