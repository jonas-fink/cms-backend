import { z } from 'zod';

export const createUserSchema = z.object({
    firstName: z.string().min(1, 'Vorname erforderlich'),
    lastName: z.string().min(1, 'Nachname erforderlich'),
    email: z.email('Ungültige E-Mail'),
    password: z.string().min(8, 'Mindestens 8 Zeichen'),
    role: z.enum(['admin', 'fachkraft']).default('fachkraft'),
    maxClients: z.number().int().min(0).max(50).default(6),
});

export const updateUserSchema = z
    .object({
        firstName: z.string().min(1, 'Vorname erforderlich'),
        lastName: z.string().min(1, 'Nachname erforderlich'),
        email: z.email('Ungültige E-Mail'),
        password: z.string().min(8, 'Mindestens 8 Zeichen'),
        role: z.enum(['admin', 'fachkraft']).default('fachkraft'),
        maxClients: z.number().int().min(0).max(50).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'Mindestens ein Feld erforderlich',
    });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
