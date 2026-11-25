import type { DB } from "@repo/db";
import { concat } from "./index.js";
import type {
  LogActionUnion,
  LogIdUpdateTracker,
  LogUpdateTracker,
  SerializedLogValue,
} from "./types.js";

export function serialize(input: LogActionUnion): SerializedLogValue[] {
  switch (input.action) {
    case "CREATE_USER":
      return [concat("str", input.data.name)];
    case "UPDATE_USER":
      return [
        serializeIf(input.data.name),
        serializeIdIf(input.data.imageId, "media"),
      ];
    default:
      return [];
  }
}

function serializeIf(value: LogUpdateTracker | undefined): SerializedLogValue {
  if (value?.new === undefined) return "_";
  return concat("from", value.old ?? "_", "to", value.new);
}

function serializeIdIf(
  value: LogIdUpdateTracker,
  tableName: keyof DB,
): SerializedLogValue {
  if (value?.new === undefined) return "_";
  return concat("fromId", tableName, value.old, "to", value.new);
}
