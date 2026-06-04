import { z } from 'zod';

export const createUserSchema = z.object({
    firstName: z.string().min(1, 'Vorname erforderlich'),
    lastName: z.string().min(1, 'Nachname erforderlich'),
    email: z.email('Ungültige E-Mail'),
    password: z.string().min(8, 'Mindestens 8 Zeichen'),
    role: z.enum(['admin', 'fachkraft']).default('fachkraft'),
    maxClients: z.number().int().min(0).max(50).default(6),
    weeklyTargetMinutes: z.number().int().min(0).max(6000).default(2400),
    vacationDaysPerYear: z.number().int().min(0).max(60).default(30),
});

export const updateUserSchema = z
    .object({
        firstName: z.string().min(1, 'Vorname erforderlich').optional(),
        lastName: z.string().min(1, 'Nachname erforderlich').optional(),
        email: z.email('Ungültige E-Mail').optional(),
        password: z.string().min(8, 'Mindestens 8 Zeichen').optional(),
        role: z.enum(['admin', 'fachkraft']).optional(),
        maxClients: z.number().int().min(0).max(50).optional(),
        weeklyTargetMinutes: z.number().int().min(0).max(6000).optional(),
        vacationDaysPerYear: z.number().int().min(0).max(60).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'Mindestens ein Feld erforderlich',
    });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
