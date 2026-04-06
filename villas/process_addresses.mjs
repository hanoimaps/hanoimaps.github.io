import fs from 'fs/promises';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  const args = process.argv.slice(2);
  let dryRunCount = 0;
  let startFrom = 0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRunCount = parseInt(args[i + 1], 10) || 3;
      i++;
    } else if (args[i] === '--start-from') {
      startFrom = parseInt(args[i + 1], 10) || 0;
      i++;
    }
  }

  console.log(`Starting CSV-to-GeoJSON Pipeline...`);
  if (dryRunCount > 0) {
    console.log(`DRY RUN MODE: Will only process ${dryRunCount} rows and output to console.`);
  }

  // 1. Load context data
  const streetsGeojson = JSON.parse(await fs.readFile(path.join(rootDir, 'bio_streets.geojson'), 'utf8'));
  
  // Build a mapping from French name -> Vietnamese modern name
  const streetMapping = {};
  for (const feature of streetsGeojson.features) {
    if (feature.properties.french_name && feature.properties.name) {
      streetMapping[feature.properties.french_name] = feature.properties.name;
    }
  }

  // 2. Load target data.json
  const dataPath = path.join(__dirname, 'data.json');
  let dataJson = { type: "FeatureCollection", features: [] };
  try {
    dataJson = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  } catch (err) {
    console.warn('Could not read existing data.json, starting fresh.');
  }

  // Find highest ID to start from
  let maxIdNum = 38; // Default if none found (as HN0038)
  for (const f of dataJson.features) {
    if (f.properties && f.properties.id) {
      const match = f.properties.id.match(/^HN(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxIdNum) maxIdNum = num;
      }
    }
  }
  let nextIdNum = maxIdNum + 1;

  // 3. Load CSV
  const csvContent = await fs.readFile(path.join(__dirname, 'new_addresses.csv'), 'utf8');
  const records = parse(csvContent, { skip_empty_lines: true, from: 2 }); // Skip header row
  
  // Filter valid rows
  const validRecords = [];
  for (const row of records) {
    // Expected format: Year, Name, Profession_FR, Profession_EN, Address
    if (row.length < 5) continue;
    const address = row[4].trim();
    if (!address || address === '—') continue;
    validRecords.push(row);
  }

  console.log(`Found ${validRecords.length} valid rows to process.`);

  // Prepare context string for OpenAI
  // We don't send the entire mapping as it might be large, but a subset to guide it.
  // Actually, sending it in the prompt instructions is better. 
  // Let's just pass the mapping to the prompt as context.
  const mappingStr = JSON.stringify(streetMapping, null, 2);

  const limit = dryRunCount > 0 ? Math.min(startFrom + dryRunCount, validRecords.length) : validRecords.length;
  
  const newFeatures = [];

  for (let i = startFrom; i < limit; i++) {
    const row = validRecords[i];
    const [year, name, profFr, profEn, addressFr] = row;
    
    console.log(`Processing [${i + 1}/${validRecords.length}]: ${name} @ ${addressFr}`);

    const prompt = `
You are a historical data assistant expert in French colonial Hanoi history and modern Vietnamese geography.
We are building a dataset of historical addresses in Hanoi.

Here is the input record:
- Full Name: ${name}
- Profession (French): ${profFr}
- Profession (Vietnamese translation hint - please provide a natural Vietnamese translation): ${profEn}
- Colonial Address: ${addressFr}
- Year Recorded: ${year}

Here is a mapping of French street names to modern Vietnamese street names to help you find the coordinates:
${mappingStr}

Tasks:
1. Translate the profession naturally to Vietnamese.
2. Determine the modern Vietnamese address (including street, phường, and quận). Make a best educated guess using the mapping provided or your own historical knowledge of Hanoi. If it's a specific street number, try to map the number if possible, or just geocode the street.
3. Write a short Vietnamese description strictly following this format:
"Địa chỉ của [Full Name], một [Job Title in Vietnamese] ([Job Title in French]), được ghi nhận vào năm [Year] tại [Address Details in Vietnamese]."
4. Provide coordinates (longitude, latitude) for this location in Hanoi. Focus on pinning the street coordinates if exact number cannot be resolved.

Respond ONLY in valid JSON format exactly like this:
{
  "description": "...",
  "address_vi": "...",
  "coordinates": [longitude, latitude]
}
`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant that strictly outputs JSON." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      const resultStr = completion.choices[0].message.content;
      let result;
      try {
        result = JSON.parse(resultStr);
      } catch (parseErr) {
        console.error(`Failed to parse JSON for row ${i}. resultStr:`, resultStr);
        continue;
      }

      // Build GeoJSON Feature
      const newFeature = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: result.coordinates || [105.85, 21.02] // Fallback to center Hanoi
        },
        properties: {
          address: result.address_vi || addressFr,
          type: "3", // Default for new items or we can infer it
          id: `HN${String(nextIdNum).padStart(4, '0')}`,
          description: result.description,
          french_address: addressFr, // Useful context
          name: name,
        }
      };

      console.log(` => Result: ${result.address_vi} | ID: HN${String(nextIdNum).padStart(4, '0')}`);

      if (dryRunCount > 0) {
        console.log(JSON.stringify(newFeature, null, 2));
      } else {
        dataJson.features.push(newFeature);
        // Save intermediate status every 50 rows
        if ((i - startFrom + 1) % 50 === 0) {
          await fs.writeFile(dataPath, JSON.stringify(dataJson, null, 2));
          console.log(`Checkpoint saved at row ${i + 1}`);
        }
      }

      nextIdNum++;

      // Small delay to prevent rate limits
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      console.error(`Error processing row ${i}:`, err.message);
      // Wait a bit before continuing if error
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (dryRunCount === 0) {
    // Final save
    await fs.writeFile(dataPath, JSON.stringify(dataJson, null, 2));
    console.log(`Finished processing. Updated ${dataPath}`);
  } else {
    console.log("Dry run complete. No files were modified.");
  }
}

main().catch(console.error);
