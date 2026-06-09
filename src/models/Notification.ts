import mongoose, { Schema, Types } from 'mongoose';

export type NotificationType =
    | 'tandem_invite'
    | 'calendar_event_added'
    | 'calendar_event_updated'
    | 'vacation_pending'
    | 'vacation_approved'
    | 'vacation_denied'
    | 'sick_leave'
    | 'shift_overlap';

export const NOTIFICATION_TYPES: NotificationType[] = [
    'tandem_invite',
    'calendar_event_added',
    'calendar_event_updated',
    'vacation_pending',
    'vacation_approved',
    'vacation_denied',
    'sick_leave',
    'shift_overlap',
];

export interface INotification {
    userId: Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    payload?: Record<string, unknown>;
    read: boolean;
    readAt?: Date;
    createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: { type: String, enum: NOTIFICATION_TYPES, required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        link: { type: String },
        payload: { type: Schema.Types.Mixed },
        read: { type: Boolean, default: false, index: true },
        readAt: { type: Date },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.model<INotification>(
    'Notification',
    notificationSchema,
);
