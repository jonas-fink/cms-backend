import type { RequestHandler } from 'express';
import { Client } from '#models';
import { Appointment } from '#models';
import { User } from '#models';

function startOfISOWeek(d: Date): Date {
    const day = d.getDay() || 7;
    const out = new Date(d);
    out.setHours(0, 0, 0, 0);
    out.setDate(d.getDate() - day + 1);
    return out;
}
function endOfISOWeek(d: Date): Date {
    const out = startOfISOWeek(d);
    out.setDate(out.getDate() + 6);
    out.setHours(23, 59, 59, 999);
    return out;
}
function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

const OVERHEAD_FACTOR = 1.3;
const CANCELLED_CREDIT_MINUTES = 90;
const CANCELLED_MAX_PER_MONTH = 2;

const applyOverhead = (minutes: number) =>
    Math.round(minutes * OVERHEAD_FACTOR);

// GET /stats/workload  (Admin only)
// Gibt für jede Fachkraft: zugewiesene Klienten + Minuten der aktuellen Woche
export const getWorkload: RequestHandler = async (_req, res, next) => {
    try {
        const now = new Date();
        const weekStart = startOfISOWeek(now);
        const weekEnd = endOfISOWeek(now);
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        // Alle aktiven Klienten mit ihren zugewiesenen FKs
        const clients = await Client.find({ status: 'aktiv' })
            .select('familyName assignedFachkraefte weeklyHoursQuota')
            .lean();
        // Alle durchgeführten Termine dieser Woche
        const performedAppointments = await Appointment.find({
            status: 'durchgeführt',
            date: { $gte: weekStart, $lte: weekEnd },
        })
            .select('clientId durationHours durationMinutes createdBy')
            .lean();
        // Alle Termine dieser Woche (für Termin-Zähler pro FK)
        const weekAppointments = await Appointment.find({
            date: { $gte: weekStart, $lte: weekEnd },
        })
            .select('clientId createdBy status report')
            .lean();
        // Überfällige Berichte: durchgeführte Termine der letzten 14 Tage ohne Bericht
        const overdueCutoff = new Date(now);
        overdueCutoff.setDate(overdueCutoff.getDate() - 14);
        const overdueCandidates = await Appointment.find({
            status: 'durchgeführt',
            date: { $gte: overdueCutoff, $lte: now },
        })
            .select('createdBy report')
            .lean();
        // Alle ausgefallenen Termine des aktuellen Kalendermonats
        const cancelledAppointments = await Appointment.find({
            status: 'ausgefallen',
            date: { $gte: monthStart, $lte: monthEnd },
        })
            .select('clientId date')
            .sort({ date: 1 })
            .lean();
        // Alle Fachkräfte
        const fachkraefte = await User.find({ role: 'fachkraft' })
            .select('firstName lastName email maxClients')
            .lean();

        const workload = fachkraefte.map((fk) => {
            const fkId = fk._id.toString();

            const assignedClients = clients.filter((c) =>
                c.assignedFachkraefte.map(String).includes(fkId),
            );

            // Gesamtquota der zugewiesenen Klienten
            const quotaMinutes = assignedClients.reduce(
                (sum, c) => sum + c.weeklyHoursQuota * 60,
                0,
            );

            const assignedClientIds = new Set(
                assignedClients.map((c) => c._id.toString()),
            );

            // Geleistete Minuten: Termine, bei denen diese FK eingetragen hat
            // UND der Klient ihr zugewiesen ist
            const rawPerformedMinutes = performedAppointments
                .filter(
                    (a) =>
                        a.createdBy.toString() === fkId &&
                        assignedClientIds.has(a.clientId.toString()),
                )
                .reduce(
                    (sum, a) => sum + a.durationHours * 60 + a.durationMinutes,
                    0,
                );
            const performedMinutes = applyOverhead(rawPerformedMinutes);

            // Ausgefallene Termine: pro zugewiesenem Klient bis zu 2/Monat,
            // davon die in dieser Woche werden anteilig angerechnet.
            let cancelledCreditedCount = 0;
            for (const clientId of assignedClientIds) {
                const clientCancelled = cancelledAppointments.filter(
                    (a) => a.clientId.toString() === clientId,
                );
                const eligible = clientCancelled.slice(
                    0,
                    CANCELLED_MAX_PER_MONTH,
                );
                const inThisWeek = eligible.filter(
                    (a) =>
                        new Date(a.date) >= weekStart &&
                        new Date(a.date) <= weekEnd,
                );
                cancelledCreditedCount += inThisWeek.length;
            }
            const cancelledCreditMinutes =
                cancelledCreditedCount *
                applyOverhead(CANCELLED_CREDIT_MINUTES);

            const workedMinutes = performedMinutes + cancelledCreditMinutes;

            const utilizationPercent =
                quotaMinutes > 0
                    ? Math.round((workedMinutes / quotaMinutes) * 100)
                    : 0;

            const appointmentsThisWeek = weekAppointments.filter(
                (a) => a.createdBy.toString() === fkId,
            ).length;

            const overdueReports = overdueCandidates.filter((a) => {
                if (a.createdBy.toString() !== fkId) return false;
                const r = (a.report ?? '').trim();
                // '' wird vom required-Validator ausgeschlossen,
                // '-' ist der Sentinel für "Bericht ausstehend".
                return r === '' || r === '-';
            }).length;

            return {
                fachkraft: {
                    id: fkId,
                    name: `${fk.firstName} ${fk.lastName}`,
                    email: fk.email,
                },
                clientCount: assignedClients.length,
                maxClients: fk.maxClients ?? 6,
                quotaMinutes,
                workedMinutes,
                performedMinutes,
                cancelledCreditedCount,
                cancelledCreditMinutes,
                utilizationPercent,
                appointmentsThisWeek,
                overdueReports,
            };
        });
        res.json({ data: workload });
    } catch (err) {
        next(err);
    }
};

