import { Types } from 'mongoose';
import { Notification, type NotificationType } from '#models';

interface CreateNotificationInput {
    userId: Types.ObjectId | string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    payload?: Record<string, unknown>;
}

export const createNotification = async (input: CreateNotificationInput) => {
    return Notification.create({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        payload: input.payload,
        read: false,
    });
};

export const createNotificationsForMany = async (
    userIds: Array<Types.ObjectId | string>,
    base: Omit<CreateNotificationInput, 'userId'>,
) => {
    if (userIds.length === 0) return [];
    const docs = userIds.map((userId) => ({
        userId,
        type: base.type,
        title: base.title,
        message: base.message,
        link: base.link,
        payload: base.payload,
        read: false,
    }));
    return Notification.insertMany(docs);
};
