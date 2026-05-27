import { motion } from "framer-motion";
import { Terminal, Copy, Check } from "lucide-react";
import { useState } from "react";

const codeSnippet = `# Initialize MTCNN face detector (GPU-accelerated)
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
mtcnn = MTCNN(keep_all=True, device=device)

# Extract largest face from frame
boxes, _ = mtcnn.detect(rgb_frame)
coords = _largest_face_rgb(rgb_frame, boxes)
x1, y1, x2, y2 = coords

# Crop and resize to 224x224
face = rgb_frame[y1:y2, x1:x2]
face_resized = cv2.resize(face, (224, 224))`;

const CodePreview = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-gradient-primary mb-4">
            Under the Hood
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Powered by PyTorch, MTCNN, and OpenCV for production-grade face extraction.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              <span className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                face_extraction.py
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Code */}
          <pre className="p-6 overflow-x-auto text-sm leading-relaxed font-display">
            {codeSnippet.split("\n").map((line, i) => (
              <div key={i} className="flex">
                <span className="select-none w-8 text-right mr-4 text-muted-foreground/40 text-xs leading-relaxed">
                  {i + 1}
                </span>
                <span className={line.startsWith("#") ? "text-muted-foreground" : "text-foreground"}>
                  {line}
                </span>
              </div>
            ))}
          </pre>
        </motion.div>
      </div>
    </section>
  );
};

export default CodePreview;
