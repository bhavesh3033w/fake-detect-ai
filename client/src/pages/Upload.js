import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { API } from '../context/AuthContext';
import toast from 'react-hot-toast';

const STEPS = ['Uploading image', 'Scanning metadata', 'Pixel analysis', 'AI detection', 'Generating report'];

export default function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setPreview(URL.createObjectURL(accepted[0]));
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  // 🔥 Cloudinary upload
  const uploadToCloudinary = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "fakedetect_unsigned");

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dnrtk0vp3/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      return data.secure_url;
    } catch (err) {
      console.error("Cloudinary error:", err);
      return null;
    }
  };

  const analyze = async () => {
    if (!file) return toast.error("Select file first");

    setAnalyzing(true);
    setStep(0);
    setProgress(0);

    const stepInterval = setInterval(() => {
      setStep((s) => {
        if (s < STEPS.length - 1) return s + 1;
        clearInterval(stepInterval);
        return s;
      });
      setProgress((p) => Math.min(p + 20, 90));
    }, 900);

    try {
      // 🔥 Step 1: Upload to Cloudinary
      const imageUrl = await uploadToCloudinary(file);

      console.log("IMAGE URL:", imageUrl);

      // ❌ अगर upload fail
      if (!imageUrl) {
        toast.error("Cloudinary upload failed");
        setAnalyzing(false);
        return;
      }

      // 🔥 Step 2: Send to backend
      const { data } = await API.post('/reports/analyze', {
        imageUrl,
      });

      console.log("BACKEND RESPONSE:", data);

      clearInterval(stepInterval);
      setProgress(100);
      setStep(STEPS.length - 1);

      if (data.success) {
        setTimeout(() => {
          navigate(`/result/${data.report.id}`);
        }, 500);
      } else {
        toast.error(data.message || 'Analysis failed');
        setAnalyzing(false);
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.error("ERROR:", err);
      toast.error(err.response?.data?.message || "Something went wrong");
      setAnalyzing(false);
      setProgress(0);
      setStep(0);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Analyze Screenshot</h1>

      {!analyzing ? (
        <>
          <div {...getRootProps()} className="border-2 border-dashed p-10 text-center cursor-pointer">
            <input {...getInputProps()} />
            {preview ? (
              <img src={preview} alt="preview" className="max-h-60 mx-auto" />
            ) : (
              <p>Drag & drop image or click to upload</p>
            )}
          </div>

          {file && (
            <button
              onClick={analyze}
              className="mt-5 bg-blue-500 text-white px-6 py-3 rounded"
            >
              Run AI Detection
            </button>
          )}
        </>
      ) : (
        <div className="text-center mt-10">
          <p>{STEPS[step]}</p>
          <div className="w-full bg-gray-200 h-2 mt-4">
            <div className="bg-blue-500 h-2" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}