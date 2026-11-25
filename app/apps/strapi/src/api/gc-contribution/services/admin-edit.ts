import { amendmentData, analysisSnapshot } from "./reference-amendment";

const editableFields = new Set([
  "bookA_textExcerpt", "bookB_textExcerpt", "connectionType", "connectionNature",
  "isSimilarityIdeas", "isBiographical", "isOther", "explainConnection", "referenceDetails",
  "connectionUncertain", "originComment", "supportingReference",
]);

export function validAdminEditData(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const fields = Object.keys(data);
  if (!fields.length || fields.some(field => !editableFields.has(field))) return false;
  const value = data as Record<string, unknown>;
  const text = (v: unknown, required = false) => v == null
    ? !required
    : typeof v === "string" && v.length <= 65_535 && (!required || !!v.trim());
  const ref = value.referenceDetails as Record<string, any> | null | undefined;
  const validSpecificity = ref === undefined || ref === null ||
    typeof ref === "object" && !Array.isArray(ref) &&
    Object.keys(ref).sort().join(",") === "effectiveLevel,explicitLevel,implicitLevel" &&
    ["none", "author", "work", "passage"].includes(ref.explicitLevel) &&
    [null, "author", "work", "passage"].includes(ref.implicitLevel) &&
    ["author", "work", "passage"].includes(ref.effectiveLevel);
  return validSpecificity && text(value.bookA_textExcerpt, true) && text(value.bookB_textExcerpt) &&
    text(value.explainConnection) &&
    text(value.originComment) && text(value.supportingReference) &&
    (value.connectionType === undefined || value.connectionType === null || ["explicit", "implicit"].includes(String(value.connectionType))) &&
    (value.connectionNature === undefined || value.connectionNature === null || ["agreement", "neutral / unsure", "opposition", "neutral", "mixed"].includes(String(value.connectionNature))) &&
    ["isSimilarityIdeas", "isBiographical", "isOther", "connectionUncertain"].every(key =>
      value[key] === undefined || value[key] === null || typeof value[key] === "boolean");
}

/** Validate against the locked row, never a client-supplied target identity. */
export function adminEditData(current: any, input: Record<string, unknown>) {
  if (!validAdminEditData(input)) throw Object.assign(new Error("Invalid administrator edit."), { status: 400 });
  if (current.referenceDetails) {
    return amendmentData(current, { ...analysisSnapshot(current), ...input });
  }
  // Historical records may already lack analysis. Do not invent a specificity
  // or force a bulk conversion merely to correct their source quotation.
  if (input.referenceDetails != null) {
    throw Object.assign(new Error("Historical specificity remains unclassified."), { status: 400 });
  }
  const { referenceDetails, ...data } = input;
  return data;
}
