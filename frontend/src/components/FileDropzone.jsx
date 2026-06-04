import { FileUp } from "lucide-react";
import { useRef, useState } from "react";

function FileDropzone({ id, disabled, selectedFile, onFileSelect, helperText = "Drop your file here, or click to browse." }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) {
      return;
    }

    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div>
      <input
        id={id}
        ref={inputRef}
        type="file"
        className="hidden"
        disabled={disabled}
        onChange={(event) => onFileSelect(event.target.files?.[0] || null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
            setDragging(true);
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        disabled={disabled}
        className={`w-full rounded-xl border border-dashed px-4 py-8 text-left transition ${
          dragging ? "border-blue-400 bg-blue-500/10" : "border-slate-700 bg-slate-900/60"
        } ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:border-blue-400/80 hover:bg-slate-800/80"}`}
      >
        <div className="flex items-center gap-3 text-slate-300">
          <FileUp className="h-5 w-5 text-blue-300" />
          <span className="text-sm">{helperText}</span>
        </div>
        {selectedFile && <p className="mt-3 text-sm font-medium text-white">Selected: {selectedFile.name}</p>}
      </button>
    </div>
  );
}

export default FileDropzone;
