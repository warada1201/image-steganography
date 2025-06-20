import React from 'react';

interface FileInputProps {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
}

const FileInput: React.FC<FileInputProps> = ({ onChange, accept }) => (
  <div className="mb-6">
    <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">
      Upload Image (PNG or JPEG recommended)
    </label>
    <input
      id="file-upload"
      type="file"
      accept={accept || "image/png, image/jpeg"}
      onChange={onChange}
      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
  </div>
);
export default FileInput;
