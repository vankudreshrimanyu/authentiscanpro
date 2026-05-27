import { motion } from "framer-motion";
import { CheckCircle2, XCircle, BarChart3 } from "lucide-react";

const sampleResults = [
  { name: "interview_001_frame0030_face", label: "real", confidence: 97.2 },
  { name: "social_clip_frame0060_face", label: "fake", confidence: 94.8 },
  { name: "news_anchor_frame0015_face", label: "real", confidence: 99.1 },
  { name: "tiktok_vid_frame0045_face", label: "fake", confidence: 88.5 },
  { name: "webcam_rec_frame0090_face", label: "real", confidence: 96.3 },
  { name: "synthetic_gen_frame0120_face", label: "fake", confidence: 91.7 },
];

const ResultsSection = () => {
  return (
    <section className="py-24 px-6 bg-card/30">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-gradient-primary mb-4">
            Extraction Results
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Sample output from the face extraction pipeline with classification labels.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-xl border border-border overflow-hidden"
        >
          {/* Table header */}
          <div className="grid grid-cols-[1fr_100px_120px] gap-4 px-6 py-3 bg-secondary/50 border-b border-border">
            <span className="font-display text-xs uppercase tracking-wider text-muted-foreground">File Name</span>
            <span className="font-display text-xs uppercase tracking-wider text-muted-foreground text-center">Label</span>
            <span className="font-display text-xs uppercase tracking-wider text-muted-foreground text-right flex items-center justify-end gap-1">
              <BarChart3 className="w-3 h-3" /> Confidence
            </span>
          </div>

          {sampleResults.map((result, i) => (
            <motion.div
              key={result.name}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-[1fr_100px_120px] gap-4 px-6 py-3 border-b border-border last:border-0 bg-card hover:bg-secondary/20 transition-colors"
            >
              <span className="font-display text-sm truncate">{result.name}.jpg</span>
              <span className="flex items-center justify-center gap-1.5">
                {result.label === "real" ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive" />
                )}
                <span
                  className={`text-xs font-display uppercase tracking-wider ${
                    result.label === "real" ? "text-primary" : "text-destructive"
                  }`}
                >
                  {result.label}
                </span>
              </span>
              <div className="flex items-center justify-end gap-2">
                <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      result.label === "real" ? "bg-primary" : "bg-destructive"
                    }`}
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
                <span className="text-xs font-display text-muted-foreground w-12 text-right">
                  {result.confidence}%
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ResultsSection;
