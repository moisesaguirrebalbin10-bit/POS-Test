export {};

declare global {
  interface Window {
    posChifa?: {
      printCurrentWindow: () => Promise<boolean>;
      listPrinters: () => Promise<{ name: string; displayName: string; description: string }[]>;
      getPrinterConfig: () => Promise<{ customer: string; local: string }>;
      savePrinterConfig: (config: { customer: string; local: string }) => Promise<{ customer: string; local: string }>;
    };
  }
}
