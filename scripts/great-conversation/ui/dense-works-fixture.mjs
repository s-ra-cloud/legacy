// Local stress data, not historical claims: recognizable titles are combined
// with synthetic volumes and connections. No service or snapshot is modified.
const books = [
  ["Prolegomena to Any Future Metaphysics That Will Be Able to Come Forward as Science", "Kant", "1783"],
  ["The World as Will and Representation: Supplements to the Four Books", "Schopenhauer", "1844"],
  ["Philosophical Investigations / Philosophische Untersuchungen", "Wittgenstein", "1953"],
  ["Either/Or: A Fragment of Life", "Kierkegaard", "1843"],
  ["道德經：道可道非常道名可名非常名天下萬物生於有有生於無", "老子", "Unknown"],
  ["مقدمة في الفلسفة والتاريخ والعمران البشري", "ابن خلدون", "1377"],
  ["Περὶ ψυχῆς: φιλοσοφία καὶ ἐπιστήμη", "Ἀριστοτέλης", "350 BCE"],
  ["Über die ästhetische Erziehung des Menschen in einer Reihe von Briefen", "Schiller", "1795"],
  ["A Thousand Plateaus: Capitalism and Schizophrenia", "Deleuze / Guattari", "1980"],
  ["Dialektik der Aufklärung: Philosophische Fragmente", "Horkheimer / Adorno / Habermas", "1947"],
  ["An Inquiry into the Nature and Causes of the Wealth of Nations", "Smith", "1776"],
  // No spaces and astral characters exercise hard wrapping without broken UTF-16.
  ["𐐀𐐁𐐂𐐃𐐄𐐅𐐆𐐇𐐈𐐉𐐊𐐋𐐌𐐍𐐎𐐏𐐐𐐑𐐒𐐓𐐔𐐕𐐖𐐗𐐘", "Wittgenstein / Schopenhauer / Kierkegaard", ""],
];

function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const denseWorks = freeze({
  nodes: Array.from({ length: 72 }, (_, i) => {
    const [title, authorSurname, publicationYear] = books[i % books.length];
    const name = `${title} · Volume ${Math.floor(i / books.length) + 1}`;
    return {
      id: `dense-work-${i}`, name, workTitle: name, authorSurname,
      ...(publicationYear ? { publicationYear } : {}),
    };
  }),
  links: Array.from({ length: 72 }, (_, i) => [
    ...[1, 2, 5].map((step) => ({
      id: `dense-edge-${i}-${step}`, source: `dense-work-${i}`, target: `dense-work-${(i + step) % 72}`,
      stance: ["approval", "disapproval", "neutral", "mixed"][i % 4], uncertain: false,
    })),
    ...(i > 5 && i < 67 ? [{
      id: `dense-hub-${i}`, source: "dense-work-0", target: `dense-work-${i}`,
      stance: "approval", uncertain: false,
    }] : []),
  ]).flat(),
});
