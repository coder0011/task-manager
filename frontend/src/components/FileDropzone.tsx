import React, { useState, useRef } from 'react';
import { UploadCloud, File, FileText, Image as ImageIcon, Trash2, ExternalLink } from 'lucide-react';
import type { Attachment } from '../types';

interface FileDropzoneProps {
  existingAttachments?: Attachment[];
  onUpload: (files: File[]) => Promise<void>;
  onDeleteAttachment?: (id: number) => Promise<void>;
  disabled?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  existingAttachments = [],
  onUpload,
  onDeleteAttachment,
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || disabled) return;
    const filesArray = Array.from(fileList).slice(0, 5); // Max 5 files
    setIsUploading(true);
    try {
      await onUpload(filesArray);
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4 text-emerald-400" />;
    }
    if (mimeType.includes('pdf')) {
      return <FileText className="w-4 h-4 text-red-400" />;
    }
    return <File className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="space-y-3">
      {/* Existing Attachments List */}
      {existingAttachments.length > 0 && (
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-[#a1a1aa]">
            Attached Files ({existingAttachments.length})
          </label>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {existingAttachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-2 rounded-lg bg-[#18181c] border border-[#27272a] text-xs hover:border-zinc-700 transition"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="p-1.5 rounded bg-[#27272a]/60">
                    {getFileIcon(att.mimeType)}
                  </div>
                  <div className="truncate">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-white hover:text-blue-400 transition truncate flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-blue-500"
                    >
                      <span>{att.originalName}</span>
                      <ExternalLink className="w-3 h-3 text-[#94a3b8]" />
                    </a>
                    <span className="text-[10px] text-[#94a3b8]">
                      {formatFileSize(att.sizeBytes)} • Uploaded by {att.uploaderName || 'Team'}
                    </span>
                  </div>
                </div>

                {onDeleteAttachment && !disabled && (
                  <button
                    type="button"
                    onClick={() => onDeleteAttachment(att.id)}
                    aria-label={`Remove attachment ${att.originalName}`}
                    className="p-1.5 min-h-[32px] min-w-[32px] text-[#94a3b8] hover:text-red-400 hover:bg-[#27272a] transition rounded-lg flex items-center justify-center focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
                    title="Remove attachment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="Upload files: Drag and drop or press Enter to browse"
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
          isDragOver
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-[#27272a] bg-[#18181c]/50 hover:bg-[#18181c] hover:border-zinc-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          aria-hidden="true"
        />

        {isUploading ? (
          <div className="flex items-center gap-2 text-xs text-blue-400">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span>Uploading attachments...</span>
          </div>
        ) : (
          <>
            <div className="w-9 h-9 rounded-full bg-blue-600/10 text-blue-400 flex items-center justify-center">
              <UploadCloud className="w-4.5 h-4.5" />
            </div>
            <div className="text-xs">
              <span className="font-semibold text-white">Click to upload</span>
              <span className="text-[#cbd5e1]"> or drag and drop files here</span>
            </div>
            <p className="text-[10px] text-[#94a3b8]">
              PNG, JPG, PDF, DOCX, ZIP up to 10MB (max 5 files)
            </p>
          </>
        )}
      </div>
    </div>
  );
};
