import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadFile(fileName) {
  try {
    const filePath = path.join(__dirname, fileName);
    return fs.readFileSync(filePath, 'utf-8').trim();
  } catch (err) {
    logger.warn(`[KB] Warning: Failed to load knowledge base file: ${fileName} (${err.message})`);
    return '';
  }
}

// Load KB sections into memory once at startup
export const knowledgeBase = {
  company: loadFile('company.md'),
  royalty: loadFile('royalty.md'),
  isbn: loadFile('isbn.md'),
  printing: loadFile('printing.md'),
  distribution: loadFile('distribution.md'),
  productionStages: loadFile('production-stages.md'),
  toneGuidelines: loadFile('tone-guidelines.md'),
  examples: JSON.parse(loadFile('examples.json') || '[]'),

  /**
   * Selectively retrieves relevant KB section based on category name.
   * Minimizes prompt token consumption while maintaining factual precision.
   *
   * @param {string} category
   * @returns {string}
   */
  getRelevantSection(category) {
    switch (category) {
      case 'Royalty & Payments':
        return `${this.royalty}\n\n${this.company}`;
      case 'ISBN & Metadata Issues':
        return `${this.isbn}\n\n${this.productionStages}`;
      case 'Printing & Quality':
        return `${this.printing}\n\n${this.company}`;
      case 'Distribution & Availability':
        return `${this.distribution}\n\n${this.company}`;
      case 'Book Status & Production Updates':
        return `${this.productionStages}\n\n${this.company}`;
      case 'General Inquiry':
      default:
        return `${this.company}\n\n${this.distribution}`;
    }
  },

  /**
   * Retrieves matching few-shot example for the given category
   *
   * @param {string} category
   */
  getMatchingExample(category) {
    return this.examples.find((ex) => ex.category === category) || this.examples[this.examples.length - 1];
  },
};

export default knowledgeBase;
