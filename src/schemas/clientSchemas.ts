import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Ungültige ID');

const childSchema = z.object({
    name: z.string().min(1, 'Name erforderlich'),
    age: z.number().int().min(0).max(99),
});

export const statusSchema = z.enum(['aktiv', 'pausiert', 'abgeschlossen']);

export const createClientSchema = z.object({
    familyName: z.string().min(1, 'Nachname wird benötigt'),
    firstName: z.string().min(1, 'Vorname wird benötigt'),
    caseNumber: z.string().optional(),
    children: z.array(childSchema).default([]),
    address: z.string().optional(),
    phone: z.string().trim().min(3).max(40).optional(),
    jugendamtContact: z.string().min(1, 'Jugendamt Kontakt benötigt'),
    assignedFachkraefte: z.array(objectId).default([]),
    nextReport: z.coerce.date(),
    weeklyHourseQuota: z.number().min(0),
    status: statusSchema.default('aktiv'),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
});

export const updateClientSchema = z
    .object({
        familyName: z.string().min(1).optional(),
        caseNumber: z.string().min(1).optional(),
        children: z.array(childSchema).optional(),
        address: z.string().optional(),
        phone: z.string().trim().min(3).max(40).optional(),
        jugendamtContact: z.string().optional(),
        weeklyHoursQuota: z.number().positive().optional(),
        status: statusSchema.default('aktiv').optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'Mindestens ein Feld erforderlich',
    });

export const assignedFachkraefteSchema = z.object({
    fachkraftId: z.string().min(1, 'Fachkraft-ID erforderlich'),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type AssignFachkraftInput = z.infer<typeof assignedFachkraefteSchema>;
