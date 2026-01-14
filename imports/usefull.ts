import * as LocalAuthentication from 'expo-local-authentication';

export function sleep(ms : number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function replaceWith(str : string,char : string) : string {
    let r : string = ""
    for (let i = 0; i < str.length; i++) {
        r += char
    }
    return r
}

interface authOut {
    onSuccess : () => void
    onFailure? : (reason : string) => void
}

async function canUseFaceId() {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  return types.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
  );
}

export async function authenticate({onSuccess,onFailure}:authOut) {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) {
    if (onFailure) {
        onFailure("Biometric hardware not available")
    }
    return;
  }

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) {
    if (onFailure) {
        onFailure("No biometrics enrolled")
    }
    return;
  }

  const canUseFaceid = await canUseFaceId()
  console.log("can use face id:", canUseFaceid)


  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: canUseFaceid
      ? 'Authenticate with Face ID'
      : 'Authenticate',
    fallbackLabel: 'Use passcode',
    cancelLabel: 'Cancel',
  });

  if (result.success) {
    onSuccess()
  } else {
    if (onFailure) {
        onFailure("Authentication failed")
    }
  }
}

export function randomKey() {
  const len = 32
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#@!&%$?#@!&%$#@!&%$'
  let result = ''
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}


interface ColorResult {
  color: string;
  slightly_darker: string;
  tooWhite: boolean;
}

export function stringToColor(input: string): ColorResult {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }

  const hue = Math.abs(hash) % 360;
  const saturation = 65;
  const lightness = 55;

  const color = hslToHex(hue, saturation, lightness);
  const slightly_darker = hslToHex(hue, saturation, Math.max(lightness - 12, 0));

  const tooWhite = lightness >= 70;

  return { color, slightly_darker, tooWhite };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return (
    "#" +
    [f(0), f(8), f(4)]
      .map(x =>
        Math.round(255 * x)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}


export function formatRelativeDate(input: Date | string | number): string {
  const date = new Date(input);
  const now = new Date();

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (isSameDay(date, now)) {
    return formatTime(date);
  }

  if (diffDays <= 1) {
    return `Yesterday at ${formatTime(date)}`;
  }

  if (diffDays < 7) {
    return `${diffDays} days ago at ${formatTime(date)}`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago at ${formatTime(date)}`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago at ${formatTime(date)}`;
  }

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears > 1 ? 's' : ''} ago at ${formatTime(date)}`;
}
