import { z } from 'zod';
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Ungültige ID');

export const calendarEventTypeSchema = z.enum([
    'team_meeting',
    'koordination',
    'sonstiges',
    'urlaub',
    'krank',
]);

export const calendarEventStatusSchema = z.enum([
    'geplant',
    'durchgeführt',
    'abgesagt',
]);

export const createCalendarEventSchema = z
    .object({
        title: z.string().trim().min(1).max(200),
        description: z.string().max(2000).optional(),
        type: calendarEventTypeSchema,
        date: z.coerce.date(),
        endDate: z.coerce.date().optional(),
        durationMinutes: z.number().int().min(0).max(24 * 60).optional(),
        participants: z.array(objectId).default([]),
        status: calendarEventStatusSchema.default('geplant'),
        visibility: z.enum(['team', 'private']).default('team'),
        relatedClientId: objectId.optional(),
    })
    .refine(
        (d) => !d.endDate || d.endDate.getTime() >= d.date.getTime(),
        { message: 'endDate muss >= date sein', path: ['endDate'] },
    );

export const updateCalendarEventSchema = z
    .object({
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        type: calendarEventTypeSchema.optional(),
        date: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        durationMinutes: z.number().int().min(0).max(24 * 60).optional(),
        participants: z.array(objectId).optional(),
        status: calendarEventStatusSchema.optional(),
        visibility: z.enum(['team', 'private']).optional(),
        relatedClientId: objectId.optional(),
    })
    .refine((d) => Object.keys(d).length > 0, {
        message: 'Mindestens ein Feld erforderlich',
    });

export const listCalendarEventsQuerySchema = z.object({
    scope: z.enum(['mine', 'team']).default('mine'),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    type: calendarEventTypeSchema.optional(),
});

export const respondCalendarEventSchema = z.object({
    response: z.enum(['accepted', 'declined']),
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;
export type ListCalendarEventsQuery = z.infer<typeof listCalendarEventsQuerySchema>;
export type RespondCalendarEventInput = z.infer<typeof respondCalendarEventSchema>;
