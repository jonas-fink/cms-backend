import { Router } from 'express';
import { protect, adminOnly } from '#middlewares';
import { validateBody } from '#middlewares';
import {
    getUploadUrl,
    confirmUpload,
    deleteDocument,
    getAllDocuments,
} from '#controllers';
import { uploadUrlSchema } from '#schemas';

const router = Router();

router.get('/', protect, adminOnly, getAllDocuments);
router.post(
    '/upload-url',
    protect,
    validateBody(uploadUrlSchema),
    getUploadUrl,
);
router.patch('/:id/confirm', protect, confirmUpload);
router.delete('/:id', protect, deleteDocument);

export default router;
