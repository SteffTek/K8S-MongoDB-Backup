/**
 * Imports
 */
import { execSync } from "child_process";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import * as url from "url";
import archiver from "archiver";
import S3 from 'aws-sdk/clients/s3.js';

/**
 * Load Env Vars
 */
dotenv.config();

/**
 * Create Path
 */
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const dumps = path.join(__dirname, "dumps");

/**
 * Create Folder
 */
fs.mkdirSync(dumps, { recursive: true });

/**
 * Dump MongoDB
 */
try {
    execSync(`mongodump --uri="${process.env.MONGODB_URL}" --out="${dumps}"`)
} catch (exception) {
    console.log(exception);
}

/**
 * Get Files
 */
const files = fs.readdirSync(dumps);

/**
 * ZIP File & Upload
 */
for (let i = 0; i < files.length; i++) {
    // Get File
    const file = files[i];
    // Create Promise
    await new Promise((resolve, reject) => {
        // Loop File
        console.log(`Zipping Folder ${file}`);
        // Create Archive
        const output = fs.createWriteStream(path.join(__dirname, file + ".zip"));
        const archive = archiver("zip");
        // Shid
        output.on('close', function () {
            console.log(archive.pointer() + ' total bytes');
            resolve();
        });
        archive.on('error', function (err) {
            reject(err);
        });
        // Pump Folder
        archive.pipe(output);
        archive.directory(path.join(dumps, file), false);
        archive.finalize();
    });
    console.log("Zipped all Archives");
}

/**
 * Get Env Vars
 */
const {
    CF_ACCOUNT_ID,
    CF_ACCESS_KEY_ID,
    CF_ACCES_KEY_SECRET,
    CF_BUCKET_NAME
} = process.env;

/**
 * Create S3 Instance
 */
const s3 = new S3({
    endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    accessKeyId: `${CF_ACCESS_KEY_ID}`,
    secretAccessKey: `${CF_ACCES_KEY_SECRET}`,
    signatureVersion: 'v4',
});

/**
 * Upload Files
 */
for (let i = 0; i < files.length; i++) {
    // Get File
    const FILE = files[i];
    const DATE = new Date();
    const TIME = DATE.getFullYear().toString() + pad2(DATE.getMonth() + 1) + pad2(DATE.getDate()) + pad2(DATE.getHours()) + pad2(DATE.getMinutes()) + pad2(DATE.getSeconds());
    const KEY = `mongodb_backup/${FILE}_${TIME}.zip`;
    // Create Read Stream
    const STREAM = fs.createReadStream(path.join(__dirname, `${FILE}.zip`));
    // Create Promise
    await new Promise(async (resolve, reject) => {
        s3.putObject({
            Bucket: CF_BUCKET_NAME,
            Body: STREAM,
            Key: KEY
        }, (err, data) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

/**
 * Utils
 */
function pad2(n) { return n < 10 ? '0' + n : n }