// GET /stats/clients/:id/hours  (Admin + zugewiesene FK)
export const getClientHours: RequestHandler<{ id: string }> = async (
    req,
    res,
    next,
) => {
    try {
        const now = new Date();
        const weekStart = startOfISOWeek(now);
        const weekEnd = endOfISOWeek(now);
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const client = await Client.findById(req.params.id).lean();
        if (!client) {
            res.status(404).json({ message: 'Klient nicht gefunden' });
            return;
        }

        if (req.role === 'fachkraft') {
            const isAssigned = client.assignedFachkraefte
                .map(String)
                .includes(req.userId!);
            if (!isAssigned) {
                res.status(403).json({ message: 'Kein Zugriff' });
                return;
            }
        }

        const performedAppointments = await Appointment.find({
            clientId: req.params.id,
            status: 'durchgeführt',
            date: { $gte: weekStart, $lte: weekEnd },
        })
            .select('durationHours durationMinutes date type')
            .lean();

        const cancelledThisMonth = await Appointment.find({
            clientId: req.params.id,
            status: 'ausgefallen',
            date: { $gte: monthStart, $lte: monthEnd },
        })
            .select('date type')
            .sort({ date: 1 })
            .lean();

        const rawPerformedMinutes = performedAppointments.reduce(
            (sum, a) => sum + a.durationHours * 60 + a.durationMinutes,
            0,
        );
        const performedMinutes = applyOverhead(rawPerformedMinutes);

        const eligibleCancelled = cancelledThisMonth.slice(
            0,
            CANCELLED_MAX_PER_MONTH,
        );
        const cancelledInWeek = eligibleCancelled.filter(
            (a) => new Date(a.date) >= weekStart && new Date(a.date) <= weekEnd,
        );
        const cancelledCreditedCount = cancelledInWeek.length;
        const cancelledCreditMinutes =
            cancelledCreditedCount * applyOverhead(CANCELLED_CREDIT_MINUTES);

        const totalMinutes = performedMinutes + cancelledCreditMinutes;

        const quotaMinutes = client.weeklyHoursQuota * 60;
        const progressPercent =
            quotaMinutes > 0
                ? Math.round((totalMinutes / quotaMinutes) * 100)
                : 0;

        res.json({
            data: {
                clientId: client._id,
                familyName: client.familyName,
                weeklyHoursQuota: client.weeklyHoursQuota,
                quotaMinutes,
                totalMinutes,
                performedMinutes,
                cancelledCreditedCount,
                cancelledCreditMinutes,
                progressPercent,
                appointments: performedAppointments,
            },
        });
    } catch (error) {
        next(error);
    }
};
