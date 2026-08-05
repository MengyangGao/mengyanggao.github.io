import { readFile } from 'node:fs/promises';
import Ajv from 'ajv';

const METADATA_PATH = process.argv[2] || 'src/data/link-metadata.json';
const SCHEMA_PATH = process.argv[3] || 'src/data/schemas/link-metadata.schema.json';

async function readJson(path) {
  const text = await readFile(path, 'utf-8');
  return JSON.parse(text);
}

async function main() {
  const [metadata, schema] = await Promise.all([readJson(METADATA_PATH), readJson(SCHEMA_PATH)]);
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(metadata);

  if (!valid) {
    console.error(`Metadata schema validation failed for ${METADATA_PATH}`);
    for (const error of validate.errors || []) {
      const location = error.instancePath || '/';
      console.error(`- ${location}: ${error.message}`);
    }
    process.exit(1);
  }

  console.log(`Metadata schema validation passed: ${METADATA_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
