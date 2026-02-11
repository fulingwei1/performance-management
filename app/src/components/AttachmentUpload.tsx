import { useState, useEffect, useCallback } from 'react';
import { Upload, Trash2, FileText, Image, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { attachmentApi } from '@/services/okrApi';

interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

interface AttachmentUploadProps {
  relatedType: string;
  relatedId: string;
}

export function AttachmentUpload({ relatedType, relatedId }: AttachmentUploadProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchAttachments = useCallback(async () => {
    if (!relatedId) return;
    try {
      const res = await attachmentApi.getByRelated(relatedType, relatedId);
      if (res.success) setAttachments(res.data || []);
    } catch { /* ignore */ }
  }, [relatedType, relatedId]);

  useEffect(() => { fetchAttachments(); }, [fetchAttachments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await attachmentApi.upload(file, relatedType, relatedId);
      }
      await fetchAttachments();
    } catch { /* ignore */ }
    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    try {
      await attachmentApi.delete(id);
      setAttachments(prev => prev.filter(a => a.id !== id));
    } catch { /* ignore */ }
  };

  const getIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="cursor-pointer">
          <input type="file" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
          <Button variant="outline" size="sm" asChild disabled={uploading}>
            <span>
              <Upload className="w-4 h-4 mr-1" />
              {uploading ? '上传中...' : '上传附件'}
            </span>
          </Button>
        </label>
        <span className="text-xs text-gray-400">支持 10MB 以内的文件</span>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md text-sm">
              {getIcon(att.mimeType)}
              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-blue-600 hover:underline truncate"
              >
                {att.originalName}
              </a>
              <span className="text-gray-400 text-xs">{formatSize(att.size)}</span>
              <button onClick={() => handleDelete(att.id)} className="text-red-400 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
