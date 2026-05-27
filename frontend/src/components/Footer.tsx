import { Shield } from "lucide-react";

const Footer = () => (
  <footer className="py-12 px-6 border-t border-border">
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <span className="font-display text-sm font-semibold tracking-wider">AuthentiScan</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Powered by MTCNN · PyTorch · OpenCV · CUDA
      </p>
    </div>
  </footer>
);

export default Footer;
