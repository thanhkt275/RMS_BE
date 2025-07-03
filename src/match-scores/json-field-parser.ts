export class JsonFieldParser {
  static parseJsonFieldSafely(field: any): any {
    if (!field) return null;
    if (typeof field === 'object') return field;
    try {
      return JSON.parse(String(field));
    } catch (error) {
      // Optionally log error
      return null;
    }
  }

  static parseJsonFields(score: any): any {
    return {
      ...score,
      redGameElements: this.parseJsonFieldSafely(score.redGameElements),
      blueGameElements: this.parseJsonFieldSafely(score.blueGameElements),
      scoreDetails: this.parseJsonFieldSafely(score.scoreDetails),
    };
  }
}
