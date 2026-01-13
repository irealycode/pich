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
    console.log('Authenticated ✅');
  } else {
    if (onFailure) {
        onFailure("Authentication failed")
    }
    console.log('Authentication failed ❌');
  }
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
