import { create } from "./create.js";
import { linkToEntity } from "./link-to-entity.js";
import { markPermanent } from "./mark-permanent.js";
import { markTemporary } from "./mark-temporary.js";
import { unlink } from "./unlink.js";
import { updateEntityMappings } from "./update-entity-mappings.js";
import { update } from "./update.js";

export const mediaActions = {
  create,
  update,
  markPermanent,
  markTemporary,
  linkToEntity,
  updateEntityMappings,
  unlink,
};
