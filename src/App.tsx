/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Upload, Download, Trash2, FileText, RefreshCw, AlertCircle, Eye, X } from 'lucide-react';

interface FileData {
  key: string;
  lastModified: string;
  size: number;
  etag: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  files?: FileData[];
  message?: string;
  error?: string;
}

const FileManager: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const API_BASE_URL = 'https://express-vercel-deployment-ruddy.vercel.app/api';

  // Fetch files from server
  const fetchFiles = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/files`);
      const data: ApiResponse<null> = await response.json();
      
      if (data.success && data.files) {
        setFiles(data.files);
      } else {
        setError(data.error || 'Failed to fetch files');
      }
    } catch (err) {
      setError('Network error while fetching files');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Upload file
  const handleUpload = async (): Promise<void> => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');
    setMessage('');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data: ApiResponse<any> = await response.json();

      if (data.success) {
        setMessage(`File "${selectedFile.name}" uploaded successfully!`);
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        // Refresh file list
        await fetchFiles();
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Network error during upload');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  // Download file
  const handleDownload = async (fileKey: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/download/${encodeURIComponent(fileKey)}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileKey;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setMessage(`File "${fileKey}" downloaded successfully!`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Download failed');
      }
    } catch (err) {
      setError('Network error during download');
      console.error('Download error:', err);
    }
  };

  // Preview file
  const handlePreview = (fileKey: string): void => {
    const url = `${API_BASE_URL}/download/${encodeURIComponent(fileKey)}`;
    setPreviewUrl(url);
    setPreviewFile(fileKey);
  };

  // Close preview
  const closePreview = (): void => {
    setPreviewFile(null);
    setPreviewUrl('');
  };

  // Delete file
  const handleDelete = async (fileKey: string): Promise<void> => {
    if (!window.confirm(`Are you sure you want to delete "${fileKey}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/delete/${encodeURIComponent(fileKey)}`, {
        method: 'DELETE',
      });

      const data: ApiResponse<null> = await response.json();

      if (data.success) {
        setMessage(`File "${fileKey}" deleted successfully!`);
        await fetchFiles();
      } else {
        setError(data.error || 'Delete failed');
      }
    } catch (err) {
      setError('Network error during delete');
      console.error('Delete error:', err);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  // Check if file is previewable
  const isPreviewable = (fileName: string): boolean => {
    const ext = fileName.toLowerCase().split('.').pop();
    const previewableExtensions = ['pdf', 'txt', 'html', 'htm', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'mp4', 'webm', 'ogg'];
    return previewableExtensions.includes(ext || '');
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  // Fetch files on component mount
  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">S3 File Manager</h1>
        <p className="text-gray-600">Upload, download, and manage files in your S3 bucket</p>
      </div>

      {/* Messages */}
      {message && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <div className="text-green-800">{message}</div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Upload Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Upload className="h-5 w-5 mr-2" />
          Upload File
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1">
            <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <input
              id="file-input"
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {uploading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </button>
        </div>

        {selectedFile && (
          <div className="mt-4 p-3 bg-white rounded border">
            <p className="text-sm text-gray-600">
              Selected: <span className="font-medium">{selectedFile.name}</span> 
              ({formatFileSize(selectedFile.size)})
            </p>
          </div>
        )}
      </div>

      {/* Files List */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Files ({files.length})
          </h2>
          <button
            onClick={fetchFiles}
            disabled={loading}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Loading files...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No files found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Size</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Modified</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {files.map((file) => (
                  <tr key={file.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {file.key}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(file.lastModified)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        {isPreviewable(file.key) && (
                          <button
                            onClick={() => handlePreview(file.key)}
                            className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(file.key)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(file.key)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                Preview: {previewFile}
              </h3>
              <button
                onClick={closePreview}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 p-4">
              <iframe
                src={previewUrl}
                className="w-full h-full border rounded"
                title={`Preview of ${previewFile}`}
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end space-x-2">
              <button
                onClick={() => handleDownload(previewFile)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </button>
              <button
                onClick={closePreview}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManager;