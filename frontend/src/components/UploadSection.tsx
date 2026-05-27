import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileVideo, FileImage, X, Play, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { processImage, processVideo, type FaceResult, type VideoResult } from "@/lib/api";

interface FileItem {
  id: string;
  file: File;
  name: string;
  type: "video" | "image";
  size: string;
  status: "queued" | "processing" | "done" | "error";
  result?: FaceResult | VideoResult;
  error?: string;
}

const UploadSection = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [label, setLabel] = useState<"real" | "fake">("real");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  };

  const addFiles = (rawFiles: File[]) => {
    const newFiles: FileItem[] = rawFiles
      .filter((f) => {
        const ext = f.name.split(".").pop()?.toLowerCase() || "";
        return (
          ["mp4", "avi", "mov", "mkv"].includes(ext) ||
          ["jpg", "jpeg", "png"].includes(ext)
        );
      })
      .map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        name: f.name,
        type: f.type.startsWith("video") ? "video" : "image",
        size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
        status: "queued",
      }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const processFiles = useCallback(async () => {
    if (files.length === 0 || isProcessing) return;
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.status === "done") continue;

      // Set current file to processing
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, status: "processing" } : f))
      );

      try {
        let result;
        if (file.type === "video") {
          const res = await processVideo(file.file, label);
          result = res.data;
        } else {
          const res = await processImage(file.file, label);
          result = res.data;
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "done", result } : f
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Processing failed";
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "error", error: message } : f
          )
        );
      }
    }

    setIsProcessing(false);
  }, [files, label, isProcessing]);

  return (
    <section id="upload" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-gradient-primary mb-4">
            Upload Media
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Drop your videos or images to begin face extraction and deepfake analysis.
          </p>
        </motion.div>

        {/* Label toggle */}
        <div className="flex justify-center gap-2 mb-8">
          {(["real", "fake"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLabel(l)}
              className={`px-6 py-2 rounded-lg font-display text-sm uppercase tracking-wider transition-all ${
                label === l
                  ? l === "real"
                    ? "bg-primary text-primary-foreground"
                    : "bg-destructive text-destructive-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Drop zone */}
        <motion.div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-all cursor-pointer ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
          }`}
          whileHover={{ scale: 1.01 }}
        >
          <input
            type="file"
            multiple
            accept="video/mp4,video/avi,video/quicktime,video/x-matroska,image/jpeg,image/png"
            onChange={handleFileInput}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="font-display text-foreground mb-1">
            Drag & Drop or <span className="text-primary">Browse</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Supports MP4, AVI, MOV, MKV, JPG, PNG
          </p>
        </motion.div>

        {/* File list */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-6 space-y-2"
            >
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
                >
                  {file.type === "video" ? (
                    <FileVideo className="w-5 h-5 text-accent shrink-0" />
                  ) : (
                    <FileImage className="w-5 h-5 text-primary shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.size}
                      {file.status === "done" && file.result && "face_detected" in file.result && (
                        <span className={file.result.face_detected ? " text-primary" : " text-warning"}>
                          {" · "}{file.result.face_detected ? "Face detected ✓" : "No face found"}
                        </span>
                      )}
                      {file.status === "done" && file.result && "faces_extracted" in file.result && (
                        <span className="text-primary">
                          {" · "}{file.result.faces_extracted} faces extracted
                        </span>
                      )}
                      {file.error && (
                        <span className="text-destructive">{" · "}{file.error}</span>
                      )}
                    </p>
                  </div>

                  {/* Face preview thumbnail */}
                  {file.status === "done" && file.result && "face_b64" in file.result && file.result.face_b64 && (
                    <img
                      src={`data:image/jpeg;base64,${file.result.face_b64}`}
                      alt="Extracted face"
                      className="w-10 h-10 rounded border border-border object-cover"
                    />
                  )}

                  <span
                    className={`text-xs font-display uppercase tracking-wider shrink-0 ${
                      file.status === "done"
                        ? "text-primary"
                        : file.status === "processing"
                        ? "text-accent"
                        : file.status === "error"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {file.status === "processing" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : file.status === "error" ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      file.status
                    )}
                  </span>

                  {file.status === "done" ? (
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  ) : (
                    <button onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}

              <button
                onClick={processFiles}
                disabled={isProcessing}
                className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-display text-sm font-semibold uppercase tracking-wider transition-all hover:shadow-[0_0_30px_hsl(160_80%_45%/0.3)] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Process {files.filter((f) => f.status !== "done").length} File
                    {files.filter((f) => f.status !== "done").length !== 1 ? "s" : ""} as{" "}
                    {label.toUpperCase()}
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default UploadSection;
