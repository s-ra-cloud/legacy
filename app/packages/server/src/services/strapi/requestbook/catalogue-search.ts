import { z } from "zod";
import { fetcher } from "../../../strapi/fetcher.js";

export const catalogueSearchQuerySchema = z.object({
  entityType: z.enum(["author", "work"]),
  search: z.string().trim().min(1).max(100),
  cursor: z.coerce.number().int().positive().max(10000).default(1),
  limit: z.coerce.number().int().positive().max(25).default(10),
});

const authorSchema = z.object({
  documentId: z.string().min(1),
  firstName: z.string().nullish(),
  lastName: z.string(),
  birthDeath: z.string().nullish(),
});
export const catalogueSearchResultSchema = z.object({
  documentId: z.string().min(1),
  label: z.string(),
  detail: z.string().nullable(),
  author: z.object({
    documentId: z.string().min(1),
    name: z.string(),
  }).nullable(),
});
export const catalogueSearchPageSchema = z.object({
  data: z.array(catalogueSearchResultSchema),
  meta: z.object({
    pagination: z.object({
      page: z.number(), pageCount: z.number(), total: z.number(),
    }),
  }),
});
export type CatalogueSearchResult = z.infer<typeof catalogueSearchResultSchema>;
export type CatalogueSearchPage = z.infer<typeof catalogueSearchPageSchema>;

const authorName = (author: z.infer<typeof authorSchema>) =>
  [author.firstName, author.lastName].filter(Boolean).join(" ");

/** Read only published identities, without fetching book text, media or contributors. */
export async function searchPublishedCatalogue(input: z.input<typeof catalogueSearchQuerySchema>) {
  const query = catalogueSearchQuerySchema.parse(input);
  const isAuthor = query.entityType === "author";
  const terms = query.search.split(/\s+/).map(term => term.replace(/[\\%_]/g, "\\$&"));
  const contains = (field: string, term: string) => ({ [field]: { $containsi: term } });
  const response = await fetcher<unknown>(isAuthor ? "authors" : "books", {
    status: "published",
    fields: isAuthor
      ? ["documentId", "firstName", "lastName", "birthDeath"]
      : ["documentId", "BookTitle", "OriginalPublicationDate"],
    populate: isAuthor ? {} : { author: { fields: ["documentId", "firstName", "lastName", "birthDeath"] } },
    filters: {
      publishedAt: { $notNull: true },
      $and: terms.map(term => ({
        $or: isAuthor
          ? [contains("firstName", term), contains("lastName", term)]
          : [contains("BookTitle", term), { author: {
            $or: [contains("firstName", term), contains("lastName", term)],
          } }],
      })),
    },
    sort: isAuthor ? ["lastName:asc", "firstName:asc", "documentId:asc"] : ["BookTitle:asc", "documentId:asc"],
    page: query.cursor,
    limit: query.limit,
  });
  if (!response) throw new Error("Published catalogue search is unavailable. Please try again.");
  const pagination = z.object({
    meta: z.object({ pagination: z.object({
      page: z.number(), pageCount: z.number(), total: z.number(),
    }) }),
  }).parse(response).meta.pagination;
  const data: CatalogueSearchResult[] = isAuthor
    ? z.object({ data: z.array(authorSchema) }).parse(response).data.map(author => ({
      documentId: author.documentId, label: authorName(author),
      detail: author.birthDeath ?? null, author: null,
    }))
    : z.object({ data: z.array(z.object({
      documentId: z.string().min(1), BookTitle: z.string(),
      OriginalPublicationDate: z.string().nullish(),
      author: authorSchema.nullish(),
    })) }).parse(response).data.map(work => ({
      documentId: work.documentId, label: work.BookTitle,
      detail: work.OriginalPublicationDate ?? null,
      author: work.author ? { documentId: work.author.documentId, name: authorName(work.author) } : null,
    }));
  return catalogueSearchPageSchema.parse({ data, meta: { pagination } });
}
