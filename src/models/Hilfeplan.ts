import mongoose, { Schema, Types } from 'mongoose';

export interface IHilfeplan {
    clientId: Types.ObjectId;
    content: string;
    goals: { goal: string; status: 'offen' | 'in Bearbeitung' | 'erreicht' }[];
    createdBy: Types.ObjectId;
    version: number;
    updatedAt: Date;
}

const goalSchema = new Schema(
    {
        goal: { type: String, required: true },
        status: {
            type: String,
            enum: ['offen', 'in Bearbeitung', 'erreicht'],
            default: 'offen',
        },
    },
    { _id: false },
);

const hilfePlanSchema = new Schema<IHilfeplan>(
    {
        clientId: {
            type: Schema.Types.ObjectId,
            ref: 'Client',
            required: true,
            index: true,
        },
        content: { type: String, required: true, default: '' },
        goals: { type: [goalSchema], default: [] },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        version: { type: Number, default: 1 },
    },
    { timestamps: { updatedAt: true, createdAt: false } },
);

export default mongoose.model<IHilfeplan>('Hilfeplan', hilfePlanSchema);
