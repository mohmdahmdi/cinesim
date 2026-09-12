type CookieKey = "authToken" | "userPreferences" | "sessionId";

const cookieKeys = {
  authToken: "authToken",
  userPreferences: "userPreferences",
  sessionId: "sessionId",
} as const;

interface CookieValues {
  authToken: string | null;
  userPreferences: string | null;
  sessionId: string | null;
}

interface CookieOptions {
  expires?: Date | number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

const cookieManager = {

  get: <K extends CookieKey>(key: K): CookieValues[K] => {
    if (typeof document === "undefined") return null as CookieValues[K];

    const name = cookieKeys[key] + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(";");

    for (let i = 0; i < cookieArray.length; i++) {
      const cookie = cookieArray[i].trim();
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length, cookie.length) as CookieValues[K];
      }
    }

    return null as CookieValues[K];
  },

  set: <K extends CookieKey>(
    key: K,
    value: CookieValues[K],
    options: CookieOptions = {}
  ): void => {
    if (typeof document === "undefined") return;

    try {
      const cookieName = cookieKeys[key];
      let cookieString = `${cookieName}=${encodeURIComponent(value as string)}`;

      if (options.expires) {
        if (typeof options.expires === "number") {
          const date = new Date();
          date.setTime(date.getTime() + options.expires * 24 * 60 * 60 * 1000);
          cookieString += `; expires=${date.toUTCString()}`;
        } else {
          cookieString += `; expires=${options.expires.toUTCString()}`;
        }
      }

      if (options.path) cookieString += `; path=${options.path}`;
      if (options.domain) cookieString += `; domain=${options.domain}`;
      if (options.secure) cookieString += "; secure";
      if (options.sameSite) cookieString += `; samesite=${options.sameSite}`;

      document.cookie = cookieString;
    } catch (error) {
      console.error(`Error setting cookie "${key}":`, error);
    }
  },

  remove: (key: CookieKey, path?: string, domain?: string): void => {
    if (typeof document === "undefined") return;

    const cookieName = cookieKeys[key];
    let cookieString = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;

    if (path) cookieString += `; path=${path}`;
    if (domain) cookieString += `; domain=${domain}`;

    document.cookie = cookieString;
  },

  clear: (path?: string, domain?: string): void => {
    if (typeof document === "undefined") return;

    Object.values(cookieKeys).forEach((key) => {
      let cookieString = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      if (path) cookieString += `; path=${path}`;
      if (domain) cookieString += `; domain=${domain}`;
      document.cookie = cookieString;
    });
  },

  isAvailable: (): boolean => {
    try {
      if (typeof document === "undefined") return false;

      const testKey = "__cookieTest";
      document.cookie = `${testKey}=test; max-age=60`; // 1 minute expiry
      const isSet = document.cookie.indexOf(testKey) !== -1;
      document.cookie = `${testKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;

      return isSet;
    } catch {
      return false;
    }
  },

  getAll: (): Record<string, string> => {
    if (typeof document === "undefined") return {};

    const cookies: Record<string, string> = {};
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(";");

    cookieArray.forEach((cookie) => {
      const [name, value] = cookie.trim().split("=");
      if (name && value) {
        cookies[name] = value;
      }
    });

    return cookies;
  },

  has: function <K extends CookieKey>(key: K): boolean {
    return this.get(key) !== null;
  },
};

export default cookieManager;
