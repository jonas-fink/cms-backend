/**
 * Seed-Script: legt einen Admin, 5 Fachkräfte, 20 Klienten samt Zuweisungen,
 * Terminen und Hilfeplänen an. Bestehende Daten werden vorher geleert.
 *
 * Ausführen mit:  npm run seed
 */
import mongoose from 'mongoose';
import {
    User,
    Client,
    Appointment,
    Hilfeplan,
    RefreshToken,
    Document as DocumentModel,
} from '#models';

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error('MONGO_URI fehlt in .env');
    process.exit(1);
}

// ─── Stamm-Daten ─────────────────────────────────────────────────────────────

const ADMIN = {
    firstName: 'Admin',
    lastName: 'SPFH',
    email: 'admin@spfh.de',
    password: 'admin1234',
    role: 'admin' as const,
};

const FACHKRAEFTE = [
    { firstName: 'Anna', lastName: 'Berger', email: 'a.berger@spfh.de', maxClients: 6 },
    { firstName: 'Markus', lastName: 'Lehner', email: 'm.lehner@spfh.de', maxClients: 6 },
    { firstName: 'Sara', lastName: 'Wolff', email: 's.wolff@spfh.de', maxClients: 4 },
    { firstName: 'Tobias', lastName: 'Huber', email: 't.huber@spfh.de', maxClients: 6 },
    { firstName: 'Lea', lastName: 'Schmidt', email: 'l.schmidt@spfh.de', maxClients: 8 },
];

const FAMILY_NAMES = [
    'Müller', 'Schmidt', 'Bauer', 'Fischer', 'Wagner', 'Weber', 'Becker',
    'Hoffmann', 'Schäfer', 'Koch', 'Richter', 'Klein', 'Wolf', 'Schröder',
    'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krüger', 'Hartmann',
];

const FIRST_NAMES = [
    'Sabine', 'Thomas', 'Jana', 'Mehmet', 'Aylin', 'Petra', 'Daniel',
    'Olga', 'Ramazan', 'Claudia', 'Stefan', 'Mira', 'Dennis', 'Fatma',
    'Andreas', 'Yvonne', 'Lukas', 'Halime', 'Marco', 'Kerstin',
];

const CHILD_NAMES = ['Lena', 'Tim', 'Max', 'Anna', 'Ella', 'Noah', 'Leon', 'Mila', 'Paul', 'Sophie'];

const ADDRESSES = [
    'Hauptstraße 12, 60311 Frankfurt am Main',
    'Bornheimer Landstr. 45, 60385 Frankfurt am Main',
    'Berger Straße 188, 60385 Frankfurt am Main',
    'Schweizer Straße 7, 60594 Frankfurt am Main',
    'Eckenheimer Landstr. 220, 60320 Frankfurt am Main',
    'Mainzer Landstr. 113, 60327 Frankfurt am Main',
];

const JA_CONTACTS = ['Fr. Schneider', 'Hr. Roth', 'Fr. Becker', 'Hr. Lang', 'Fr. Demir'];

const APPT_TYPES = ['Hausbesuch', 'Krisenintervention', 'Telefongespräch', 'Beratung', 'Sonstiges'] as const;
const STATUSES: Array<'aktiv' | 'pausiert' | 'abgeschlossen'> = ['aktiv', 'aktiv', 'aktiv', 'aktiv', 'aktiv', 'pausiert', 'abgeschlossen'];

const REPORTS = [
    'Besuch verlief positiv. Familie zeigte gute Fortschritte bei der Tagesstrukturierung.',
    'Konfliktgespräch mit Eltern und ältestem Kind. Vereinbarungen für nächste Woche getroffen.',
    'Krisenintervention nach Eskalation am Wochenende. Beruhigung der Situation.',
    'Erörterung schulischer Probleme. Kontakt zur Klassenlehrerin hergestellt.',
    'Hilfestellung beim Ausfüllen der Anträge zum Bildungspaket.',
    'Erstgespräch mit neuem Familienmitglied. Vertrauensaufbau im Vordergrund.',
    '',
];

const HILFE_GOALS = [
    'Stabile Tagesstruktur etablieren',
    'Regelmäßiger Schulbesuch sicherstellen',
    'Elterngespräche zur Konfliktlösung durchführen',
    'Kontakt zu Nachbarschaftshilfe aufnehmen',
    'Haushaltsführung und Finanzplanung stabilisieren',
    'Bindung zu allen Kindern aufbauen',
    'Therapieanbindung organisieren',
];

const GOAL_STATUSES: Array<'offen' | 'in Bearbeitung' | 'erreicht'> = [
    'offen', 'in Bearbeitung', 'in Bearbeitung', 'erreicht',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)] as T;
}

function pickSome<T>(arr: readonly T[], count: number): T[] {
    const copy = [...arr];
    const out: T[] = [];
    for (let i = 0; i < count && copy.length > 0; i++) {
        const idx = Math.floor(Math.random() * copy.length);
        out.push(copy.splice(idx, 1)[0] as T);
    }
    return out;
}

function daysAgo(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(8 + Math.floor(Math.random() * 9), pick([0, 15, 30, 45]), 0, 0);
    return d;
}

function daysAhead(days: number): Date {
    return daysAgo(-days);
}

// ─── Seed ────────────────────────────────────────────────────────────────────

