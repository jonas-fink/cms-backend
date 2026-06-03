import type { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { Appointment } from '#models';
import { resolveClientAccess } from '#utils';
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

        const appointment = await Appointment.create({
            ...req.body,
            clientId: new mongoose.Types.ObjectId(req.params.clientId),
            createdBy: new mongoose.Types.ObjectId(req.userId!),
        });

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

        Object.assign(appointment, req.body);
        await appointment.save();

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
