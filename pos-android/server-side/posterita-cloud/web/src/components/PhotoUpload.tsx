"use client";

import { useState, useRef } from "react";
import { Camera, X, Loader2, ImagePlus } from "lucide-react";

interface PhotoUploadProps {
  onUpload: (url: string) => void;
  existingPhotos?: string[];
  onRemove?: (url: string) => void;
  maxPhotos?: number;
  folder?: string;
}

export default function PhotoUpload({ onUpload, existingPhotos = [], onRemove, maxPhotos = 5, folder = "posterita/deliveries" }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dp2u3pwiy";

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "posterita_unsigned");
      formData.append("folder", folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) {
        onUpload(data.secure_url);
      }
    } catch (e) {
      console.error("Photo upload failed:", e);
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const canAdd = existingPhotos.length < maxPhotos;

  return (
    <div className="space-y-3">
      {/* Photo grid */}
      {existingPhotos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {existingPhotos.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
              <img src={url} alt={`Proof ${i + 1}`} className="w-full h-full object-cover" />
              {onRemove && (
                <button onClick={() => onRemove(url)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {canAdd && (
        <div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 transition w-full justify-center disabled:opacity-50">
            {uploading ? (
              <><Loader2 size={16} className="animate-spin" /> Uploading...</>
            ) : (
              <><Camera size={16} /> Take Photo or Upload ({existingPhotos.length}/{maxPhotos})</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
