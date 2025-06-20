import React, { useState, useEffect, useCallback } from 'react';
import { encodeTextInImage, decodeTextFromImage } from './services/steganographyService';
import FileInput from './components/FileInput';
import ImagePreview from './components/ImagePreview';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  // Encoding state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [originalImagePreviewUrl, setOriginalImagePreviewUrl] = useState<string | null>(null);
  const [text, setText] = useState<string>('');
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Decoding state
  const [decodeImageFile, setDecodeImageFile] = useState<File | null>(null);
  const [decodeImagePreviewUrl, setDecodeImagePreviewUrl] = useState<string | null>(null);
  const [decodedText, setDecodedText] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState<boolean>(false);
  const [decodingError, setDecodingError] = useState<string | null>(null);


  useEffect(() => {
    // Cleanup function to revoke object URLs
    return () => {
      if (originalImagePreviewUrl) {
        URL.revokeObjectURL(originalImagePreviewUrl);
      }
      if (processedImageUrl && processedImageUrl.startsWith('blob:')) { 
        URL.revokeObjectURL(processedImageUrl);
      }
      if (decodeImagePreviewUrl) {
        URL.revokeObjectURL(decodeImagePreviewUrl);
      }
    };
  }, [originalImagePreviewUrl, processedImageUrl, decodeImagePreviewUrl]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (originalImagePreviewUrl) {
      URL.revokeObjectURL(originalImagePreviewUrl);
    }
    setProcessedImageUrl(null);
    setError(null);

    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setOriginalImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setOriginalImagePreviewUrl(null);
    }
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    setError(null); 
  };

  const handleEncode = useCallback(async () => {
    if (!imageFile || !text) {
      setError('Please select an image and enter text to embed.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProcessedImageUrl(null);

    try {
      const dataUrl = await encodeTextInImage(imageFile, text);
      setProcessedImageUrl(dataUrl);
    } catch (err) {
      if (err instanceof Error) {
        setError(`Encoding failed: ${err.message}`);
      } else {
        setError('Encoding failed: An unknown error occurred.');
      }
      console.error("Encoding error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, text]);

  const handleDecodeImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (decodeImagePreviewUrl) {
      URL.revokeObjectURL(decodeImagePreviewUrl);
    }
    setDecodedText(null);
    setDecodingError(null);

    const file = event.target.files?.[0];
    if (file) {
      setDecodeImageFile(file);
      setDecodeImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setDecodeImageFile(null);
      setDecodeImagePreviewUrl(null);
    }
  };

  const handleDecode = useCallback(async () => {
    if (!decodeImageFile) {
      setDecodingError('Please select an image to decode.');
      return;
    }

    setIsDecoding(true);
    setDecodingError(null);
    setDecodedText(null);

    try {
      const message = await decodeTextFromImage(decodeImageFile);
      setDecodedText(message);
       if (message === '') {
        setDecodedText('No hidden message found in the image, or the message is empty.');
      } else {
        setDecodedText(message);
      }
    } catch (err) {
      if (err instanceof Error) {
        setDecodingError(`Decoding failed: ${err.message}`);
      } else {
        setDecodingError('Decoding failed: An unknown error occurred.');
      }
      console.error("Decoding error:", err);
    } finally {
      setIsDecoding(false);
    }
  }, [decodeImageFile]);


  return (
    <div className="container mx-auto p-4 sm:p-8 bg-white shadow-xl rounded-lg my-8 min-h-screen">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold text-blue-600">Image Steganography Tool</h1>
        <p className="text-gray-600 mt-2">Hide or reveal secret messages within images.</p>
      </header>

      {/* Encoding Section Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md" role="alert">
          <p className="font-bold">Encoding Error</p>
          <p>{error}</p>
        </div>
      )}
      
      {/* Encoding and Output Grid */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Input Section for Encoding */}
        <section aria-labelledby="encode-heading" className="bg-gray-50 p-6 rounded-lg shadow">
          <h2 id="encode-heading" className="text-2xl font-semibold text-gray-700 mb-6">1. Embed Message into Image</h2>
          <FileInput onChange={handleImageChange} accept="image/png, image/jpeg" />
          
          {originalImagePreviewUrl && (
            <ImagePreview src={originalImagePreviewUrl} alt="Original image for encoding" title="Original Image" />
          )}

          <div className="mt-6 mb-4">
            <label htmlFor="secret-text" className="block text-sm font-medium text-gray-700 mb-1">
              Secret Message
            </label>
            <textarea
              id="secret-text"
              value={text}
              onChange={handleTextChange}
              placeholder="Enter the text you want to hide..."
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150"
              aria-label="Secret message to embed"
            />
          </div>

          <button
            onClick={handleEncode}
            disabled={!imageFile || !text.trim() || isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            aria-live="polite"
          >
            {isLoading && <Spinner />}
            {isLoading ? 'Embedding Message...' : 'Embed Text into Image'}
          </button>
        </section>

        {/* Output Section for Encoding */}
        <section aria-labelledby="encoded-image-heading" className="bg-gray-50 p-6 rounded-lg shadow">
          <h2 id="encoded-image-heading" className="text-2xl font-semibold text-gray-700 mb-6">2. Get Your Steganographed Image</h2>
          {isLoading && !processedImageUrl && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Spinner />
              <p className="mt-2">Processing image, please wait...</p>
            </div>
          )}
          {processedImageUrl && (
            <div className="mt-0">
              <ImagePreview src={processedImageUrl} alt="Processed image with hidden text" title="Processed Image" />
              <a
                href={processedImageUrl}
                download="steganographed_image.png"
                className="mt-4 w-full block text-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md transition duration-150 ease-in-out"
              >
                Download Processed Image
              </a>
              <p className="text-xs text-gray-500 mt-2 text-center">The image is a PNG file with your message embedded.</p>
            </div>
          )}
          {!isLoading && !processedImageUrl && !error && (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Your processed image will appear here after embedding.</p>
            </div>
          )}
           {!isLoading && !processedImageUrl && error && ( // Show this if error during encoding and no image was produced
            <div className="flex items-center justify-center h-full text-red-500">
              <p>Could not generate steganographed image due to an error.</p>
            </div>
          )}
        </section>
      </div>

      {/* Divider */}
      <hr className="my-12 border-t-2 border-gray-200" />

      {/* Decoding Section Error */}
      {decodingError && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md" role="alert">
          <p className="font-bold">Decoding Error</p>
          <p>{decodingError}</p>
        </div>
      )}

      {/* Decoding Section */}
      <section aria-labelledby="decode-heading" className="bg-gray-50 p-6 rounded-lg shadow mb-12">
        <h2 id="decode-heading" className="text-2xl font-semibold text-gray-700 mb-6">3. Decode Message from Image</h2>
        <FileInput onChange={handleDecodeImageChange} accept="image/png" /> {/* Typically PNGs are used for LSB steganography */}
        
        {decodeImagePreviewUrl && (
          <ImagePreview src={decodeImagePreviewUrl} alt="Image to decode" title="Image for Decoding" />
        )}

        <button
          onClick={handleDecode}
          disabled={!decodeImageFile || isDecoding}
          className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          aria-live="polite"
        >
          {isDecoding && <Spinner />}
          {isDecoding ? 'Decoding Message...' : 'Decode Text from Image'}
        </button>

        {isDecoding && !decodedText && (
           <div className="flex flex-col items-center justify-center h-20 text-gray-500 mt-4">
             <Spinner />
             <p className="mt-2">Decoding message, please wait...</p>
           </div>
        )}

        {decodedText !== null && !isDecoding && (
          <div className="mt-6 p-4 bg-green-50 border border-green-300 rounded-md">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Decoded Message:</h3>
            {decodedText === 'No hidden message found in the image, or the message is empty.' ? (
                 <p className="text-gray-700 whitespace-pre-wrap">{decodedText}</p>
            ) : (
                 <pre className="text-gray-700 whitespace-pre-wrap text-sm bg-white p-3 rounded shadow-inner">{decodedText}</pre>
            )}
          </div>
        )}
         {!isDecoding && decodedText === null && !decodingError && (
            <div className="flex items-center justify-center h-20 text-gray-500 mt-4">
              <p>Your decoded message will appear here.</p>
            </div>
          )}
      </section>


      <footer className="text-center mt-12 py-4 border-t border-gray-300">
        <p className="text-sm text-gray-600">&copy; {new Date().getFullYear()} Steganography App. For demonstration purposes.</p>
      </footer>
    </div>
  );
};

export default App;
