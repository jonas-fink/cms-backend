import { Router } from 'express';
import { protect } from '#middlewares';
import { validateBody } from '#middlewares';
import { getUploadUrl, confirmUpload, deleteDocument } from '#controllers';
import { uploadUrlSchema } from '#schemas';

const router = Router();

router.post(
    '/upload-url',
    protect,
    validateBody(uploadUrlSchema),
    getUploadUrl,
);
router.patch('/:id/confirm', protect, confirmUpload);
router.delete('/:id', protect, deleteDocument);

export default router;
