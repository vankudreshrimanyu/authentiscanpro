export interface StatusResponse {
  status: string;
  message: string;
  model_classes: string[];
}

export interface PredictionResponse {
  prediction: string;
  confidence: number;
  probabilities: Record<string, number>;
  frames_analyzed?: number;
}

export async function getStatus(): Promise<StatusResponse> {
  const res = await fetch(
    "https://shrimanyu-authentiscanpro.hf.space/"
  );

  if (!res.ok) {
    throw new Error(`Status check failed: ${res.status}`);
  }

  return res.json();
}

export async function processImage(
  file: File
): Promise<PredictionResponse> {

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    "https://shrimanyu-authentiscanpro.hf.space/predict",
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Prediction failed");
  }

  return res.json();
}