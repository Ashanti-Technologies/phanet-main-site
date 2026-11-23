"use client";

import { useEffect, useRef, useState } from "react";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { Check, Copy, Download, ImagePlus, Lock, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/lib/utils";
import { clampOffset, drawFlyer, FORMATS, type FlyerAssets, type FlyerFormat } from "./draw-flyer";

// The flyer artwork uses the camp's own type (same as the video ad), not the site's.
const display = Bricolage_Grotesque({ weight: "800", subsets: ["latin"] });
const body = Manrope({ weight: "800", subsets: ["latin"] });

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

const slug = (s: string) => s.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "me";

const SIZES: { value: FlyerFormat; label: string; hint: string }[] = [
  { value: "square", label: "Square", hint: "Post · 1080 × 1080" },
  { value: "story", label: "Story", hint: "Status · 1080 × 1920" },
];

// Caption sent with the flyer; one picked at random per share so status feeds don't all read the same.
const CAPTIONS: ((where: string) => string)[] = [
  (w) => `I'm repping Heaven on Earth Camp 2026${w}! 🔥 30 Dec – 3 Jan. Come and experience heaven on earth with me.`,
  (w) => `Ending 2026 and starting 2027 in God's presence. I'll be at Heaven on Earth Camp${w}. Who's coming with me? 🙌`,
  (w) => `Heaven on Earth Camp 2026: Impacting Worlds, Transforming Generations. I'm joining${w}! Don't miss it. ✨`,
  (w) => `5 days of prayer, worship and the Word to cross over into 2027. I'm repping Heaven on Earth Camp${w}. Join me! 🙏`,
  (w) => `Count me in for Heaven on Earth Camp 2026${w}! 30 Dec 2026 – 3 Jan 2027. Register and let's go together. 💛`,
];

const MODES = [
  { value: false, label: "In person", hint: "At the camp in Gbawe" },
  { value: true, label: "Online", hint: "Joining from wherever I am" },
];

export function FlyerMaker({ defaultName = "", registerUrl }: { defaultName?: string; registerUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [assets, setAssets] = useState<FlyerAssets>({ logo: null, title: null, socials: null, display: display.style.fontFamily, body: body.style.fontFamily });
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [name, setName] = useState(defaultName);
  const [fmt, setFmt] = useState<FlyerFormat>("square");
  const [online, setOnline] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  // Save stays off until the logo, title, socials strip and fonts are in, so a
  // slow connection can't produce a flyer with the artwork missing.
  const [artwork, setArtwork] = useState<"loading" | "ready" | "failed">("loading");

  const state = { img, zoom, ox: offset.x, oy: offset.y, name, online };
  const ready = !!img && !!name.trim() && artwork === "ready";

  useEffect(() => {
    let live = true;
    // Each piece appears in the preview as soon as it arrives.
    const art = (key: "logo" | "title" | "socials", src: string) =>
      loadImg(src).then((im) => void (live && setAssets((a) => ({ ...a, [key]: im }))));
    // Fonts never hold Save back for long: after 8 s, go with what has loaded.
    const fonts = Promise.race([
      Promise.all([
        document.fonts.load(`800 40px ${display.style.fontFamily}`),
        document.fonts.load(`800 40px ${body.style.fontFamily}`),
      ]),
      new Promise((r) => setTimeout(r, 8000)),
    ]).catch(() => {});
    Promise.all([
      art("logo", "/images/hoe-2026-logo.png"),
      art("title", "/images/hoe-2026-title.webp"),
      art("socials", "/images/hoe-2026-socials.png"),
      fonts,
    ]).then(
      () => live && setArtwork("ready"),
      () => live && setArtwork("failed"),
    );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawFlyer(ctx, fmt, state, assets);
  });

  // Free object URLs when they're replaced or the page closes.
  useEffect(() => () => void (img && URL.revokeObjectURL(img.src)), [img]);
  useEffect(() => () => void (result && URL.revokeObjectURL(result)), [result]);

  const reset = () => setResult(null);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setImg(await loadImg(URL.createObjectURL(file)));
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setStatus("");
      reset();
    } catch {
      setStatus("That file couldn't be opened. Try a JPG or PNG photo.");
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const d0 = drag.current;
    const canvas = canvasRef.current;
    if (!d0 || !canvas) return;
    const scale = canvas.width / canvas.getBoundingClientRect().width;
    const d = 2 * FORMATS[fmt].photo.r;
    setOffset({
      x: clampOffset(state, "x", d0.ox + ((e.clientX - d0.x) * scale) / d),
      y: clampOffset(state, "y", d0.oy + ((e.clientY - d0.y) * scale) / d),
    });
  }

  async function save() {
    if (!ready) return;
    setBusy(true);
    setStatus("Making your flyer…");
    try {
      const { W, H } = FORMATS[fmt];
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      drawFlyer(c.getContext("2d")!, fmt, state, assets);
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
      if (!blob) throw new Error("toBlob returned null");
      const filename = `HOE2026-${slug(name)}-${fmt}.png`;
      const url = URL.createObjectURL(blob);
      const text = `${CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)](online ? " online" : "")}\n\nRegister: ${registerUrl}`;
      setResult(url);
      setCaption(text);
      setCopied(false);
      const file = new File([blob], filename, { type: "image/png" });
      // Phones: open the share sheet (WhatsApp, Instagram, Save Image). Computers: download.
      if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text });
          setStatus("Shared! Thanks for spreading the word.");
        } catch (err) {
          setStatus((err as Error)?.name === "AbortError" ? "Your flyer is ready below." : "Your flyer is ready below. Press and hold it to save.");
        }
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        setStatus("Downloaded. Now post it and tag @PHANET_OFFICIAL.");
      }
    } catch (err) {
      console.error(err);
      setStatus("Something went wrong making your flyer. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const hint =
    artwork === "failed"
      ? "The flyer artwork didn't load. Check your connection and reload the page."
      : !img && !name.trim()
        ? "Add your photo and name to save."
        : !img
          ? "Add your photo to save."
          : !name.trim()
            ? "Add your name to save."
            : artwork === "loading"
              ? "Loading the flyer artwork…"
              : "";

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
      <div className="flex flex-col items-center gap-3 lg:sticky lg:top-28">
        <canvas
          ref={canvasRef}
          width={FORMATS[fmt].W}
          height={FORMATS[fmt].H}
          aria-label="Flyer preview"
          className={cn(
            "block h-auto max-w-full rounded-lg border border-border bg-card shadow-xl",
            fmt === "story" ? "max-h-[75vh] w-auto" : "w-full",
            img && "cursor-grab touch-none active:cursor-grabbing",
          )}
          onPointerDown={(e) => {
            if (!img) return;
            drag.current = { x: e.clientX, y: e.clientY, ox: clampOffset(state, "x", offset.x), oy: clampOffset(state, "y", offset.y) };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        />
        <p className="text-center text-sm text-muted-foreground">
          {img ? "Drag the photo to move it. Use Zoom to make it bigger." : "Example preview. Your photo and name appear here as you add them."}
        </p>
      </div>

      <div className="space-y-5">
        <Step n={1} title="Your photo">
          <p className="text-sm text-muted-foreground">A clear head-and-shoulders photo works best.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="lg" className="h-12">
              <label className="cursor-pointer">
                <ImagePlus className="h-4 w-4" aria-hidden />
                {img ? "Change photo" : "Choose photo"}
                <input type="file" accept="image/*" className="sr-only" onChange={onPhoto} />
              </label>
            </Button>
            {img && (
              <Button variant="ghost" size="lg" className="h-12" onClick={() => (setImg(null), reset())}>
                <Trash2 className="h-4 w-4" aria-hidden />
                Remove
              </Button>
            )}
          </div>
          <label className="grid grid-cols-[auto_1fr] items-center gap-3 text-sm font-medium">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              disabled={!img}
              onChange={(e) => (setZoom(+e.target.value), reset())}
              className="w-full accent-primary"
            />
          </label>
        </Step>

        <Step n={2} title="Your name">
          <Input
            value={name}
            maxLength={28}
            autoComplete="name"
            placeholder="e.g. Abena Owusu"
            aria-label="Your name"
            className="text-base md:text-base"
            onChange={(e) => (setName(e.target.value), reset())}
          />
        </Step>

        <Step n={3} title="How you'll be there">
          <Choice
            label="How you'll be there"
            options={MODES}
            value={online}
            onChange={(v) => (setOnline(v), reset())}
          />
        </Step>

        <Step n={4} title="Size">
          <Choice label="Flyer size" options={SIZES} value={fmt} onChange={(v) => (setFmt(v), reset())} />
        </Step>

        <Button size="lg" className="h-14 w-full text-base" disabled={!ready || busy} onClick={save}>
          <Download className="h-5 w-5" aria-hidden />
          Save my flyer
        </Button>
        <p role="status" className="min-h-6 text-sm font-medium text-primary">
          {status || hint}
        </p>

        {result && (
          <figure className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
            <img src={result} alt="Your finished flyer" className="w-full rounded-lg border border-border" />
            <figcaption className="text-sm text-muted-foreground">
              Didn&apos;t save? On a phone, press and hold the image and choose <b>Save</b> or <b>Share</b>. On a computer,
              right-click it and choose <b>Save image as</b>.
            </figcaption>
          </figure>
        )}

        {result && caption && (
          <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-card-foreground">Your caption</h2>
            <p className="whitespace-pre-line break-words text-sm text-muted-foreground">{caption}</p>
            <Button
              variant="outline"
              size="lg"
              className="h-12 w-full"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(caption);
                  setCopied(true);
                } catch {
                  setStatus("Couldn't copy. Press and hold the caption to copy it.");
                }
              }}
            >
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? "Copied! Paste it with your flyer" : "Copy caption"}
            </Button>
          </section>
        )}

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Your photo stays on your device. Nothing is uploaded.
        </p>
      </div>
    </div>
  );
}

function Choice<T>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; hint: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-3">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-xl border-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            value === o.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
          )}
        >
          <span className="block font-semibold">{o.label}</span>
          <span className="block text-xs text-muted-foreground">{o.hint}</span>
        </button>
      ))}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-3 font-semibold text-card-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-sm text-primary-foreground">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
