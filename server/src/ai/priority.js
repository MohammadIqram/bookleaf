/**
 * Extracts compact factual context facts to guide classifier priority without token bloat
 */
export function extractContextFacts(ticket, author, book) {
  let monthsElapsed = 0;
  if (book?.publicationDate) {
    const pub = new Date(book.publicationDate).getTime();
    monthsElapsed = Math.max(0, Math.round((Date.now() - pub) / (1000 * 60 * 60 * 24 * 30)));
  } else if (author?.joinedDate) {
    const joined = new Date(author.joinedDate).getTime();
    monthsElapsed = Math.max(0, Math.round((Date.now() - joined) / (1000 * 60 * 60 * 24 * 30)));
  }

  return {
    hasBookLinked: Boolean(ticket.bookId),
    bookStatus: book?.status || null,
    pendingRoyalty: book?.royaltyPending || 0,
    monthsElapsed,
  };
}

export default extractContextFacts;
