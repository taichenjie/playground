/*
 * Copies Who's That? photos from public/faces to a Cloudflare R2 bucket.
 * Only photos the bucket doesn't have yet are uploaded, so it's safe to run
 * after every `npm run faces`.
 *
 * Needs these in .env.local (never commit them):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *
 * Usage: npm run faces:upload            (upload)
 *        npm run faces:upload -- --dry-run (list what would be uploaded)
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const DIR = "public/faces";
const PREFIX = "faces/";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const need = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"] as const;
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing in .env.local: ${missing.join(", ")}. See "Who's That? photos" in the README.`);
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const bucket = process.env.R2_BUCKET!;
const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
});

async function existingKeys() {
  const keys = new Set<string>();
  let token: string | undefined;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX, ContinuationToken: token }));
    for (const o of page.Contents ?? []) if (o.Key) keys.add(o.Key);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function main() {
  const local = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".webp")) : [];
  const remote = await existingKeys();
  const todo = local.filter((f) => !remote.has(PREFIX + f));
  console.log(`${local.length} local photos, ${remote.size} already in R2, ${todo.length} to upload.`);
  if (dryRun) return todo.forEach((f) => console.log(`  would upload ${PREFIX}${f}`));

  let done = 0;
  const queue = [...todo];
  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: PREFIX + f,
          Body: readFileSync(`${DIR}/${f}`),
          ContentType: "image/webp",
          // Keys include a content hash, so a photo at a given URL never changes.
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      if (++done % 25 === 0) console.log(`  ${done}/${todo.length}`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`Uploaded ${done} photos.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
