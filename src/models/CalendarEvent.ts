import mongoose, { Schema, Types } from 'mongoose';

export type CalendarEventType =
    | 'team_meeting'
    | 'koordination'
    | 'sonstiges'
    | 'urlaub'
    | 'krank';

export const CALENDAR_EVENT_TYPES: CalendarEventType[] = [
    'team_meeting',
    'koordination',
    'sonstiges',
    'urlaub',
    'krank',
];

export type CalendarEventStatus = 'geplant' | 'durchgeführt' | 'abgesagt';

export const CALENDAR_EVENT_STATUSES: CalendarEventStatus[] = [
    'geplant',
    'durchgeführt',
    'abgesagt',
];

export type CalendarEventVisibility = 'team' | 'private';

export type CalendarParticipantResponse = 'pending' | 'accepted' | 'declined';

export interface ICalendarParticipant {
    userId: Types.ObjectId;
    response: CalendarParticipantResponse;
    respondedAt?: Date;
}

export interface ICalendarEvent {
    createdBy: Types.ObjectId;
    title: string;
    description?: string;
    type: CalendarEventType;
    date: Date;
    endDate?: Date;
    durationMinutes?: number;
    participants: ICalendarParticipant[];
    status: CalendarEventStatus;
    visibility: CalendarEventVisibility;
    relatedClientId?: Types.ObjectId;
    relatedVacationRequestId?: Types.ObjectId;
    relatedSickLeaveId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const participantSchema = new Schema<ICalendarParticipant>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        response: {
            type: String,
            enum: ['pending', 'accepted', 'declined'],
            default: 'pending',
        },
        respondedAt: { type: Date },
    },
    { _id: false },
);

const calendarEventSchema = new Schema<ICalendarEvent>(
    {
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: { type: String, required: true, trim: true, maxlength: 200 },
        description: { type: String, maxlength: 2000 },
        type: {
            type: String,
            enum: CALENDAR_EVENT_TYPES,
            required: true,
            index: true,
        },
        date: { type: Date, required: true, index: true },
        endDate: { type: Date },
        durationMinutes: { type: Number, min: 0, max: 24 * 60 },
        participants: { type: [participantSchema], default: [] },
        status: {
            type: String,
            enum: CALENDAR_EVENT_STATUSES,
            default: 'geplant',
        },
        visibility: {
            type: String,
            enum: ['team', 'private'],
            default: 'team',
        },
        relatedClientId: { type: Schema.Types.ObjectId, ref: 'Client' },
        relatedVacationRequestId: {
            type: Schema.Types.ObjectId,
            ref: 'VacationRequest',
        },
        relatedSickLeaveId: { type: Schema.Types.ObjectId, ref: 'SickLeave' },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

calendarEventSchema.index({ 'participants.userId': 1, date: 1 });
calendarEventSchema.index({ date: 1, endDate: 1 });

export default mongoose.model<ICalendarEvent>(
    'CalendarEvent',
    calendarEventSchema,
);
