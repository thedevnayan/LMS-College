const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const materialController = require('../controllers/materialController');
const { upload } = require('../utils/upload');

const router = express.Router({ mergeParams: true });

router.use(protect);

router.route('/')
  .get((req, res, next) => {
    if (req.params.classroomId) {
      return materialController.getMaterials(req, res, next);
    }
    return materialController.getAllMaterialsForProfessor(req, res, next);
  })
  .post(
    authorize('professor'),
    upload.single('file'), // Handle file upload
    validate([
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('topic').trim().notEmpty().withMessage('Topic is required'),
      body('type').isIn(['pdf', 'video', 'text', 'link', 'presentation']).withMessage('Valid material type is required'),
    ]),
    materialController.createMaterial
  );

router.route('/:id')
  .get(materialController.getMaterialById)
  .patch(
    authorize('professor'), 
    upload.single('file'), 
    materialController.updateMaterial
  )
  .delete(authorize('professor'), materialController.deleteMaterial);

module.exports = router;
