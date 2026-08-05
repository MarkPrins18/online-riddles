import { ImageResponse } from "next/og";

// Apple touch icon, Android small, Android large/maskable — anything else
// 404s rather than silently generating an arbitrary size.
const ALLOWED_SIZES = [180, 192, 512] as const;

// The icon never depends on request data — pre-rendering the 3 known
// sizes at build time (Node runtime, not edge) means they're served as
// static assets instead of regenerated on every request.
export function generateStaticParams() {
  return ALLOWED_SIZES.map((size) => ({ size: String(size) }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await params;
  const size = Number(sizeParam);
  if (!ALLOWED_SIZES.includes(size as (typeof ALLOWED_SIZES)[number])) {
    return new Response("Not found", { status: 404 });
  }

  // Generous inner margin (~15%) so the same design also works as a
  // "maskable" icon — Android is free to crop the outer ring away into a
  // circle/squircle without cutting into the question mark.
  const ringInset = Math.round(size * 0.1);
  const ringWidth = Math.max(2, Math.round(size * 0.018));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#241a10",
        }}
      >
        <div
          style={{
            width: size - ringInset * 2,
            height: size - ringInset * 2,
            borderRadius: "9999px",
            border: `${ringWidth}px solid #d9a441`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: size * 0.42,
              fontWeight: 700,
              fontStyle: "italic",
              color: "#d9a441",
              lineHeight: 1,
              transform: "translateY(-2%)",
            }}
          >
            ?
          </div>
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
