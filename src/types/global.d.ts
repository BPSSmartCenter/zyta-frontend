export {};

declare global {
  interface Window {
    HSStaticMethods?: { autoInit?: () => void };
  }
}
