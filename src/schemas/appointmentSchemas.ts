import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Ungültige ID');

export const appointmentTypeSchema = z.enum([
    'Hausbesuch',
    'Krisenintervention',
    'Telefongespräch',
    'Beratung',
    'Sonstiges',
]);

export const appointmentStatusSchema = z.enum([
    'geplant',
    'durchgeführt',
    'ausgefallen',
]);

export const minuteSchema = z.union([
    z.literal(0),
    z.literal(15),
    z.literal(30),
    z.literal(45),
]);

export const createAppointmentSchema = z.object({
    clientId: objectId,
    participants: z.array(objectId).default([]),
    type: appointmentTypeSchema.default('Hausbesuch'),
    status: appointmentStatusSchema.default('geplant'),
    date: z.coerce.date(),
    durationHours: z.number().int().min(0).default(0),
    durationMinutes: minuteSchema,
    report: z.string().default(''),
});

export const updateAppointmentSchema = z
    .object({
        type: appointmentTypeSchema.optional(),
        status: z.enum(['geplant', 'durchgeführt', 'ausgefallen']).optional(),
        date: z.coerce.date().optional(),
        durationHours: z.number().int().min(0).optional(),
        durationMinutes: minuteSchema.optional(),
        report: z.string().optional(),
        participants: z.array(objectId).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'Mindestens ein Feld erforderlich',
    });

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
