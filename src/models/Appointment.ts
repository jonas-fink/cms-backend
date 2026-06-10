import mongoose, { Document, Types, Schema } from 'mongoose';

export type AppointmentType =
    | 'Hausbesuch'
    | 'Krisenintervention'
    | 'Telefongespräch'
    | 'Beratung'
    | 'Sonstiges';

export type StatusType = 'geplant' | 'durchgeführt' | 'ausgefallen';

export type MinuteType = 0 | 15 | 30 | 45;

export interface IAppointment extends Document {
    clientId: Types.ObjectId;
    createdBy: Types.ObjectId;
    participants: Types.ObjectId[];
    type: AppointmentType;
    status: StatusType;
    date: Date;
    durationHours: number;
    durationMinutes: MinuteType;
    report: string;
}

const AppointmentSchema = new Schema<IAppointment>(
    {
        clientId: { type: Types.ObjectId, ref: 'Client' },
        createdBy: { type: Types.ObjectId, ref: 'User' },
        participants: [{ type: Types.ObjectId, ref: 'User' }],
        type: {
            type: String,
            enum: [
                'Hausbesuch',
                'Krisenintervention',
                'Telefongespräch',
                'Beratung',
                'Sonstiges',
            ],
            default: 'Hausbesuch',
        },
        status: {
            type: String,
            enum: ['geplant', 'durchgeführt', 'ausgefallen'],
            default: 'geplant',
        },
        date: { type: Date, required: true },
        durationHours: { type: Number, required: true, default: 0 },
        durationMinutes: { type: Number, required: true, default: 0 },
        report: { type: String, required: true },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

export default mongoose.model<IAppointment>('Appointment', AppointmentSchema);
