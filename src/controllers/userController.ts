import type { RequestHandler } from 'express';
import { User, RefreshToken } from '#models';
import type { CreateUserInput, UpdateUserInput } from '#schemas';

export const getUsers: RequestHandler = async (_req, res, next) => {
    try {
        const users = await User.find({ role: 'fachkraft' }).sort({
            lastName: 1,
            firstName: 1,
        });
        res.json({ data: users });
    } catch (err) {
        next(err);
    }
};

export const createUser: RequestHandler<{}, {}, CreateUserInput> = async (
    req,
    res,
    next,
) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            role,
            maxClients,
            weeklyTargetMinutes,
            vacationDaysPerYear,
        } = req.body;

        let user;
        try {
            user = await User.create({
                firstName,
                lastName,
                email,
                password,
                role,
                maxClients,
                weeklyTargetMinutes,
                vacationDaysPerYear,
            });
        } catch (err) {
            if ((err as { code?: number }).code === 11000) {
                res.status(409).json({ message: 'E-Mail bereits vergeben' });
                return;
            }
            throw err;
        }

        res.status(201).json({ data: user });
    } catch (err) {
        next(err);
    }
};

export const updateUser: RequestHandler<
    { id: string },
    {},
    UpdateUserInput
> = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: 'User nicht gefunden' });
            return;
        }

        const {
            firstName,
            lastName,
            email,
            password,
            role,
            maxClients,
            weeklyTargetMinutes,
            vacationDaysPerYear,
        } = req.body;

        if (email !== undefined) {
            const normalized = email.toLowerCase();
            if (normalized !== user.email) {
                const taken = await User.findOne({ email: normalized });
                if (taken) {
                    res.status(409).json({
                        message: 'E-Mail bereits vergeben',
                    });
                    return;
                }
                user.email = normalized;
            }
        }

        if (firstName !== undefined) user.firstName = firstName;
        if (lastName !== undefined) user.lastName = lastName;
        if (role !== undefined) user.role = role;
        if (maxClients !== undefined) user.maxClients = maxClients;
        if (weeklyTargetMinutes !== undefined)
            user.weeklyTargetMinutes = weeklyTargetMinutes;
        if (vacationDaysPerYear !== undefined)
            user.vacationDaysPerYear = vacationDaysPerYear;
        if (password !== undefined) user.password = password;

        await user.save();
        res.json({ data: user });
    } catch (err) {
        next(err);
    }
};

export const deleteUser: RequestHandler<{ id: string }> = async (
    req,
    res,
    next,
) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: 'User nicht gefunden' });
            return;
        }

        if (user.id === req.userId) {
            res.status(400).json({
                message: 'Eigener Account kann nicht gelöscht werden',
            });
            return;
        }

        await RefreshToken.deleteMany({ userId: user._id });
        await user.deleteOne();

        res.status(204).end();
    } catch (err) {
        next(err);
    }
};
