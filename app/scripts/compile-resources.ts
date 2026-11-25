// Get the input filename from command line arguments

const resourcesDir = "./resources";
let inputFilename = Deno.args[0];
inputFilename = inputFilename.endsWith(".ts")
  ? inputFilename
  : `${inputFilename}.ts`;
const inputFile = Deno.realPathSync(`${resourcesDir}/${inputFilename}`);

// Extract the base filename without extension
const baseFilename = inputFile.split("/").pop()?.replace(".ts", "") ?? "";

// Ensure resources directory exists
try {
  Deno.mkdirSync(resourcesDir);
} catch (error) {
  if (!(error instanceof Deno.errors.AlreadyExists)) {
    throw error;
  }
}

// Create output path
const outputFile = `${resourcesDir}/${baseFilename}.json`;

try {
  // Import the TypeScript file
  const data = await import(inputFile);

  // Convert to JSON and write to file
  await Deno.writeTextFile(outputFile, JSON.stringify(data.default, null, 4));

  console.log(`Successfully converted ${inputFile} to ${outputFile}`);
} catch (error) {
  console.error(`Error processing file: ${error.message}`);
  Deno.exit(1);
}
