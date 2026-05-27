import { motion } from "framer-motion";
import { Video, Image, ScanFace, Cpu } from "lucide-react";

const stats = [
  { icon: Video, label: "Videos Processed", value: "1,247", color: "text-primary" },
  { icon: Image, label: "Images Analyzed", value: "48,392", color: "text-accent" },
  { icon: ScanFace, label: "Faces Extracted", value: "52,610", color: "text-primary" },
  { icon: Cpu, label: "GPU Accelerated", value: "CUDA", color: "text-accent" },
];

const StatsBar = () => {
  return (
    <section className="py-12 border-y border-border bg-card/50">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="text-center"
          >
            <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
            <div className="font-display text-2xl font-bold text-foreground">{stat.value}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default StatsBar;
