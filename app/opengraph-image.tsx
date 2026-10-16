import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Link preview card for WhatsApp, iMessage, Slack, X… (applies to every page). Built once at build time.
export const alt = "alonr: swap your London student room";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INDIGO = "#4f46e5";

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public/alonr-logo.jpeg"));
  const logoSrc = `data:image/jpeg;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #eef2ff 0%, #ffffff 55%, #fff1f2 100%)",
          color: "#0f172a",
          fontFamily: "sans-serif",
        }}
      >
        {/* The alonr wordmark (public/alonr-logo.jpeg) on a white tile. */}
        <div style={{ display: "flex", width: 220, height: 160, alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: 28, boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse needs a plain img */}
          <img src={logoSrc} width={200} height={200} alt="" style={{ objectFit: "cover", width: 200, height: 145 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            Swap your London student room
          </span>
          <span style={{ fontSize: 36, color: "#475569" }}>
            Compare halls on a map, find a mutual swap, chat with verified students.
          </span>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {["Room swaps", "Contract releases", "House share"].map((label) => (
            <span
              key={label}
              style={{ fontSize: 28, fontWeight: 600, color: INDIGO, background: "#e0e7ff", borderRadius: 999, padding: "10px 24px" }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
