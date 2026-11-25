import {
  extractImagesFromHtml, extractZipFile, isZipFile, matchRelativePath,
  validateTextFile, type ExtractedImage, type ZipFileData,
} from "./book-text-pipeline";

export async function prepareBookText(file: File): Promise<{
  htmlFile: File; images: ExtractedImage[]; zipData: ZipFileData | null;
}> {
  validateTextFile(file);
  if (!/\.(html?|zip)$/i.test(file.name)) throw new Error("Choose an HTML file or a ZIP containing HTML and images.");
  const zipData = isZipFile(file) ? await extractZipFile(file) : null;
  if (isZipFile(file) && !zipData) throw new Error("No HTML file found in ZIP archive.");
  const htmlFile = zipData?.htmlFile ?? new File([file], file.name, { type: "text/html" });
  validateTextFile(htmlFile);
  const html = await htmlFile.text();
  if (!html.trim() || !/<[a-z][^>]*>/i.test(html)) throw new Error("The file does not contain HTML.");
  const images = extractImagesFromHtml(html, htmlFile).map((image) => ({
    ...image,
    // Repeated references may use the same ZIP image. Embedded images stay inline.
    file: !image.isBase64 && zipData
      ? matchRelativePath(image.src, zipData.imageFiles) ?? undefined : undefined,
  }));
  return { htmlFile, images, zipData };
}
