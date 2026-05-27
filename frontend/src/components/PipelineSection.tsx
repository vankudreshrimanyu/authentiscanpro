import { motion } from "framer-motion";
import { FileVideo, ScanFace, Crop, Download, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: FileVideo,
    title: "Frame Extraction",
    desc: "Extract ~1 frame/sec from video files using OpenCV. Supports MP4, AVI, MOV, MKV formats.",
    detail: "FPS-aware interval calculation",
  },
  {
    icon: ScanFace,
    title: "Face Detection",
    desc: "MTCNN neural network detects all faces. GPU-accelerated with CUDA for real-time performance.",
    detail: "Multi-face detection with bounding boxes",
  },
  {
    icon: Crop,
    title: "Face Cropping",
    desc: "Largest face selected and cropped to 224×224px. Center-crop fallback when no face detected.",
    detail: "Normalized output for model training",
  },
  {
    icon: Download,
    title: "Dataset Export",
    desc: "Organized output in real/fake class folders. Ready for deepfake classification training.",
    detail: "Automatic directory structure",
  },
];

const PipelineSection = () => {
  return (
    <section id="pipeline" className="py-24 px-6 bg-card/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-gradient-primary mb-4">
            Processing Pipeline
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            End-to-end face extraction workflow powered by MTCNN and PyTorch.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-16 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0" />

          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative"
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative z-10 w-14 h-14 rounded-xl bg-secondary border border-border flex items-center justify-center mb-4 glow-border">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="absolute right-0 top-5 w-4 h-4 text-muted-foreground hidden md:block translate-x-1/2 z-20" />
                )}
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-2">{step.desc}</p>
                <span className="text-xs text-primary/70 font-display">{step.detail}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PipelineSection;
