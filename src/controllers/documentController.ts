import type { RequestHandler } from 'express';
import { Document } from '#models';
import { uploadUrlSchema, type UploadUrlInput } from '#schemas';
import {
    createPresignedPutUrl,
    createPresignedGetUrl,
    deleteS3Object,
} from '#services';
import { resolveClientAccess } from '#utils';

// POST /documents/upload-url
export const getUploadUrl: RequestHandler<{}, {}, UploadUrlInput> = async (
    req,
    res,
    next,
) => {
    try {
        const { fileName, fileType, fileSizeBytes, clientId, description } =
            req.body;

        const hasAccess = await resolveClientAccess(
            clientId,
            req.userId!,
            req.role!,
        );
        if (!hasAccess) {
            const err = new Error('Kein Zugriff auf diesen Klienten');
            (err as any).cause = { status: 403 };
            return next(err);
        }

        const { presignedUrl, s3Key } = await createPresignedPutUrl(
            fileType,
            fileSizeBytes,
        );

        const doc = await Document.create({
            clientId,
            uploadedBy: req.userId,
            fileName,
            fileType,
            fileSizeBytes,
            s3Key,
            description,
            confirmed: false,
        });

        res.status(201).json({ data: { presignedUrl, documentId: doc._id } });
    } catch (err) {
        next(err);
    }
};

// PATCH /documents/:id/confirm
export const confirmUpload: RequestHandler<{ id: string }> = async (
    req,
    res,
    next,
) => {
    try {
        const doc = await Document.findById(req.params.id);

        if (!doc) {
            const err = new Error('Dokument nicht gefunden');
            (err as any).cause = { status: 404 };
            return next(err);
        }

        if (req.role !== 'admin' && doc.uploadedBy.toString() !== req.userId) {
            const err = new Error('Keine Berechtigung');
            (err as any).cause = { status: 403 };
            return next(err);
        }

        if (doc.confirmed) {
            res.status(204).end();
            return;
        }

        doc.confirmed = true;
        await doc.save();
        res.status(204).end();
    } catch (err) {
        next(err);
    }
};

// GET /clients/:clientId/documents
export const getDocuments: RequestHandler<{ clientId: string }> = async (
    req,
    res,
    next,
) => {
    try {
        const { clientId } = req.params;

        const hasAccess = await resolveClientAccess(
            clientId,
            req.userId!,
            req.role!,
        );
        if (!hasAccess) {
            const err = new Error('Kein Zugriff auf diesen Klienten');
            (err as any).cause = { status: 403 };
            return next(err);
        }

        const docs = await Document.find({ clientId, confirmed: true })
            .sort({ createdAt: -1 })
            .lean();

        const withUrls = await Promise.all(
            docs.map(async (d) => ({
                id: d._id,
                fileName: d.fileName,
                fileType: d.fileType,
                fileSizeBytes: d.fileSizeBytes,
                description: d.description,
                uploadedBy: d.uploadedBy,
                createdAt: d.createdAt,
                downloadUrl: await createPresignedGetUrl(d.s3Key),
            })),
        );

        res.status(200).json({ data: withUrls });
    } catch (err) {
        next(err);
    }
};

// GET /documents  (Admin only) – globale Liste aller bestätigten Dokumente
export const getAllDocuments: RequestHandler = async (_req, res, next) => {
    try {
        const docs = await Document.find({ confirmed: true })
            .sort({ createdAt: -1 })
            .populate('clientId', 'familyName caseNumber')
            .populate('uploadedBy', 'firstName lastName')
            .lean();

        const withUrls = await Promise.all(
            docs.map(async (d) => ({
                id: d._id,
                fileName: d.fileName,
                fileType: d.fileType,
                fileSizeBytes: d.fileSizeBytes,
                description: d.description,
                client: d.clientId,
                uploadedBy: d.uploadedBy,
                createdAt: d.createdAt,
                downloadUrl: await createPresignedGetUrl(d.s3Key),
            })),
        );

        res.status(200).json({ data: withUrls });
    } catch (err) {
        next(err);
    }
};

// DELETE /documents/:id
export const deleteDocument: RequestHandler<{ id: string }> = async (
    req,
    res,
    next,
) => {
    try {
        const doc = await Document.findById(req.params.id);

        if (!doc) {
            const err = new Error('Dokument nicht gefunden');
            (err as any).cause = { status: 404 };
            return next(err);
        }

        const isOwner = doc.uploadedBy.toString() === req.userId;
        if (req.role !== 'admin' && !isOwner) {
            const err = new Error('Keine Berechtigung');
            (err as any).cause = { status: 403 };
            return next(err);
        }

        await deleteS3Object(doc.s3Key);
        await doc.deleteOne();

        res.status(204).end();
    } catch (err) {
        next(err);
    }
};
