declare module 'pdf2json' {
  export default class PDFParser {
    constructor();
    on(event: 'pdfParser_dataReady', handler: (data: any) => void): void;
    on(event: 'pdfParser_dataError', handler: (error: any) => void): void;
    parseBuffer(buffer: Buffer): void;
    parseFile(filePath: string): void;
  }
} 