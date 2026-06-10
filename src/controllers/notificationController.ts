import type { RequestHandler } from 'express';
import { Notification } from '#models';
import type { ListNotificationsQuery } from '#schemas';

// GET /notifications
export const listNotifications: RequestHandler = async (req, res, next) => {
    try {
        const { read, type, limit } = req.query as unknown as ListNotificationsQuery;
        const filter: Record<string, unknown> = { userId: req.userId };
        if (read !== undefined) filter.read = read;
        if (type) filter.type = type;

        const items = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.json({ data: items });
    } catch (err) {
        next(err);
    }
};

// GET /notifications/unread-count
export const getUnreadCount: RequestHandler = async (req, res, next) => {
    try {
        const count = await Notification.countDocuments({
            userId: req.userId,
            read: false,
        });
        res.json({ data: { count } });
    } catch (err) {
        next(err);
    }
};

// PATCH /notifications/:id/read
export const markRead: RequestHandler<{ id: string }> = async (
    req,
    res,
    next,
) => {
    try {
        const notif = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { read: true, readAt: new Date() },
            { returnDocument: 'after' },
        );
        if (!notif) {
            res.status(404).json({ message: 'Notification nicht gefunden' });
            return;
        }
        res.json({ data: notif });
    } catch (err) {
        next(err);
    }
};

// PATCH /notifications/read-all
export const markAllRead: RequestHandler = async (req, res, next) => {
    try {
        const result = await Notification.updateMany(
            { userId: req.userId, read: false },
            { read: true, readAt: new Date() },
        );
        res.json({ data: { modified: result.modifiedCount } });
    } catch (err) {
        next(err);
    }
};

// DELETE /notifications/:id
export const deleteNotification: RequestHandler<{ id: string }> = async (
    req,
    res,
    next,
) => {
    try {
        const result = await Notification.deleteOne({
            _id: req.params.id,
            userId: req.userId,
        });
        if (result.deletedCount === 0) {
            res.status(404).json({ message: 'Notification nicht gefunden' });
            return;
        }
        res.status(204).end();
    } catch (err) {
        next(err);
    }
};
