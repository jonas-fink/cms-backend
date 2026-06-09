import { z } from 'zod';
import { NOTIFICATION_TYPES } from '#models';

export const listNotificationsQuerySchema = z.object({
    read: z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => (v === undefined ? undefined : v === 'true')),
    type: z.enum(NOTIFICATION_TYPES as [string, ...string[]]).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListNotificationsQuery = z.infer<
    typeof listNotificationsQuerySchema
>;
