import { Router } from 'express';
import { protect, validateBody, validateQuery } from '#middlewares';
import {
    listCalendarEvents,
    createCalendarEvent,
    getCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    respondCalendarEvent,
} from '#controllers';
import {
    createCalendarEventSchema,
    updateCalendarEventSchema,
    listCalendarEventsQuerySchema,
    respondCalendarEventSchema,
} from '#schemas';

const router = Router();

router.use(protect);

router.get(
    '/',
    validateQuery(listCalendarEventsQuerySchema),
    listCalendarEvents,
);
router.post('/', validateBody(createCalendarEventSchema), createCalendarEvent);

router.get('/:id', getCalendarEvent);
router.patch(
    '/:id',
    validateBody(updateCalendarEventSchema),
    updateCalendarEvent,
);
router.delete('/:id', deleteCalendarEvent);

router.post(
    '/:id/respond',
    validateBody(respondCalendarEventSchema),
    respondCalendarEvent,
);

export default router;
