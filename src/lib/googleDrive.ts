// Backup del estado en el Google Drive personal de cada usuario, usando la
// carpeta oculta `appDataFolder` (una por usuario/app, invisible en su Drive).
// Todo client-side: Google Identity Services (GIS) para el token OAuth + Drive
// REST v3 con fetch. No requiere backend.

const GIS_SRC = "https://accounts.google.com/gsi/client";
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const FILE_NAME = "unigram-backup.json";
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/** ¿Hay Client ID configurado? Si no, la UI de Drive queda deshabilitada. */
export function isDriveConfigured(): boolean {
  return !!CLIENT_ID;
}

// ─── Carga perezosa de GIS ───────────────────────────────────────────────────

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}
interface TokenClient {
  callback: (resp: TokenResponse) => void;
  requestAccessToken: (opts?: { prompt?: string }) => void;
}
interface GoogleGlobal {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (resp: TokenResponse) => void;
      }) => TokenClient;
    };
  };
}
declare global {
  interface Window {
    google?: GoogleGlobal;
  }
}

let gisPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar Google Identity Services."));
    document.head.appendChild(s);
  });
  return gisPromise;
}

// ─── Token OAuth ─────────────────────────────────────────────────────────────

let tokenClient: TokenClient | null = null;
let accessToken: string | null = null;
let tokenExpiry = 0;

async function ensureToken(interactive: boolean): Promise<string> {
  if (!CLIENT_ID) throw new Error("Falta configurar VITE_GOOGLE_CLIENT_ID.");
  if (accessToken && Date.now() < tokenExpiry - 60_000) return accessToken;

  await loadGis();
  const google = window.google!;

  return new Promise<string>((resolve, reject) => {
    const cb = (resp: TokenResponse) => {
      if (resp.error || !resp.access_token) {
        reject(new Error(resp.error || "No se obtuvo el token de Google."));
        return;
      }
      accessToken = resp.access_token;
      tokenExpiry = Date.now() + (resp.expires_in ?? 3600) * 1000;
      resolve(accessToken);
    };
    if (!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: cb,
      });
    } else {
      tokenClient.callback = cb;
    }
    // "" = intento silencioso si ya dio consentimiento; "consent" fuerza popup.
    tokenClient.requestAccessToken({ prompt: interactive ? "consent" : "" });
  });
}

// ─── Drive REST ──────────────────────────────────────────────────────────────

interface DriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

async function findBackup(token: string): Promise<DriveFile | null> {
  const r = await fetch(
    "https://www.googleapis.com/drive/v3/files" +
      "?spaces=appDataFolder&fields=files(id,name,modifiedTime)&pageSize=100",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) throw new Error(`Drive (list): ${r.status}`);
  const data = (await r.json()) as { files?: DriveFile[] };
  return data.files?.find((f) => f.name === FILE_NAME) ?? null;
}

/** Abre el popup de Google y obtiene consentimiento (una vez). */
export async function connectDrive(): Promise<void> {
  await ensureToken(true);
}

/** Sube el backup (crea el archivo o pisa el existente). */
export async function saveToDrive(json: string): Promise<void> {
  const token = await ensureToken(true);
  const existing = await findBackup(token);

  const metadata = existing ? {} : { name: FILE_NAME, parents: ["appDataFolder"] };
  const body = new FormData();
  body.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  body.append("file", new Blob([json], { type: "application/json" }));

  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart&fields=id`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id";

  const r = await fetch(url, {
    method: existing ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  if (!r.ok) throw new Error(`Drive (upload): ${r.status}`);
}

/** Baja el backup guardado. `null` si todavía no hay ninguno. */
export async function loadFromDrive(): Promise<{ json: string; modifiedTime?: string } | null> {
  const token = await ensureToken(true);
  const existing = await findBackup(token);
  if (!existing) return null;

  const r = await fetch(
    `https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) throw new Error(`Drive (download): ${r.status}`);
  return { json: await r.text(), modifiedTime: existing.modifiedTime };
}
