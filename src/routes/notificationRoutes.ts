import { Router } from 'express';
import { protect, validateQuery } from '#middlewares';
import {
    listNotifications,
    getUnreadCount,
    markRead,
    markAllRead,
    deleteNotification,
} from '#controllers';
import { listNotificationsQuerySchema } from '#schemas';

const router = Router();

router.use(protect);

router.get(
    '/',
    validateQuery(listNotificationsQuerySchema),
    listNotifications,
);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
router.delete('/:id', deleteNotification);

export default router;
