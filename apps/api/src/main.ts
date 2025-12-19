import app from './app';
import { db } from './lib/db';

const PORT = process.env.PORT || 3001;

async function main() {
    try {
        await db.$connect();
        console.log('Connected to Database');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();
