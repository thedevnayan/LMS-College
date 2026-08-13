const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const moduleController = require('../controllers/moduleController');

// Allow merging params so we can access courseId from nested route: /api/courses/:courseId/modules
const router = express.Router({ mergeParams: true });

router.use(protect);

router.route('/')
  .get(moduleController.getModules)
  .post(
    authorize('professor'), 
    validate([
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('order').isNumeric().withMessage('Order must be a number'),
    ]),
    moduleController.createModule
  );

router.patch('/reorder', authorize('professor'), moduleController.reorderModules);

router.route('/:id')
  .get(moduleController.getModuleById)
  .patch(authorize('professor'), moduleController.updateModule)
  .delete(authorize('professor'), moduleController.deleteModule);

module.exports = router;
