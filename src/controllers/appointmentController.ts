import type { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { Appointment, Client } from '#models';
import { resolveClientAccess } from '#utils';
import { createNotificationsForMany } from '#services';
import type { CreateAppointmentInput, UpdateAppointmentInput } from '#schemas';

type ClientParams = { clientId: string };
type AppointmentParams = { clientId: string; id: string };

// GET /clients/:clientId/appointments
export const getAppointments: RequestHandler<ClientParams> = async (
    req,
    res,
    next,
) => {
    try {
        const access = await resolveClientAccess(
            req.params.clientId,
            req.userId!,
            req.role!,
        );
        if (!access.ok) {
            res.status(access.status).json({ message: access.message });
            return;
        }

        const appointments = await Appointment.find({
            clientId: new mongoose.Types.ObjectId(req.params.clientId),
        })
            .populate('createdBy', 'firstName lastName')
            .sort({ date: -1 });

        res.json({ data: appointments });
    } catch (err) {
        next(err);
    }
};

// POST /clients/:clientId/appointments
export const createAppointment: RequestHandler<
    ClientParams,
    {},
    CreateAppointmentInput
> = async (req, res, next) => {
    try {
        const access = await resolveClientAccess(
            req.params.clientId,
            req.userId!,
            req.role!,
        );
        if (!access.ok) {
            res.status(access.status).json({ message: access.message });
            return;
        }

        const creatorId = new mongoose.Types.ObjectId(req.userId!);
        const participantIds = (req.body.participants ?? []).map(
            (id) => new mongoose.Types.ObjectId(id),
        );

        const appointment = await Appointment.create({
            ...req.body,
            participants: participantIds,
            clientId: new mongoose.Types.ObjectId(req.params.clientId),
            createdBy: creatorId,
        });

        const inviteRecipients = participantIds.filter(
            (id) => !id.equals(creatorId),
        );
        if (inviteRecipients.length > 0) {
            const client = await Client.findById(req.params.clientId)
                .select('familyName')
                .lean();
            await createNotificationsForMany(inviteRecipients, {
                type: 'tandem_invite',
                title: 'Tandem-Einladung',
                message: `${client?.familyName ?? 'Klient'} – Termin am ${appointment.date.toLocaleDateString('de-DE')}`,
                link: `/clients/${req.params.clientId}`,
                payload: {
                    appointmentId: String(appointment._id),
                    clientId: req.params.clientId,
                },
            });
        }

        res.status(201).json({ data: appointment });
    } catch (err) {
        next(err);
    }
};

// GET /clients/:clientId/appointments/:id
export const getAppointment: RequestHandler<AppointmentParams> = async (
    req,
    res,
    next,
) => {
    try {
        const access = await resolveClientAccess(
            req.params.clientId,
            req.userId!,
            req.role!,
        );
        if (!access.ok) {
            res.status(access.status).json({ message: access.message });
            return;
        }

        const appointment = await Appointment.findOne({
            _id: req.params.id,
            clientId: req.params.clientId,
        }).populate('createdBy', 'firstName lastName');

        if (!appointment) {
            res.status(404).json({ message: 'Termin nicht gefunden' });
            return;
        }

        res.json({ data: appointment });
    } catch (err) {
        next(err);
    }
};

// PATCH /clients/:clientId/appointments/:id
export const updateAppointment: RequestHandler<
    AppointmentParams,
    {},
    UpdateAppointmentInput
> = async (req, res, next) => {
    try {
        const access = await resolveClientAccess(
            req.params.clientId,
            req.userId!,
            req.role!,
        );
        if (!access.ok) {
            res.status(access.status).json({ message: access.message });
            return;
        }

        const appointment = await Appointment.findOne({
            _id: req.params.id,
            clientId: req.params.clientId,
        });

        if (!appointment) {
            res.status(404).json({ message: 'Termin nicht gefunden' });
            return;
        }

        const previousParticipants = new Set(
            appointment.participants.map((p) => String(p)),
        );
        Object.assign(appointment, req.body);
        await appointment.save();

        if (req.body.participants) {
            const newlyInvited = appointment.participants.filter(
                (p) =>
                    !previousParticipants.has(String(p)) &&
                    String(p) !== req.userId,
            );
            if (newlyInvited.length > 0) {
                const client = await Client.findById(req.params.clientId)
                    .select('familyName')
                    .lean();
                await createNotificationsForMany(newlyInvited, {
                    type: 'tandem_invite',
                    title: 'Tandem-Einladung',
                    message: `${client?.familyName ?? 'Klient'} – Termin am ${appointment.date.toLocaleDateString('de-DE')}`,
                    link: `/clients/${req.params.clientId}`,
                    payload: {
                        appointmentId: String(appointment._id),
                        clientId: req.params.clientId,
                    },
                });
            }
        }

        res.json({ data: appointment });
    } catch (err) {
        next(err);
    }
};

// DELETE /clients/:clientId/appointments/:id
export const deleteAppointment: RequestHandler<AppointmentParams> = async (
    req,
    res,
    next,
) => {
    try {
        const access = await resolveClientAccess(
            req.params.clientId,
            req.userId!,
            req.role!,
        );
        if (!access.ok) {
            res.status(access.status).json({ message: access.message });
            return;
        }

        const appointment = await Appointment.findOneAndDelete({
            _id: req.params.id,
            clientId: req.params.clientId,
        });

        if (!appointment) {
            res.status(404).json({ message: 'Termin nicht gefunden' });
            return;
        }

        res.status(204).end();
    } catch (err) {
        next(err);
    }
};
