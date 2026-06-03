import mongoose, { Document, Schema, Types } from 'mongoose';

export type StatusType = 'aktiv' | 'pausiert' | 'abgeschlossen';

export interface IClient extends Document {
    familyName: string;
    firstName: string;
    caseNumber?: string;
    children: { name: string; age: number }[];
    address?: string;
    phone?: string;
    jugendamtContact?: string;
    assignedFachkraefte: Types.ObjectId[];
    nextReport: Date;
    weeklyHoursQuota: number;
    status: StatusType;
    startDate: Date;
    endDate?: Date;
    createdAt: Date;
}
const ChildSchema = new Schema(
    {
        name: { type: String, required: true },
        age: { type: Number, required: true },
    },
    { _id: false },
);

const ClientSchema = new Schema<IClient>(
    {
        familyName: { type: String, required: true },
        firstName: { type: String, required: true },
        caseNumber: { type: String, unique: true },
        children: [ChildSchema],
        address: { type: String },
        phone: { type: String },
        jugendamtContact: { type: String },
        assignedFachkraefte: [{ type: Types.ObjectId, ref: 'User' }],
        nextReport: { type: Date, required: true },
        weeklyHoursQuota: { type: Number, required: true },
        status: {
            type: String,
            enum: ['aktiv', 'pausiert', 'abgeschlossen'],
            required: true,
        },
        startDate: { type: Date, required: true },
        endDate: { type: Date },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

export default mongoose.model<IClient>('Client', ClientSchema);
