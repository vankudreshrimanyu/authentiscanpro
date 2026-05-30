import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { getStatus, processImage } from './lib/api';
import TeamSection from './components/TeamSection';
import './index.css';

export default function App() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);    // for images
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null); // for videos
  const [uploadResult, setUploadResult] = useState<any>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  // Cleanup object URLs on unmount or when file changes
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [previewUrl, videoPreviewUrl]);

  const fetchStatus = async () => {
    try {
      const data = await getStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Clean up old preview URLs
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);

    const url = URL.createObjectURL(selected);
    setFile(selected);
    setUploadResult(null);
    setError(null);

    if (selected.type.startsWith('image/')) {
      setFileType('image');
      setPreviewUrl(url);
      setVideoPreviewUrl(null);
    } else if (selected.type.startsWith('video/')) {
      setFileType('video');
      setVideoPreviewUrl(url);
      setPreviewUrl(null);
    } else {
      alert('⚠️ Only image or video files are supported.');
      setFile(null);
      setFileType(null);
      setPreviewUrl(null);
      setVideoPreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setPreviewUrl(null);
    setVideoPreviewUrl(null);
    setFile(null);
    setFileType(null);
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const response = await processImage(file); // works for both images & videos
      console.log('Backend response:', response);
      setUploadResult({
        type: fileType,
        label: response.prediction,
        confidence: response.confidence,
        framesAnalyzed: response.frames_analyzed, // optional (video only)
      });
      // Optionally clear the preview after analysis
      // handleRemoveFile(); // uncomment if you want to clear automatically
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Prediction failed');
      setUploadResult(null);
    } finally {
      setLoading(false);
    }
  };

  const isReal = uploadResult?.label?.toLowerCase() === 'real';

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="header-gradient text-6xl font-bold tracking-tighter">
              AuthentiScan
            </h1>
            <p className="text-muted-foreground text-xl mt-1">
              Face Authenticity Pipeline • Powered by Flask + EfficientNet
            </p>
          </div>
        </div>

        {/* Status Card */}
        {status && (
          <div className="glass rounded-3xl p-8 mb-12">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-4xl mb-2">🤖</div>
                <p className="text-xs tracking-widest text-muted-foreground">MODEL</p>
                <p className="text-3xl font-semibold mt-1 text-success">Loaded</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-2">📍</div>
                <p className="text-xs tracking-widest text-muted-foreground">CLASSES</p>
                <p className="text-3xl font-semibold mt-1">
                  {status.model_classes?.join(' / ') || 'real / fake'}
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-2">🌐</div>
                <p className="text-xs tracking-widest text-muted-foreground">BACKEND</p>
                <p className="text-3xl font-semibold mt-1 text-success">Flask Ready</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="glass rounded-3xl p-10 mb-12">
          <h2 className="text-3xl font-semibold mb-2">📂 Upload Image or Video</h2>
          <p className="text-muted-foreground mb-8">
            Deepfake detection for faces in images or video clips (sampled frames)
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Drop Zone */}
            <div className="lg:col-span-7">
              <label className="block cursor-pointer">
                <div className="upload-drop glass border-2 border-dashed rounded-3xl p-12 text-center">
                  <div className="mx-auto w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-5xl mb-6">
                    📤
                  </div>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <p className="text-xl font-medium">
                    Drop file here or <span className="text-accent">browse</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    JPG, PNG, WEBP, MP4, AVI, MOV • Max 200MB
                  </p>
                </div>
              </label>
            </div>

            {/* Preview Area */}
            <div className="lg:col-span-5">
              {previewUrl && fileType === 'image' && (
                <div className="glass rounded-3xl p-6 h-full flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <p className="font-medium text-sm">📸 Image Preview</p>
                    <button
                      onClick={handleRemoveFile}
                      className="text-xs px-4 py-2 bg-card hover:bg-destructive/10 text-destructive rounded-2xl flex items-center gap-1 transition-colors"
                    >
                      ✕ Remove
                    </button>
                  </div>
                  <div className="flex-1 flex items-center justify-center bg-black/40 rounded-2xl overflow-hidden border border-border">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-[320px] max-w-full object-contain rounded-2xl"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 text-center truncate">
                    {file?.name}
                  </p>
                </div>
              )}

              {videoPreviewUrl && fileType === 'video' && (
                <div className="glass rounded-3xl p-6 h-full flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <p className="font-medium text-sm">🎬 Video Preview</p>
                    <button
                      onClick={handleRemoveFile}
                      className="text-xs px-4 py-2 bg-card hover:bg-destructive/10 text-destructive rounded-2xl flex items-center gap-1 transition-colors"
                    >
                      ✕ Remove
                    </button>
                  </div>
                  <div className="flex-1 flex items-center justify-center bg-black/40 rounded-2xl overflow-hidden border border-border">
                    <video
                      src={videoPreviewUrl}
                      controls
                      className="max-h-[320px] w-full rounded-2xl"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 text-center truncate">
                    {file?.name}
                  </p>
                </div>
              )}

              {!previewUrl && !videoPreviewUrl && (
                <div className="glass rounded-3xl p-6 h-full flex flex-col items-center justify-center text-center border border-dashed border-border">
                  <p className="text-muted-foreground">Your file preview will appear here</p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="shine mt-8 w-full py-7 text-2xl font-bold bg-primary text-primary-foreground rounded-3xl disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? <>⟳ Analyzing...</> : <>ANALYZE WITH AI →</>}
          </button>

          {/* Verdict */}
          {uploadResult && (
            <div
              className={`mt-10 rounded-3xl p-8 border-2 ${
                isReal ? 'verdict-real' : 'verdict-fake'
              } glass`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <span className="text-7xl">{isReal ? '✅' : '❌'}</span>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      MODEL VERDICT
                    </p>
                    <p
                      className={`text-6xl font-black ${
                        isReal ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {isReal ? 'REAL' : 'FAKE'}
                    </p>
                    {uploadResult.framesAnalyzed && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Analyzed {uploadResult.framesAnalyzed} frames
                      </p>
                    )}
                  </div>
                </div>
                {uploadResult.confidence !== null && (
                  <div className="text-right">
                    <p className="text-xs uppercase text-muted-foreground">CONFIDENCE</p>
                    <p className="text-5xl font-bold">
                      {(uploadResult.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <TeamSection />

        {/* Error Toast */}
        {error && (
          <div className="fixed bottom-8 right-8 glass border-destructive text-destructive px-8 py-5 rounded-3xl shadow-2xl z-50">
            ❌ {error}
          </div>
        )}
      </div>
      <Analytics />
    </div>
  );
}