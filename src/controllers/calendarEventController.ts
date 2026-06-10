import type { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { CalendarEvent } from '#models';
import { createNotificationsForMany } from '#services';
import type {
    CreateCalendarEventInput,
    UpdateCalendarEventInput,
    ListCalendarEventsQuery,
    RespondCalendarEventInput,
} from '#schemas';

const toId = (v: string) => new mongoose.Types.ObjectId(v);

const computeRange = (date: Date, endDate: Date | undefined, durationMinutes: number | undefined) => {
    const start = date;
    const end =
        endDate ??
        (durationMinutes
            ? new Date(start.getTime() + durationMinutes * 60_000)
            : new Date(start.getTime() + 60 * 60_000));
    return { start, end };
};

const findOverlappingEventsForUsers = async (
    userIds: mongoose.Types.ObjectId[],
    start: Date,
    end: Date,
    excludeId?: mongoose.Types.ObjectId,
) => {
    if (userIds.length === 0) return [];
    const query: Record<string, unknown> = {
        'participants.userId': { $in: userIds },
        date: { $lt: end },
        $or: [
            { endDate: { $gt: start } },
            { endDate: { $exists: false }, date: { $gte: start } },
        ],
    };
    if (excludeId) query._id = { $ne: excludeId };
    return CalendarEvent.find(query).select('participants date endDate title').lean();
};

// GET /calendar-events?scope=mine|team&from=&to=&type=
export const listCalendarEvents: RequestHandler = async (req, res, next) => {
    try {
        const { scope, from, to, type } =
            req.query as unknown as ListCalendarEventsQuery;
        const filter: Record<string, unknown> = {};

        if (scope === 'mine') {
            filter.$or = [
                { createdBy: toId(req.userId!) },
                { 'participants.userId': toId(req.userId!) },
            ];
        } else {
            filter.visibility = 'team';
        }
        if (type) filter.type = type;
        if (from || to) {
            const range: Record<string, Date> = {};
            if (from) range.$gte = from;
            if (to) range.$lte = to;
            filter.date = range;
        }

        const events = await CalendarEvent.find(filter)
            .populate('createdBy', 'firstName lastName')
            .populate('participants.userId', 'firstName lastName')
            .populate('relatedClientId', 'familyName caseNumber')
            .sort({ date: 1 });

        res.json({ data: events });
    } catch (err) {
        next(err);
    }
};

// POST /calendar-events
export const createCalendarEvent: RequestHandler<
    {},
    {},
    CreateCalendarEventInput
> = async (req, res, next) => {
    try {
        const body = req.body;
        const creatorId = toId(req.userId!);
        const participantIds = (body.participants ?? []).map(toId);

        const event = await CalendarEvent.create({
            createdBy: creatorId,
            title: body.title,
            description: body.description,
            type: body.type,
            date: body.date,
            endDate: body.endDate,
            durationMinutes: body.durationMinutes,
            participants: participantIds.map((userId) => ({
                userId,
                response:
                    userId.equals(creatorId) ? 'accepted' : 'pending',
                respondedAt: userId.equals(creatorId) ? new Date() : undefined,
            })),
            status: body.status,
            visibility: body.visibility,
            relatedClientId: body.relatedClientId
                ? toId(body.relatedClientId)
                : undefined,
        });

        const recipients = participantIds.filter(
            (id) => !id.equals(creatorId),
        );

        if (recipients.length > 0) {
            await createNotificationsForMany(recipients, {
                type: 'calendar_event_added',
                title: 'Neuer Termin eingetragen',
                message: `${event.title} am ${event.date.toLocaleDateString('de-DE')}`,
                link: `/calendar?event=${event._id}`,
                payload: { eventId: String(event._id) },
            });
        }

        const { start, end } = computeRange(
            event.date,
            event.endDate,
            event.durationMinutes,
        );
        const overlapping = await findOverlappingEventsForUsers(
            recipients,
            start,
            end,
            event._id as mongoose.Types.ObjectId,
        );
        const conflictUserIds = new Set<string>();
        for (const ev of overlapping) {
            for (const p of ev.participants) {
                if (recipients.some((r) => r.equals(p.userId))) {
                    conflictUserIds.add(String(p.userId));
                }
            }
        }
        if (conflictUserIds.size > 0) {
            await createNotificationsForMany([...conflictUserIds], {
                type: 'shift_overlap',
                title: 'Terminüberschneidung',
                message: `${event.title} überschneidet sich mit einem bestehenden Termin.`,
                link: `/calendar?event=${event._id}`,
                payload: { eventId: String(event._id) },
            });
        }

        res.status(201).json({ data: event });
    } catch (err) {
        next(err);
    }
};

// GET /calendar-events/:id
export const getCalendarEvent: RequestHandler<{ id: string }> = async (
    req,
    res,
    next,
) => {
    try {
        const event = await CalendarEvent.findById(req.params.id)
            .populate('createdBy', 'firstName lastName')
            .populate('participants.userId', 'firstName lastName')
            .populate('relatedClientId', 'familyName caseNumber');
        if (!event) {
            res.status(404).json({ message: 'Termin nicht gefunden' });
            return;
        }
        res.json({ data: event });
    } catch (err) {
        next(err);
    }
};

// PATCH /calendar-events/:id
export const updateCalendarEvent: RequestHandler<
    { id: string },
    {},
    UpdateCalendarEventInput
> = async (req, res, next) => {
    try {
        const event = await CalendarEvent.findById(req.params.id);
        if (!event) {
            res.status(404).json({ message: 'Termin nicht gefunden' });
            return;
        }
        if (
            String(event.createdBy) !== req.userId &&
            req.role !== 'admin'
        ) {
            res.status(403).json({ message: 'Keine Berechtigung' });
            return;
        }

        const body = req.body;
        const creatorId = event.createdBy as mongoose.Types.ObjectId;

        const existingParticipantMap = new Map(
            event.participants.map((p) => [String(p.userId), p]),
        );

        if (body.participants) {
            const newIds = body.participants.map(toId);
            event.participants = newIds.map((userId) => {
                const existing = existingParticipantMap.get(String(userId));
                if (existing) return existing;
                return {
                    userId,
                    response: userId.equals(creatorId) ? 'accepted' : 'pending',
                    respondedAt: userId.equals(creatorId)
                        ? new Date()
                        : undefined,
                };
            });
        }

        if (body.title !== undefined) event.title = body.title;
        if (body.description !== undefined) event.description = body.description;
        if (body.type !== undefined) event.type = body.type;
        if (body.date !== undefined) event.date = body.date;
        if (body.endDate !== undefined) event.endDate = body.endDate;
        if (body.durationMinutes !== undefined)
            event.durationMinutes = body.durationMinutes;
        if (body.status !== undefined) event.status = body.status;
        if (body.visibility !== undefined) event.visibility = body.visibility;
        if (body.relatedClientId !== undefined)
            event.relatedClientId = toId(body.relatedClientId);

        await event.save();

        const recipients = event.participants
            .map((p) => p.userId as mongoose.Types.ObjectId)
            .filter((id) => !id.equals(creatorId));

        if (recipients.length > 0) {
            await createNotificationsForMany(recipients, {
                type: 'calendar_event_updated',
                title: 'Termin geändert',
                message: `${event.title} am ${event.date.toLocaleDateString('de-DE')}`,
                link: `/calendar?event=${event._id}`,
                payload: { eventId: String(event._id) },
            });
        }

        res.json({ data: event });
    } catch (err) {
        next(err);
    }
};

// DELETE /calendar-events/:id
export const deleteCalendarEvent: RequestHandler<{ id: string }> = async (
    req,
    res,
    next,
) => {
    try {
        const event = await CalendarEvent.findById(req.params.id);
        if (!event) {
            res.status(404).json({ message: 'Termin nicht gefunden' });
            return;
        }
        if (
            String(event.createdBy) !== req.userId &&
            req.role !== 'admin'
        ) {
            res.status(403).json({ message: 'Keine Berechtigung' });
            return;
        }
        await event.deleteOne();
        res.status(204).end();
    } catch (err) {
        next(err);
    }
};

// POST /calendar-events/:id/respond
export const respondCalendarEvent: RequestHandler<
    { id: string },
    {},
    RespondCalendarEventInput
> = async (req, res, next) => {
    try {
        const event = await CalendarEvent.findById(req.params.id);
        if (!event) {
            res.status(404).json({ message: 'Termin nicht gefunden' });
            return;
        }
        const participant = event.participants.find(
            (p) => String(p.userId) === req.userId,
        );
        if (!participant) {
            res.status(403).json({ message: 'Nicht eingeladen' });
            return;
        }
        participant.response = req.body.response;
        participant.respondedAt = new Date();
        await event.save();
        res.json({ data: event });
    } catch (err) {
        next(err);
    }
};
