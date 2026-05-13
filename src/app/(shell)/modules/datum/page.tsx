import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { MapPin, Layers, Navigation, ArrowUpRight } from "lucide-react";

export const metadata = { title: "DX" };

const FEATURES = [
  {
    icon: <MapPin     size={16} className="text-teal" />,
    title: "GPS Field Layout",
    desc:  "Place and align layout points directly on a live GPS map overlay — no survey crew required for routine setup.",
  },
  {
    icon: <Layers     size={16} className="text-teal" />,
    title: "Map Overlays",
    desc:  "Overlay project drawings and site plans onto real-world coordinates so crews can work directly from the map.",
  },
  {
    icon: <Navigation size={16} className="text-teal" />,
    title: "Crew Alignment",
    desc:  "Share layout reference points with crews in the field instantly — a lightweight alternative to full Trimble workflows.",
  },
];

export default function DatumPage() {
  return (
    <PageContainer>
      <div className="rounded-[var(--radius-card)] border border-teal/30 bg-gradient-to-br from-surface-raised to-surface-overlay p-8 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-teal" />
          <span className="text-xs font-bold uppercase tracking-widest text-teal">Module · Field Layout</span>
        </div>
        <h1 className="text-2xl font-bold text-content-primary">DX</h1>
        <p className="text-content-secondary mt-2 max-w-md leading-relaxed">
          GPS + map overlay for field layout. A fast, lightweight alternative to Trimble workflows — helps crews align work on site without a full survey setup.
        </p>
        <Link
          href="#"
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-lg bg-teal hover:opacity-90 text-content-inverse text-sm font-semibold transition-opacity"
        >
          Launch Datum <ArrowUpRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <Card key={f.title} variant="default">
            <div className="w-8 h-8 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center mb-3">
              {f.icon}
            </div>
            <p className="font-semibold text-content-primary text-sm">{f.title}</p>
            <p className="text-xs text-content-secondary mt-1.5 leading-relaxed">{f.desc}</p>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