async function run() {
    await mongoose.connect(MONGO_URI as string, { dbName: 'cms' });
    console.log('→ MongoDB verbunden');

    console.log('→ Lösche bestehende Collections…');
    await Promise.all([
        User.deleteMany({}),
        Client.deleteMany({}),
        Appointment.deleteMany({}),
        Hilfeplan.deleteMany({}),
        RefreshToken.deleteMany({}),
        DocumentModel.deleteMany({}),
    ]);

    // Admin
    const admin = await User.create(ADMIN);
    console.log(`✓ Admin: ${admin.email} (Passwort: ${ADMIN.password})`);

    // Fachkräfte
    const fachkraefte = await Promise.all(
        FACHKRAEFTE.map((fk) =>
            User.create({ ...fk, password: 'fk12345', role: 'fachkraft' }),
        ),
    );
    console.log(`✓ ${fachkraefte.length} Fachkräfte (Passwort jeweils: fk12345)`);

    // Klienten
    const clientsData = Array.from({ length: 20 }).map((_, i) => {
        const childCount = Math.floor(Math.random() * 4); // 0–3 Kinder
        const children = pickSome(CHILD_NAMES, childCount).map((name) => ({
            name,
            age: 2 + Math.floor(Math.random() * 15),
        }));
        const status = pick(STATUSES);
        const fkCount = Math.random() < 0.3 ? 2 : 1; // 30 % Tandem
        const assigned = pickSome(fachkraefte, fkCount).map((u) => u._id);

        // startDate zwischen 18 und 1 Monat in der Vergangenheit
        const monthsBack = 1 + Math.floor(Math.random() * 18);
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsBack);

        return {
            familyName: pick(FAMILY_NAMES),
            firstName: pick(FIRST_NAMES),
            caseNumber: `JA-${2023 + Math.floor(Math.random() * 3)}-${String(1000 + i).padStart(4, '0')}`,
            children,
            address: pick(ADDRESSES),
            phone:
                Math.random() < 0.8
                    ? `+49 ${150 + Math.floor(Math.random() * 30)} ${1000000 + Math.floor(Math.random() * 8999999)}`
                    : undefined,
            jugendamtContact: pick(JA_CONTACTS),
            assignedFachkraefte: assigned,
            nextReport: daysAhead(7 + Math.floor(Math.random() * 14)),
            weeklyHoursQuota: pick([3, 4, 4, 5, 6, 6, 8]),
            status,
            startDate,
        };
    });

    const clients = await Client.insertMany(clientsData);
    console.log(`✓ ${clients.length} Klienten`);

    // Termine + Hilfepläne
    const allAppointments: any[] = [];
    const allHilfeplaene: any[] = [];

    for (const client of clients) {
        if (client.status === 'abgeschlossen') continue;

        const assignedFks = client.assignedFachkraefte;
        if (assignedFks.length === 0) continue;

        // 4–10 vergangene Termine über die letzten ~5 Wochen
        const pastCount = 4 + Math.floor(Math.random() * 7);
        for (let i = 0; i < pastCount; i++) {
            const daysBack = 1 + Math.floor(Math.random() * 35);
            const status = Math.random() < 0.1
                ? 'ausgefallen'
                : 'durchgeführt';
            // Bei 'durchgeführt' zu ~15 % leerer Bericht (= überfällig).
            // Mongoose lehnt '' wegen required ab → '-' als Sentinel,
            // den die Workload-Statistik als "kein Bericht" wertet.
            const rawReport =
                status === 'durchgeführt'
                    ? Math.random() < 0.85
                        ? pick(REPORTS.filter((r) => r !== ''))
                        : '-'
                    : 'Termin ausgefallen';
            allAppointments.push({
                clientId: client._id,
                createdBy: pick(assignedFks),
                type: pick(APPT_TYPES),
                status,
                date: daysAgo(daysBack),
                durationHours: pick([0, 1, 1, 1, 2]),
                durationMinutes: pick([0, 15, 30, 45]),
                report: rawReport,
            });
        }

        // 1–3 zukünftige (geplant)
        const futureCount = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < futureCount; i++) {
            allAppointments.push({
                clientId: client._id,
                createdBy: pick(assignedFks),
                type: pick(APPT_TYPES),
                status: 'geplant',
                date: daysAhead(1 + Math.floor(Math.random() * 14)),
                durationHours: pick([1, 1, 2]),
                durationMinutes: pick([0, 15, 30, 45]),
                report: 'Noch nicht durchgeführt',
            });
        }

        // Hilfeplan: ~80 %
        if (Math.random() < 0.8) {
            const goals = pickSome(HILFE_GOALS, 3 + Math.floor(Math.random() * 3))
                .map((goal) => ({ goal, status: pick(GOAL_STATUSES) }));

            allHilfeplaene.push({
                clientId: client._id,
                content: `Hilfeplan für Familie ${client.familyName}. Schwerpunkte: Stärkung der Erziehungskompetenz, Verbesserung der häuslichen Strukturen, schulische Förderung.`,
                goals,
                createdBy: pick(assignedFks),
                version: 1 + Math.floor(Math.random() * 3),
            });
        }
    }

    await Appointment.insertMany(allAppointments);
    console.log(`✓ ${allAppointments.length} Termine`);

    await Hilfeplan.insertMany(allHilfeplaene);
    console.log(`✓ ${allHilfeplaene.length} Hilfepläne`);

    await mongoose.disconnect();
    console.log('\n✅ Seed abgeschlossen.');
    console.log(`   Login Admin:     ${ADMIN.email} / ${ADMIN.password}`);
    console.log(`   Login Fachkraft: ${fachkraefte[0]!.email} / fk12345`);
}

run().catch((err) => {
    console.error('❌ Seed fehlgeschlagen:', err);
    process.exit(1);
});
