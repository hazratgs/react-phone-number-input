/// <reference types="react">
declare module "react-phone-number-input/max" {

  export type NumberFormat = "NATIONAL" | "National" | "INTERNATIONAL" | "International";

  export function formatPhoneNumber(value?: string): string;
  export function formatPhoneNumber(value: string, format?: NumberFormat): string;

  export function formatPhoneNumberIntl(value?: string): string;

  export function isValidPhoneNumber(value?: string): boolean;

  export type FlagsMap = { [countryCode: string]: React.Component<object, object> };

  export default isValidPhoneNumber
}

// See:
// https://github.com/catamphetamine/react-phone-number-input/issues/195