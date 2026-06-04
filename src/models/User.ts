import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'fachkraft';

export interface IUser extends Document {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: UserRole;
    maxClients: number;
    weeklyTargetMinutes: number;
    vacationDaysPerYear: number;
    overtimeMinutes: number;
    comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        password: { type: String, required: true },
        role: {
            type: String,
            enum: ['admin', 'fachkraft'],
            default: 'fachkraft',
        },
        maxClients: { type: Number, default: 6, min: 0, max: 50 },
        weeklyTargetMinutes: {
            type: Number,
            default: 2400,
            min: 0,
            max: 6000,
        },
        vacationDaysPerYear: {
            type: Number,
            default: 30,
            min: 0,
            max: 60,
        },
        overtimeMinutes: { type: Number, default: 0 },
    },
    { timestamps: true },
);

UserSchema.pre<IUser>('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

UserSchema.methods.comparePassword = function (candidate: string) {
    return bcrypt.compare(candidate, this.password);
};

UserSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        const { password, ...rest } = ret as IUser & { password?: string };
        return rest;
    },
});
UserSchema.set('toObject', { virtuals: true });

export default mongoose.model<IUser>('User', UserSchema);
