export type LicenseStatus = {
  valid: boolean;
  status?: string;
  message?: string;
  company_name?: string;
  trial_ends_at?: string | null;
  offline?: boolean;
};

export {};

declare global {
  interface Window {
    posChifa?: {
      printCurrentWindow: () => Promise<boolean>;
      listPrinters: () => Promise<{ name: string; displayName: string; description: string }[]>;
      getPrinterConfig: () => Promise<{ customer: string; local: string }>;
      savePrinterConfig: (config: { customer: string; local: string }) => Promise<{ customer: string; local: string }>;
      getLicenseStatus: () => Promise<LicenseStatus>;
      activateLicense: (licenseKey: string) => Promise<LicenseStatus>;
    };
  }
}
