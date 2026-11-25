/**
 * Reviewed quotations take precedence over unverified CMS copy.
 * English wording follows the linked edition; classical sayings are attributed
 * to the text preserving them, not presented as verbatim historical speech.
 */
export const VERIFIED_QUOTES: Record<string, { text: string; source: string; url: string }> = {
  Socrates: {
    text: "The life which is unexamined is not worth living.",
    source: "Plato, Apology, 38a (Jowett)",
    url: "https://classics.mit.edu/Plato/apology.html",
  },
  Plato: {
    text: "Wonder is the feeling of a philosopher, and philosophy begins in wonder.",
    source: "Theaetetus, 155d (Jowett)",
    url: "https://classics.mit.edu/Plato/theatu.html",
  },
  Aristotle: {
    text: "All men by nature desire to know.",
    source: "Metaphysics, I.1, 980a (Ross)",
    url: "https://classics.mit.edu/Aristotle/metaphysics.1.i.html",
  },
  Confucius: {
    text: "Learning without thought is labor lost; thought without learning is perilous.",
    source: "Analects, 2.15 (Legge)",
    url: "https://www.analects.net/analects/2-wei-zheng/2-xue-er",
  },
  Laozi: {
    text: "The journey of a thousand li commenced with a single step.",
    source: "Tao Te Ching, 64 (Legge)",
    url: "https://www.gutenberg.org/files/216/216-h/216-h.htm",
  },
  "Gautama Buddha": {
    text: "Mind precedes all mental states. Mind is their chief; they are all mind-wrought.",
    source: "Dhammapada, 1 (Buddharakkhita)",
    url: "https://www.accesstoinsight.org/tipitaka/kn/dhp/dhp.01.budd.html",
  },
  Avicenna: {
    text: "What is affirmed is distinct from what is not affirmed.",
    source: "The Healing, On the Soul, I.1 (Adamson & Benevich)",
    url: "https://epub.ub.uni-muenchen.de/66014/1/66014.pdf",
  },
  Averroes: {
    text: "We should accept from them gladly and gratefully whatever in these books accords with the truth.",
    source: "The Decisive Treatise (Hourani)",
    url: "https://media.bloomsbury.com/rep/files/primary-source-15-averroes.pdf",
  },
  "Al-Ghazali": {
    text: "The thirst for knowledge was innate in me from an early age.",
    source: "Deliverance from Error (Field)",
    url: "https://www.ghazali.org/books/md/gz101.htm",
  },
  Maimonides: {
    text: "There are eight levels in charity, each level surpassing the other.",
    source: "Mishneh Torah, Gifts to the Poor, 10:7 (Touger)",
    url: "https://www.sefaria.org/Mishneh_Torah%2C_Gifts_to_the_Poor.10.7?lang=bi",
  },
  "Rene Descartes": {
    text: "I think, therefore I am.",
    source: "Discourse on the Method, IV (Veitch)",
    url: "https://www.gutenberg.org/files/59/59-h/59-h.htm",
  },
  "Baruch Spinoza": {
    text: "An emotion can only be controlled or destroyed by another emotion contrary thereto, and with more power for controlling emotion.",
    source: "Ethics, IV, Proposition 7 (Elwes)",
    url: "https://en.wikisource.org/wiki/Ethics_(Spinoza)/Part_4",
  },
  "Immanuel Kant": {
    text: "Act only on that maxim whereby thou canst at the same time will that it should become a universal law.",
    source: "Groundwork of the Metaphysics of Morals, II (Abbott)",
    url: "https://www.gutenberg.org/files/5682/5682-h/5682-h.htm",
  },
  "Friedrich Nietzsche": {
    text: "If a man knows the wherefore of his existence, then the manner of it can take care of itself.",
    source: "Twilight of the Idols, Maxims and Missiles, 12 (Ludovici)",
    url: "https://www.gutenberg.org/cache/epub/52263/pg52263-images.html",
  },
  "Ludwig Wittgenstein": {
    text: "Whereof one cannot speak, thereof one must be silent.",
    source: "Tractatus Logico-Philosophicus, 7 (Ogden)",
    url: "https://plato.stanford.edu/entries/wittgenstein/",
  },
  "Hannah Arendt": {
    text: "There are no dangerous thoughts; thinking itself is dangerous.",
    source: "Interview with Roger Errera, 1973",
    url: "https://hac.bard.edu/amor-mundi/interview-with-an-independent-thinker-2011-11-11",
  },
  "William James": {
    text: "My experience is what I agree to attend to.",
    source: "The Principles of Psychology, XI, p. 402",
    url: "https://psychclassics.yorku.ca/James/Principles/prin11.htm",
  },
  "Frantz Fanon": {
    text: "O my body, always make me a man who questions!",
    source: "Black Skin, White Masks, conclusion (Philcox)",
    url: "https://plato.stanford.edu/entries/frantz-fanon/",
  },
  "Simone Weil": {
    text: "Absolutely unmixed attention is prayer.",
    source: "Gravity and Grace, Attention and Will (Craufurd)",
    url: "https://www.themarginalian.org/2015/08/19/simone-weil-attention-gravity-and-grace",
  },
};

const ALIASES: Record<string, string> = {
  "Ibn Sina": "Avicenna",
  "Ibn Rushd": "Averroes",
  "René Descartes": "Rene Descartes",
  "Lao Tzu": "Laozi",
  Buddha: "Gautama Buddha",
};

export function getVerifiedQuote(name: string) {
  return VERIFIED_QUOTES[ALIASES[name] ?? name];
}

export function QuoteCitation({ name }: { name: string }) {
  const quote = getVerifiedQuote(name);
  if (!quote) return null;
  return (
    <a
      href={quote.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 block text-[10px] leading-relaxed text-gold/70 underline decoration-gold/30 underline-offset-4 hover:text-gold focus-visible:outline focus-visible:outline-gold"
    >
      Source: {quote.source}
    </a>
  );
}
