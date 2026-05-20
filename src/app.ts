import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
    }),
);

app.use(express.json());
app.use(cookieParser());
app.use('*splat', (req, res) => res.status(404).json({ message: 'Not Found' }));

export default app;
